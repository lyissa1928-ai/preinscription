/**
 * Gabarits HTML + texte pour e-mails transactionnels (délivrabilité).
 */
const { publicAppUrlForEmail } = require('./mail');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandFooterHtml() {
  const base = publicAppUrlForEmail();
  return (
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px" />` +
    `<p style="font-size:12px;line-height:1.5;color:#64748b;margin:0">` +
    `Cet e-mail a été envoyé automatiquement par <strong>UniPortail</strong> (ESEBAT Digital Services).<br/>` +
    `Plateforme : <a href="${escapeHtml(base)}" style="color:#1e40af">${escapeHtml(base)}</a><br/>` +
    `Si vous n’êtes pas à l’origine de cette action, ignorez ce message.` +
    `</p>`
  );
}

function brandFooterText() {
  const base = publicAppUrlForEmail();
  return (
    `\n--\n` +
    `Cet e-mail a été envoyé automatiquement par UniPortail (ESEBAT Digital Services).\n` +
    `Plateforme : ${base}\n` +
    `Si vous n’êtes pas à l’origine de cette action, ignorez ce message.\n`
  );
}

/**
 * Document HTML minimal, charset UTF-8, multipart-friendly.
 */
function wrapTransactionalHtml({ title, prenom, bodyHtml }) {
  const greeting = prenom
    ? `<p style="margin:0 0 16px;font-size:15px;color:#0f172a">Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#0f172a">Bonjour,</p>`;
  return (
    `<!DOCTYPE html>` +
    `<html lang="fr"><head><meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<title>${escapeHtml(title || 'UniPortail')}</title></head>` +
    `<body style="margin:0;padding:0;background:#f1f5f9">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px 24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">` +
    `<tr><td>` +
    `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:700">UniPortail</p>` +
    greeting +
    bodyHtml +
    brandFooterHtml() +
    `</td></tr></table>` +
    `</td></tr></table>` +
    `</body></html>`
  );
}

function ctaButton(href, label) {
  return (
    `<p style="margin:24px 0">` +
    `<a href="${escapeHtml(href)}" ` +
    `style="display:inline-block;padding:12px 22px;background:#1e40af;color:#ffffff;` +
    `border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">` +
    `${escapeHtml(label)}</a></p>` +
    `<p style="font-size:12px;color:#64748b;word-break:break-all">` +
    `Si le bouton ne fonctionne pas, copiez ce lien :<br/>` +
    `<a href="${escapeHtml(href)}" style="color:#1e40af">${escapeHtml(href)}</a></p>`
  );
}

module.exports = {
  escapeHtml,
  wrapTransactionalHtml,
  ctaButton,
  brandFooterText,
  brandFooterHtml,
};
