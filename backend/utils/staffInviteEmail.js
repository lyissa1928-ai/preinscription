/**
 * Invitation staff : lien d’activation / définition du mot de passe (pas de MDP en clair).
 */
const crypto = require('crypto');
const db = require('../database/db');
const { sendMail, publicAppUrl, isSmtpConfigured } = require('./mail');

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
  const { token } = issueStaffInviteToken(user.id);
  const base = publicAppUrl();
  const loginUrl = `${base}/connexion`;
  const activateUrl = `${base}/reinitialiser-mot-de-passe-email?token=${encodeURIComponent(token)}`;
  const days = Math.round(INVITE_TTL_MS / (24 * 60 * 60 * 1000));
  const prenom = String(user.prenom || '').replace(/</g, '');
  const matricule = String(user.matricule || '').replace(/</g, '');
  const email = String(user.email || '').replace(/</g, '');
  const role = String(user.role || '').replace(/</g, '');

  const text =
    `Bonjour ${prenom},\n\n` +
    `Un compte UniPortail a été créé pour vous.\n\n` +
    `Identifiant (e-mail) : ${email}\n` +
    (matricule ? `Matricule : ${matricule}\n` : '') +
    (role ? `Profil : ${role}\n` : '') +
    `\nPour activer votre compte et définir votre mot de passe, ouvrez ce lien (valable ${days} jours) :\n` +
    `${activateUrl}\n\n` +
    `Ensuite, connectez-vous ici : ${loginUrl}\n\n` +
    `Pour des raisons de sécurité, aucun mot de passe définitif n’est envoyé par e-mail.\n` +
    `Vous pourrez compléter votre profil (photo, coordonnées, etc.) depuis « Mon profil » après connexion.\n`;

  const html =
    `<p>Bonjour <strong>${prenom}</strong>,</p>` +
    `<p>Un compte <strong>UniPortail</strong> a été créé pour vous.</p>` +
    `<ul>` +
    `<li><strong>Identifiant (e-mail)</strong> : ${email}</li>` +
    (matricule ? `<li><strong>Matricule</strong> : ${matricule}</li>` : '') +
    (role ? `<li><strong>Profil</strong> : ${role}</li>` : '') +
    `</ul>` +
    `<p><a href="${activateUrl}" style="display:inline-block;padding:12px 20px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">` +
    `Activer mon compte et définir mon mot de passe</a></p>` +
    `<p style="font-size:13px;color:#64748b">Lien valable <strong>${days} jours</strong>. Connexion ensuite : ` +
    `<a href="${loginUrl}">${loginUrl}</a></p>` +
    `<p style="font-size:12px;color:#64748b">Aucun mot de passe définitif n’est envoyé par e-mail. ` +
    `Complétez votre profil librement depuis « Mon profil » après connexion.</p>`;

  if (!isSmtpConfigured()) {
    console.warn('[staff-invite] SMTP non configuré — e-mail non envoyé pour', email);
    return false;
  }
  return sendMail({
    to: user.email,
    subject: 'Activation de votre compte UniPortail',
    text,
    html,
  });
}

module.exports = {
  INVITE_TTL_MS,
  issueStaffInviteToken,
  sendStaffInviteEmail,
};
