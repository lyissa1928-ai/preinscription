const crypto = require('crypto');
const db = require('../database/db');
const { sendMail, publicAppUrl, isSmtpConfigured } = require('./mail');

const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_DIGITS = 6;

function hashResetCode(email, code) {
  return crypto.createHash('sha256')
    .update(`${String(email).trim().toLowerCase()}:${String(code).trim()}`)
    .digest('hex');
}

function generateNumericCode() {
  const n = crypto.randomInt(0, 10 ** CODE_DIGITS);
  return String(n).padStart(CODE_DIGITS, '0');
}

function findUserByEmail(emailNorm) {
  return (db.get('utilisateurs').value() || []).find(
    (u) => String(u.email || '').trim().toLowerCase() === emailNorm,
  );
}

/**
 * Émet un code OTP + un token lien (aucun mot de passe en clair).
 */
function issuePasswordResetCode(user) {
  const email = String(user.email || '').trim().toLowerCase();
  const code = generateNumericCode();
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + CODE_TTL_MS;
  db.get('utilisateurs').find({ id: user.id }).assign({
    password_reset_code_hash: hashResetCode(email, code),
    password_reset_token: token,
    password_reset_expires: expires,
    updated_at: new Date().toISOString(),
  }).write();
  return { code, token, expires, email };
}

function consumeValidResetCode(emailNorm, codeRaw) {
  const user = findUserByEmail(emailNorm);
  if (!user || user.actif === false) {
    return { ok: false, code: 'INVALID', message: 'Code invalide ou expiré.' };
  }
  if (!user.password_reset_code_hash) {
    return { ok: false, code: 'INVALID', message: 'Code invalide ou déjà utilisé.' };
  }
  if (!user.password_reset_expires || Date.now() > user.password_reset_expires) {
    db.get('utilisateurs').find({ id: user.id }).assign({
      password_reset_code_hash: null,
      password_reset_expires: null,
      password_reset_token: null,
      updated_at: new Date().toISOString(),
    }).write();
    return { ok: false, code: 'EXPIRED', message: 'Ce code a expiré. Demandez un nouveau code.' };
  }
  const expected = hashResetCode(emailNorm, String(codeRaw || '').replace(/\s/g, ''));
  const stored = String(user.password_reset_code_hash);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(stored, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: 'INVALID', message: 'Code invalide. Vérifiez le code reçu par e-mail.' };
  }
  return { ok: true, user };
}

function invalidateResetCode(userId) {
  db.get('utilisateurs').find({ id: userId }).assign({
    password_reset_code_hash: null,
    password_reset_expires: null,
    password_reset_token: null,
    updated_at: new Date().toISOString(),
  }).write();
}

/**
 * E-mail de réinitialisation : lien token + code (jamais de MDP en clair).
 * @returns {Promise<boolean>}
 */
async function sendResetCodeEmail(user, code, token) {
  if (!isSmtpConfigured()) {
    console.warn('[mail] reset: SMTP non configuré — e-mail non envoyé');
    return false;
  }
  const minutes = Math.round(CODE_TTL_MS / 60000);
  const base = publicAppUrl();
  const formUrl = `${base}/mot-de-passe-oublie-email`;
  const linkUrl = token
    ? `${base}/reinitialiser-mot-de-passe-email?token=${encodeURIComponent(token)}`
    : formUrl;
  const prenom = String(user.prenom || '').replace(/</g, '');

  return sendMail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe — UniPortail',
    text:
      `Bonjour ${prenom},\n\n` +
      `Une demande de réinitialisation de mot de passe a été faite pour votre compte UniPortail.\n\n` +
      `Ouvrez ce lien sécurisé (valable ${minutes} minutes) pour définir un nouveau mot de passe :\n` +
      `${linkUrl}\n\n` +
      `Ou saisissez ce code à usage unique sur ${formUrl} :\n` +
      `${code}\n\n` +
      `Aucun mot de passe n’est envoyé par e-mail.\n` +
      `Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.`,
    html:
      `<p>Bonjour <strong>${prenom}</strong>,</p>` +
      `<p>Une demande de réinitialisation de mot de passe a été faite pour votre compte <strong>UniPortail</strong>.</p>` +
      `<p><a href="${linkUrl}" style="display:inline-block;padding:12px 20px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">` +
      `Définir mon nouveau mot de passe</a></p>` +
      `<p style="font-size:13px;color:#64748b">Lien valable <strong>${minutes} minutes</strong>.</p>` +
      `<p>Ou code à usage unique :</p>` +
      `<p style="font-size:28px;letter-spacing:0.35em;font-weight:700">${code}</p>` +
      `<p style="font-size:13px">Saisir le code : <a href="${formUrl}">${formUrl}</a></p>` +
      `<p style="font-size:12px;color:#64748b">Aucun mot de passe n’est envoyé par e-mail. ` +
      `Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.</p>`,
  });
}

module.exports = {
  CODE_TTL_MS,
  findUserByEmail,
  issuePasswordResetCode,
  consumeValidResetCode,
  invalidateResetCode,
  sendResetCodeEmail,
};
