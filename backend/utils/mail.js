const nodemailer = require('nodemailer');

function envFlag(name) {
  const v = String(process.env[name] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** true sauf si explicitement désactivé (0/false/off/no). */
function envFlagDefaultOn(name) {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return true;
  return !(raw === '0' || raw === 'false' || raw === 'no' || raw === 'off');
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

/**
 * Mot de passe oublié / reset par e-mail.
 * Activé dès que SMTP est configuré ; désactiver avec PASSWORD_RESET_EMAIL_ENABLED=0.
 */
function passwordResetEmailEnabled() {
  return isSmtpConfigured() && envFlagDefaultOn('PASSWORD_RESET_EMAIL_ENABLED');
}

function publicAppUrl() {
  const u = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  return u || 'http://localhost:5173';
}

function smtpMetaForLogs() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const secure = envFlag('SMTP_SECURE') || port === 465;
  const user = String(process.env.SMTP_USER || '').trim();
  return {
    host: host || null,
    port,
    secure,
    has_user: Boolean(user),
    from: String(process.env.SMTP_FROM || '').trim() || null,
  };
}

let transporter = null;

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    const host = String(process.env.SMTP_HOST || '').trim();
    const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
    const secure = envFlag('SMTP_SECURE') || port === 465;
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '').trim();
    const opts = {
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    };
    // STARTTLS sur 587
    if (!secure && port === 587) {
      opts.requireTLS = true;
    }
    transporter = nodemailer.createTransport(opts);
  }
  return transporter;
}

/** Réinitialise le transporteur (après changement d’env / test). */
function resetMailTransporter() {
  transporter = null;
}

/**
 * Vérifie la connexion SMTP (sans envoyer de message).
 * @returns {Promise<{ ok: boolean, error?: string, meta: object }>}
 */
async function verifySmtp() {
  const meta = smtpMetaForLogs();
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP_HOST ou SMTP_FROM manquant', meta };
  }
  const t = getTransporter();
  try {
    await t.verify();
    return { ok: true, meta };
  } catch (e) {
    const msg = e?.message || String(e);
    console.error('[mail] Vérification SMTP échouée:', msg, meta);
    return { ok: false, error: msg, meta };
  }
}

/**
 * @returns {Promise<boolean>} true si envoyé
 */
async function sendMail({ to, subject, text, html, attachments }) {
  const t = getTransporter();
  const meta = smtpMetaForLogs();
  if (!t) {
    console.warn('[mail] SMTP non configuré — e-mail non envoyé.', { to: to ? '(set)' : null, subject, meta });
    return false;
  }
  const from = String(process.env.SMTP_FROM || '').trim();
  try {
    const info = await t.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
      attachments: Array.isArray(attachments) ? attachments : undefined,
    });
    console.log('[mail] Envoyé OK', {
      messageId: info?.messageId || null,
      accepted: info?.accepted?.length || 0,
      rejected: info?.rejected?.length || 0,
      subject,
      meta: { host: meta.host, port: meta.port },
    });
    return true;
  } catch (e) {
    console.error('[mail] Envoi échoué:', e?.message || e, {
      subject,
      code: e?.code || null,
      responseCode: e?.responseCode || null,
      meta,
    });
    return false;
  }
}

module.exports = {
  sendMail,
  isSmtpConfigured,
  emailVerificationEnabled,
  passwordResetEmailEnabled,
  publicAppUrl,
  verifySmtp,
  resetMailTransporter,
  smtpMetaForLogs,
};
