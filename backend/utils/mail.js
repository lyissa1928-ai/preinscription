/**
 * Envoi e-mail UniPortail — headers / From / Message-ID / logs sûrs.
 * Ne modifie pas host/port/auth SMTP : lit uniquement SMTP_* existants + options optionnelles.
 */
const crypto = require('crypto');
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

/** Force https:// en prod si PUBLIC_APP_URL est en http (liens e-mail). */
function publicAppUrlForEmail() {
  let u = publicAppUrl();
  if (/^http:\/\//i.test(u) && !/localhost|127\.0\.0\.1/i.test(u)) {
    u = u.replace(/^http:\/\//i, 'https://');
  }
  return u;
}

/**
 * Parse "Name <addr@domain>" ou "addr@domain".
 * @returns {{ name: string|null, address: string, domain: string|null }}
 */
function parseFromAddress(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$|^([^\s<>]+@[^\s<>]+)$/);
  let name = null;
  let address = '';
  if (m) {
    if (m[2]) {
      name = (m[1] || '').trim() || null;
      address = m[2].trim();
    } else {
      address = (m[3] || '').trim();
    }
  } else if (s.includes('@')) {
    address = s;
  }
  const domain = address.includes('@') ? address.split('@').pop().toLowerCase() : null;
  return { name, address, domain };
}

function maskEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  if (at < 1) return e ? '***' : null;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  const keep = Math.min(2, local.length);
  return `${local.slice(0, keep)}***@${domain}`;
}

function smtpMetaForLogs() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const secure = envFlag('SMTP_SECURE') || port === 465;
  const user = String(process.env.SMTP_USER || '').trim();
  const fromParsed = parseFromAddress(process.env.SMTP_FROM);
  return {
    host: host || null,
    port,
    secure,
    has_user: Boolean(user),
    from_domain: fromParsed.domain,
    from_address: fromParsed.address ? maskEmail(fromParsed.address) : null,
    reply_to_set: Boolean(String(process.env.SMTP_REPLY_TO || '').trim()),
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
    // STARTTLS sur 587 (config existante inchangée)
    if (!secure && port === 587) {
      opts.requireTLS = true;
    }
    transporter = nodemailer.createTransport(opts);
  }
  return transporter;
}

function resetMailTransporter() {
  transporter = null;
}

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
 * Construit From / Reply-To / Message-ID / envelope alignés sur le domaine From.
 * N’altère pas SMTP_HOST / USER / PASS.
 */
function buildMailIdentity(category = 'transactional') {
  const fromRaw = String(process.env.SMTP_FROM || '').trim();
  const parsed = parseFromAddress(fromRaw);
  const displayName = parsed.name || 'UniPortail';
  const address = parsed.address;
  const domain = parsed.domain || 'localhost';

  const from = parsed.name
    ? fromRaw
    : `"${displayName}" <${address}>`;

  // Reply-To : uniquement si configuré (évite une boîte inventée type support@ qui rebondit).
  const replyTo =
    String(process.env.SMTP_REPLY_TO || '').trim()
    || String(process.env.SMTP_SUPPORT_EMAIL || '').trim()
    || undefined;

  const msgDomain =
    String(process.env.SMTP_MESSAGE_DOMAIN || '').trim()
    || domain
    || 'localhost';

  const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}.${category}@${msgDomain}>`;

  return {
    from,
    replyTo: replyTo || undefined,
    messageId,
    envelope: address ? { from: address } : undefined,
    domain,
    address,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {Array} [opts.attachments]
 * @param {string} [opts.category] activation | reset | transactional | test
 * @returns {Promise<boolean>}
 */
async function sendMail({ to, subject, text, html, attachments, category = 'transactional' }) {
  const t = getTransporter();
  const meta = smtpMetaForLogs();
  if (!t) {
    console.warn('[mail] SMTP non configuré — e-mail non envoyé.', {
      to: maskEmail(to),
      subject,
      category,
      meta,
    });
    return false;
  }

  const identity = buildMailIdentity(category);
  const plain = text || (html ? String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
  const htmlBody = html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${String(plain)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</pre>`;

  const headers = {
    'X-Mailer': 'UniPortail',
    'X-Entity-Ref-ID': crypto.randomBytes(8).toString('hex'),
    'X-UniPortail-Category': String(category),
  };
  // Auth / transactionnel : pas de List-Unsubscribe marketing (pénalise Gmail).
  if (category !== 'activation' && category !== 'reset') {
    headers.Precedence = 'bulk';
    if (identity.replyTo) {
      headers['List-Unsubscribe'] = `<mailto:${identity.replyTo}?subject=unsubscribe>`;
    }
  }

  try {
    const info = await t.sendMail({
      from: identity.from,
      to,
      replyTo: identity.replyTo,
      subject,
      text: plain,
      html: htmlBody,
      messageId: identity.messageId,
      envelope: identity.envelope,
      headers,
      attachments: Array.isArray(attachments) ? attachments : undefined,
    });
    console.log('[mail] Envoyé OK', {
      category,
      messageId: info?.messageId || identity.messageId,
      accepted: info?.accepted?.length || 0,
      rejected: info?.rejected?.length || 0,
      response: info?.response ? String(info.response).slice(0, 120) : null,
      to: maskEmail(to),
      subject,
      from_domain: identity.domain,
      reply_to: identity.replyTo ? maskEmail(identity.replyTo) : null,
      meta: { host: meta.host, port: meta.port },
    });
    return true;
  } catch (e) {
    console.error('[mail] Envoi échoué:', e?.message || e, {
      category,
      to: maskEmail(to),
      subject,
      code: e?.code || null,
      responseCode: e?.responseCode || null,
      command: e?.command || null,
      from_domain: identity.domain,
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
  publicAppUrlForEmail,
  verifySmtp,
  resetMailTransporter,
  smtpMetaForLogs,
  parseFromAddress,
  maskEmail,
  buildMailIdentity,
};
