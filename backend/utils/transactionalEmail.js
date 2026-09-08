const db = require('../database/db');
const { sendMail, publicAppUrlForEmail, isSmtpConfigured } = require('./mail');
const { wrapTransactionalHtml, ctaButton, brandFooterText, escapeHtml } = require('./emailTemplates');

function fmtDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}

function resolveUserEmail(userId) {
  if (userId == null) return null;
  const u = db.get('utilisateurs').find({ id: Number(userId) }).value();
  if (!u || u.actif === false) return null;
  const email = String(u.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { email, prenom: u.prenom || '', nom: u.nom || '', user: u };
}

function absoluteUrl(pathOrUrl) {
  const base = publicAppUrlForEmail();
  const p = String(pathOrUrl || '').trim();
  if (!p) return base;
  if (/^https?:\/\//i.test(p)) {
    if (/^http:\/\//i.test(p) && !/localhost|127\.0\.0\.1/i.test(p)) {
      return p.replace(/^http:\/\//i, 'https://');
    }
    return p;
  }
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

/**
 * E-mail métier unique : type d’action, statut, date, référence, lien.
 * @returns {Promise<boolean>}
 */
async function sendActionEmail({
  to,
  prenom,
  action,
  statut,
  date,
  reference,
  referenceLabel = 'Référence',
  link,
  extra,
}) {
  const email = String(to || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (!isSmtpConfigured()) {
    console.warn('[mail] SMTP non configuré — notification non envoyée.');
    return false;
  }

  const when = fmtDate(date);
  const url = absoluteUrl(link);
  const refLine = reference ? `${referenceLabel} : ${reference}` : null;
  const greetingName = prenom || '';

  const subject = statut
    ? `${action} — ${statut}${reference ? ` (${reference})` : ''}`
    : `${action}${reference ? ` — ${reference}` : ''}`;

  const textParts = [
    greetingName ? `Bonjour ${greetingName},` : 'Bonjour,',
    '',
    `Type d’action : ${action}`,
    statut ? `Statut : ${statut}` : null,
    `Date : ${when}`,
    refLine,
    extra ? String(extra) : null,
    '',
    `Consulter : ${url}`,
    brandFooterText(),
  ].filter((x) => x != null && x !== '');

  const bodyHtml =
    `<table style="border-collapse:collapse;font-size:14px;color:#0f172a;width:100%">` +
    `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Type d’action</td><td><strong>${escapeHtml(action)}</strong></td></tr>` +
    (statut ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Statut</td><td><strong>${escapeHtml(statut)}</strong></td></tr>` : '') +
    `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Date</td><td>${escapeHtml(when)}</td></tr>` +
    (reference
      ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${escapeHtml(referenceLabel)}</td><td><strong>${escapeHtml(String(reference))}</strong></td></tr>`
      : '') +
    `</table>` +
    (extra ? `<p style="font-size:14px;color:#334155;line-height:1.55">${escapeHtml(extra)}</p>` : '') +
    ctaButton(url, 'Ouvrir dans la plateforme');

  const html = wrapTransactionalHtml({
    title: subject,
    prenom: greetingName,
    bodyHtml,
  });

  return sendMail({
    to: email,
    subject,
    text: textParts.join('\n'),
    html,
    category: 'transactional',
  });
}

async function emailUserId(userId, payload) {
  const ident = resolveUserEmail(userId);
  if (!ident) return false;
  return sendActionEmail({ to: ident.email, prenom: ident.prenom, ...payload });
}

const STATUS_LABEL = {
  en_attente: 'en attente',
  en_cours: 'en cours d’examen',
  accepte: 'acceptée',
  refuse: 'refusée',
  acceptee: 'acceptée / validée',
  refusee: 'refusée / rejetée',
};

async function notifyDossierStatutChange(dossier, statut) {
  const label = STATUS_LABEL[statut] || statut;
  const extra =
    statut === 'accepte'
      ? 'Votre lettre de préinscription et votre facture proforma sont disponibles dans votre espace.'
      : statut === 'refuse'
        ? (dossier.commentaire_admin
          ? `Motif : ${dossier.commentaire_admin}`
          : 'Vous pouvez consulter le motif sur votre espace candidat.')
        : 'Connectez-vous pour voir le détail de votre dossier.';

  const link = statut === 'accepte' && dossier.id
    ? `/lettre/${dossier.id}`
    : '/dashboard';

  return emailUserId(dossier.etudiant_id, {
    action: 'Mise à jour de préinscription',
    statut: label,
    date: new Date().toISOString(),
    reference: dossier.numero_dossier || dossier.id,
    referenceLabel: 'N° dossier',
    link,
    extra,
  });
}

async function notifyFactureDossierGeneree(dossier, facture) {
  const numero = facture?.numero || dossier?.numero_dossier;
  return emailUserId(dossier.etudiant_id, {
    action: 'Facture proforma générée',
    statut: 'disponible',
    date: facture?.date_emission || new Date().toISOString(),
    reference: numero,
    referenceLabel: 'N° facture',
    link: dossier?.id ? `/facture/${dossier.id}` : '/dashboard',
    extra: 'Vous pouvez consulter et télécharger la facture depuis la plateforme.',
  });
}

async function notifyProformaDecision(demande, kind) {
  const email = String(demande.email || '').trim().toLowerCase();
  const ident = demande.etudiant_id ? resolveUserEmail(demande.etudiant_id) : null;
  const to = ident?.email || email;
  const prenom = ident?.prenom || demande.prenom || '';
  if (!to) return false;

  if (kind === 'refusee') {
    return sendActionEmail({
      to,
      prenom,
      action: 'Demande de facture proforma',
      statut: 'refusée',
      date: demande.refusee_le || new Date().toISOString(),
      reference: demande.reference,
      referenceLabel: 'Référence demande',
      link: '/dashboard',
      extra: demande.motif_refus ? `Motif : ${demande.motif_refus}` : 'Consultez le motif sur votre espace.',
    });
  }

  const factureNumero = demande.facture?.numero || demande.reference;
  const link = demande.reference
    ? `/facture-publique/${encodeURIComponent(demande.reference)}`
    : '/dashboard';
  return sendActionEmail({
    to,
    prenom,
    action: kind === 'generee' ? 'Facture proforma générée' : 'Facture proforma validée',
    statut: 'disponible',
    date: demande.acceptee_le || new Date().toISOString(),
    reference: factureNumero,
    referenceLabel: 'N° facture / référence',
    link,
    extra: 'Ouvrez le lien pour consulter et télécharger le document.',
  });
}

async function notifyDocumentAttention(userId, { title, reference, link, extra }) {
  return emailUserId(userId, {
    action: title || 'Action requise sur votre dossier',
    statut: 'à traiter',
    date: new Date().toISOString(),
    reference: reference || null,
    referenceLabel: 'Référence',
    link: link || '/dashboard',
    extra: extra || 'Une action de votre part est attendue sur la plateforme.',
  });
}

/**
 * E-mail « compte activé » — une seule fois par compte.
 * @returns {Promise<boolean>}
 */
async function sendAccountActivatedEmail(user) {
  if (!user?.id || !user.email) return false;
  if (user.account_activated_email_sent_at) return false;
  if (user.actif === false) return false;

  const isStudent = user.role === 'etudiant';
  if (isStudent && !user.email_verified_at) return false;
  if (!isStudent && user.must_change_password === true) return false;

  const prenom = String(user.prenom || '').trim();

  const sent = await sendActionEmail({
    to: user.email,
    prenom,
    action: 'Compte activé',
    statut: 'opérationnel',
    date: new Date().toISOString(),
    reference: user.matricule || user.email,
    referenceLabel: 'Identifiant',
    link: '/dashboard',
    extra: 'Votre compte UniPortail est maintenant actif. Vous pouvez vous connecter et accéder à vos services.',
  });

  if (sent) {
    db.get('utilisateurs').find({ id: user.id }).assign({
      account_activated_email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).write();
  }
  return sent;
}

async function notifyLettrePreinscriptionEmail(dossier) {
  if (!dossier?.etudiant_id) return false;
  return emailUserId(dossier.etudiant_id, {
    action: 'Lettre de préinscription',
    statut: 'disponible',
    date: new Date().toISOString(),
    reference: dossier.numero_dossier || dossier.id,
    referenceLabel: 'N° dossier',
    link: dossier.id ? `/lettre/${dossier.id}` : '/dashboard',
    extra: 'Votre lettre de préinscription est disponible. Consultez-la via le lien ci-dessous.',
  });
}

async function notifyAttestationEmail(dossier) {
  if (!dossier?.etudiant_id) return false;
  return emailUserId(dossier.etudiant_id, {
    action: 'Attestation de préinscription',
    statut: 'disponible',
    date: new Date().toISOString(),
    reference: dossier.numero_dossier || dossier.id,
    referenceLabel: 'N° dossier',
    link: dossier.id ? `/attestation/${dossier.id}` : '/dashboard',
    extra: 'Votre attestation est disponible sur la plateforme.',
  });
}

async function notifyFactureDossierLinkEmail(dossier, facture) {
  if (!dossier?.etudiant_id) return false;
  const numero = facture?.numero || dossier.numero_dossier;
  return emailUserId(dossier.etudiant_id, {
    action: 'Facture proforma',
    statut: 'disponible',
    date: facture?.date_emission || new Date().toISOString(),
    reference: numero,
    referenceLabel: 'N° facture',
    link: dossier.id ? `/facture/${dossier.id}` : '/dashboard',
    extra: 'Consultez et téléchargez votre facture proforma via le lien ci-dessous.',
  });
}

module.exports = {
  sendActionEmail,
  emailUserId,
  notifyDossierStatutChange,
  notifyFactureDossierGeneree,
  notifyProformaDecision,
  notifyDocumentAttention,
  sendAccountActivatedEmail,
  notifyLettrePreinscriptionEmail,
  notifyAttestationEmail,
  notifyFactureDossierLinkEmail,
  fmtDate,
};
