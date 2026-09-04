/**
 * Alerte de connexion réussie (notification in-app + e-mail best-effort).
 */
const { createUserNotification } = require('./notificationService');
const { sendMail, isSmtpConfigured } = require('./mail');
const { getClientIp } = require('./rateLimit');

function summarizeUserAgent(ua) {
  const s = String(ua || '').trim();
  if (!s) return null;
  if (s.length <= 120) return s;
  return `${s.slice(0, 117)}…`;
}

/**
 * @param {object} user
 * @param {import('express').Request} req
 */
async function notifySuccessfulLogin(user, req) {
  if (!user?.id) return;
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ip = getClientIp(req) || null;
  const device = summarizeUserAgent(req?.headers?.['user-agent']);

  const lines = [
    `Date : ${dateStr}`,
    `Heure : ${timeStr}`,
  ];
  if (ip) lines.push(`Adresse IP : ${ip}`);
  if (device) lines.push(`Appareil / navigateur : ${device}`);

  const message = `Nouvelle connexion à votre compte UniPortail.\n${lines.join('\n')}`;

  createUserNotification(user.id, {
    type: 'security_login',
    title: 'Alerte de connexion',
    message: lines.join(' · '),
    link: '/profil',
    meta: {
      at: now.toISOString(),
      ip,
      user_agent: device,
    },
  });

  if (!user.email || !isSmtpConfigured()) return;
  try {
    await sendMail({
      to: user.email,
      subject: 'Alerte de connexion — UniPortail',
      text: `Bonjour ${user.prenom || ''} ${user.nom || ''},\n\n${message}\n\nSi vous ne reconnaissez pas cette connexion, changez immédiatement votre mot de passe et contactez un administrateur.\n`,
      html: `<p>Bonjour <strong>${user.prenom || ''} ${user.nom || ''}</strong>,</p>
<p>Une connexion réussie a été détectée sur votre compte UniPortail.</p>
<ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
<p>Si vous ne reconnaissez pas cette connexion, changez immédiatement votre mot de passe.</p>`,
    });
  } catch {
    /* best-effort */
  }
}

module.exports = { notifySuccessfulLogin, summarizeUserAgent };
