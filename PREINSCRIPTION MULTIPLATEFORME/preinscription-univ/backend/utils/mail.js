const nodemailer = require('nodemailer');

function envFlag(name) {
  const v = String(process.env[name] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function isSmtpConfigured() {
  return Boolean(
    String(process.env.SMTP_HOST || '').trim() &&
      String(process.env.SMTP_FROM || '').trim(),
  );
}

function emailVerificationEnabled() {
  return isSmtpConfigured() && envFlag('EMAIL_VERIFICATION_ENABLED');
}

function passwordResetEmailEnabled() {
  return isSmtpConfigured() && envFlag('PASSWORD_RESET_EMAIL_ENABLED');
}

function publicAppUrl() {
  const u = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  return u || 'http://localhost:5173';
}

let transporterPromise;

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporterPromise) {
    const host = String(process.env.SMTP_HOST || '').trim();
    const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
    const secure = envFlag('SMTP_SECURE') || port === 465;
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '').trim();
    transporterPromise = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
  }
  return transporterPromise;
}

/**
 * @returns {Promise<boolean>} true si envoyé
 */
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] SMTP non configuré — e-mail non envoyé.');
    return false;
  }
  const from = String(process.env.SMTP_FROM || '').trim();
  try {
    await t.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
    });
    return true;
  } catch (e) {
    console.error('[mail] Envoi échoué:', e?.message || e);
    return false;
  }
}

module.exports = {
  sendMail,
  isSmtpConfigured,
  emailVerificationEnabled,
  passwordResetEmailEnabled,
  publicAppUrl,
};
