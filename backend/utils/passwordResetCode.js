const crypto = require('crypto');
const db = require('../database/db');
const { sendMail, publicAppUrlForEmail, isSmtpConfigured } = require('./mail');
const { wrapTransactionalHtml, ctaButton, brandFooterText, escapeHtml } = require('./emailTemplates');

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
  const base = publicAppUrlForEmail();
  const formUrl = `${base}/mot-de-passe-oublie-email`;
  const linkUrl = token
    ? `${base}/reinitialiser-mot-de-passe-email?token=${encodeURIComponent(token)}`
    : formUrl;
  const prenom = String(user.prenom || '').trim();
  const subject = 'Réinitialisation de votre mot de passe UniPortail';

  const text =
    `Bonjour ${prenom || ''},\n\n` +
    `Une demande de réinitialisation de mot de passe a été faite pour votre compte UniPortail.\n\n` +
    `Ouvrez ce lien sécurisé (valable ${minutes} minutes) pour définir un nouveau mot de passe :\n` +
    `${linkUrl}\n\n` +
    `Ou saisissez ce code à usage unique sur ${formUrl} :\n` +
    `${code}\n\n` +
    `Aucun mot de passe n’est envoyé par e-mail.\n` +
    `Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.\n` +
    brandFooterText();

  const bodyHtml =
    `<p style="margin:0 0 12px;font-size:15px;color:#0f172a;line-height:1.55">` +
    `Une demande de réinitialisation de mot de passe a été faite pour votre compte <strong>UniPortail</strong>.</p>` +
    ctaButton(linkUrl, 'Définir mon nouveau mot de passe') +
    `<p style="font-size:13px;color:#64748b">Lien valable <strong>${minutes} minutes</strong> (usage unique).</p>` +
    `<p style="margin:16px 0 8px;font-size:14px;color:#334155">Ou code à usage unique :</p>` +
    `<p style="margin:0;font-size:26px;letter-spacing:0.28em;font-weight:700;color:#0f172a">${escapeHtml(code)}</p>` +
    `<p style="font-size:13px;color:#64748b;margin-top:12px">Saisir le code : ` +
    `<a href="${escapeHtml(formUrl)}" style="color:#1e40af">${escapeHtml(formUrl)}</a></p>` +
    `<p style="font-size:13px;color:#64748b;line-height:1.5">Aucun mot de passe n’est envoyé par e-mail. ` +
    `Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.</p>`;

  const html = wrapTransactionalHtml({
    title: subject,
    prenom,
    bodyHtml,
  });

  return sendMail({
    to: user.email,
    subject,
    text,
    html,
    category: 'reset',
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
