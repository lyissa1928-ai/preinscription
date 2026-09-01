const { sendMail, publicAppUrl } = require('./mail');

/**
 * Envoie le lien de facture proforma au candidat (sans compte ou avec compte).
 * @returns {Promise<boolean>}
 */
async function sendProformaFactureEmail(demande) {
  const email = String(demande?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (!demande?.reference) return false;

  const base = publicAppUrl();
  const url = `${base}/facture-publique/${encodeURIComponent(demande.reference)}`;
  const prenom = String(demande.prenom || '').trim();
  const etabNom = demande.etablissement_snapshot?.nom || 'votre établissement';

  const subject = `Facture proforma — ${demande.reference}`;
  const text = [
    `Bonjour${prenom ? ` ${prenom}` : ''},`,
    '',
    `Votre demande de facture proforma (${demande.reference}) pour ${demande.formation_titre || 'la formation'} a été acceptée par ${etabNom}.`,
    '',
    `Consultez et téléchargez votre facture proforma :`,
    url,
    '',
    'Cordialement,',
    etabNom,
  ].join('\n');

  const html = `
    <p>Bonjour${prenom ? ` ${prenom}` : ''},</p>
    <p>Votre demande de facture proforma <strong>${demande.reference}</strong> pour
    <strong>${demande.formation_titre || 'la formation'}</strong> a été acceptée par <strong>${etabNom}</strong>.</p>
    <p><a href="${url}">Ouvrir et télécharger la facture proforma</a></p>
    <p style="color:#64748b;font-size:12px;">Si le lien ne fonctionne pas, copiez cette adresse : ${url}</p>
  `;

  return sendMail({ to: email, subject, text, html });
}

module.exports = { sendProformaFactureEmail };
