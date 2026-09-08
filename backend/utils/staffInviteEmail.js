/**
 * Invitation staff : lien d’activation / définition du mot de passe (pas de MDP en clair).
 */
const crypto = require('crypto');
const db = require('../database/db');
const { sendMail, publicAppUrlForEmail, isSmtpConfigured, maskEmail } = require('./mail');
const { wrapTransactionalHtml, ctaButton, brandFooterText, escapeHtml } = require('./emailTemplates');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function issueStaffInviteToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + INVITE_TTL_MS;
  db.get('utilisateurs').find({ id: userId }).assign({
    password_reset_token: token,
    password_reset_expires: expires,
    password_reset_code_hash: null,
    updated_at: new Date().toISOString(),
  }).write();
  return { token, expires };
}

/**
 * @param {object} user
 * @param {{ createdByName?: string }} [opts]
 */
async function sendStaffInviteEmail(user, opts = {}) {
  if (!user?.email) return false;
  if (!isSmtpConfigured()) {
    console.warn('[staff-invite] SMTP non configuré — e-mail non envoyé pour', maskEmail(user.email));
    return false;
  }

  const { token } = issueStaffInviteToken(user.id);
  const base = publicAppUrlForEmail();
  const loginUrl = `${base}/connexion`;
  const activateUrl = `${base}/reinitialiser-mot-de-passe-email?token=${encodeURIComponent(token)}`;
  const days = Math.round(INVITE_TTL_MS / (24 * 60 * 60 * 1000));
  const prenom = String(user.prenom || '').trim();
  const matricule = String(user.matricule || '').trim();
  const email = String(user.email || '').trim();
  const role = String(user.role || '').trim();

  const subject = 'Activez votre compte UniPortail';

  const text =
    `Bonjour ${prenom || ''},\n\n` +
    `Un compte UniPortail a été créé pour vous par ESEBAT Digital Services.\n\n` +
    `Identifiant (e-mail) : ${email}\n` +
    (matricule ? `Matricule : ${matricule}\n` : '') +
    (role ? `Profil : ${role}\n` : '') +
    `\nPour activer votre compte et définir votre mot de passe, ouvrez ce lien sécurisé (valable ${days} jours) :\n` +
    `${activateUrl}\n\n` +
    `Ensuite, connectez-vous ici : ${loginUrl}\n\n` +
    `Pour des raisons de sécurité, aucun mot de passe n’est envoyé par e-mail.\n` +
    `Vous pourrez compléter votre profil depuis « Mon profil » après connexion.\n` +
    brandFooterText();

  const bodyHtml =
    `<p style="margin:0 0 12px;font-size:15px;color:#0f172a;line-height:1.55">` +
    `Un compte <strong>UniPortail</strong> a été créé pour vous par ESEBAT Digital Services.</p>` +
    `<ul style="margin:0 0 16px;padding-left:18px;font-size:14px;color:#334155;line-height:1.6">` +
    `<li><strong>Identifiant</strong> : ${escapeHtml(email)}</li>` +
    (matricule ? `<li><strong>Matricule</strong> : ${escapeHtml(matricule)}</li>` : '') +
    (role ? `<li><strong>Profil</strong> : ${escapeHtml(role)}</li>` : '') +
    `</ul>` +
    ctaButton(activateUrl, 'Activer mon compte et définir mon mot de passe') +
    `<p style="font-size:13px;color:#64748b;line-height:1.5">Lien valable <strong>${days} jours</strong>. ` +
    `Connexion ensuite : <a href="${escapeHtml(loginUrl)}" style="color:#1e40af">${escapeHtml(loginUrl)}</a></p>` +
    `<p style="font-size:13px;color:#64748b;line-height:1.5">Aucun mot de passe n’est envoyé par e-mail.</p>`;

  const html = wrapTransactionalHtml({
    title: subject,
    prenom,
    bodyHtml,
  });

  const result = await sendMail({
    to: user.email,
    subject,
    text,
    html,
    category: 'activation',
  });
  return result.ok;
}

module.exports = {
  INVITE_TTL_MS,
  issueStaffInviteToken,
  sendStaffInviteEmail,
};
