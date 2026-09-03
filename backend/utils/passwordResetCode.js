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

function issuePasswordResetCode(user) {
  const email = String(user.email || '').trim().toLowerCase();
  const code = generateNumericCode();
  const expires = Date.now() + CODE_TTL_MS;
  db.get('utilisateurs').find({ id: user.id }).assign({
    password_reset_code_hash: hashResetCode(email, code),
    password_reset_expires: expires,
    password_reset_token: null,
    updated_at: new Date().toISOString(),
  }).write();
  return { code, expires, email };
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

async function sendResetCodeEmail(user, code) {
  if (!isSmtpConfigured()) return false;
  const minutes = Math.round(CODE_TTL_MS / 60000);
  const url = `${publicAppUrl()}/mot-de-passe-oublie-email`;
  return sendMail({
    to: user.email,
    subject: 'Code de réinitialisation de mot de passe — UniPortail',
    text:
      `Bonjour ${user.prenom || ''},\n\n` +
      `Votre code de réinitialisation est : ${code}\n\n` +
      `Il est valable ${minutes} minutes et ne peut être utilisé qu’une seule fois.\n` +
      `Saisissez-le sur : ${url}\n\n` +
      `Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.`,
    html:
      `<p>Bonjour ${String(user.prenom || '').replace(/</g, '')},</p>` +
      `<p>Votre code de réinitialisation est :</p>` +
      `<p style="font-size:28px;letter-spacing:0.35em;font-weight:700">${code}</p>` +
      `<p>Valable <strong>${minutes} minutes</strong>, usage unique.</p>` +
      `<p>Saisissez-le ici : <a href="${url}">${url}</a></p>` +
      `<p style="font-size:12px;color:#64748b">Si vous n’avez pas demandé ce code, ignorez ce message.</p>`,
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
