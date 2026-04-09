/**
 * Acceptation / refus d'une demande de facture proforma (logique partagée responsable + admin).
 */
const db = require('../database/db');
const { buildLignesForfaitAnnuel } = require('../utils/formationTarifs');
const { demandeProformaJustificatifsComplets } = require('../utils/proformaJustificatifsCheck');
const { createUserNotification } = require('../utils/notificationService');

function buildFactureDemandeFromFormation(demande, formation) {
  const tarif = buildLignesForfaitAnnuel(formation);
  const montantHT = tarif.montant_ht;
  const year = new Date().getFullYear();
  const numero =
    demande.facture?.numero && !String(demande.facture.numero).includes('undefined')
      ? demande.facture.numero
      : `FACT-PUB-${year}-${String(demande.id).padStart(5, '0')}`;
  return {
    numero,
    lignes: tarif.lignes,
    lignes_frais_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
    montant_ht: montantHT,
    tva: 0,
    montant_ttc: montantHT,
    validite_jusqu_au: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * @returns {{ ok: true, message: string, demande: object } | { ok: false, status: number, message: string }}
 */
function proformaDemandeDecision({ demandeId, userId, decision, motif_refus }) {
  const id = parseInt(String(demandeId), 10);
  if (!Number.isFinite(id)) {
    return { ok: false, status: 400, message: 'Identifiant de demande invalide.' };
  }
  if (!['accepter', 'refuser'].includes(decision)) {
    return { ok: false, status: 400, message: 'Décision invalide (accepter ou refuser).' };
  }

  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return { ok: false, status: 404, message: 'Demande introuvable.' };

  if (demande.statut === 'acceptee' || demande.statut === 'refusee') {
    return { ok: false, status: 400, message: 'Une décision a déjà été enregistrée pour cette demande.' };
  }

  if (decision === 'accepter' && !demandeProformaJustificatifsComplets(demande)) {
    return {
      ok: false,
      status: 400,
      message:
        'Acceptation impossible : les trois justificatifs (diplôme, relevé de notes, document formation) doivent être présents sur la demande.',
    };
  }

  if (decision === 'refuser') {
    if (!motif_refus || !String(motif_refus).trim()) {
      return { ok: false, status: 400, message: 'Motif de refus obligatoire.' };
    }
    db.get('demandes_proforma')
      .find({ id })
      .assign({
        statut: 'refusee',
        motif_refus: String(motif_refus).trim(),
        refusee_le: new Date().toISOString(),
        refusee_par: userId,
        updated_at: new Date().toISOString(),
      })
      .write();

    if (demande.etudiant_id) {
      createUserNotification(demande.etudiant_id, {
        type: 'demande_proforma',
        title: 'Demande de facture proforma',
        message: `Votre demande ${demande.reference || ''} a été refusée. Consultez le motif sur votre espace.`,
        link: '/dashboard',
        meta: { demande_id: id, reference: demande.reference, statut: 'refusee' },
      });
    }

    const updated = db.get('demandes_proforma').find({ id }).value();
    return { ok: true, message: 'Demande refusée.', demande: updated };
  }

  const formation = db.get('formations').find({ id: demande.formation_id }).value();
  if (!formation) return { ok: false, status: 404, message: 'Formation introuvable.' };

  const facture = buildFactureDemandeFromFormation(demande, formation);

  db.get('demandes_proforma')
    .find({ id })
    .assign({
      statut: 'acceptee',
      facture,
      lettre_preinscription: null,
      acceptee_le: new Date().toISOString(),
      acceptee_par: userId,
      updated_at: new Date().toISOString(),
      motif_refus: null,
    })
    .write();

  if (demande.etudiant_id) {
    createUserNotification(demande.etudiant_id, {
      type: 'demande_proforma',
      title: 'Demande de facture proforma acceptée',
      message: `Votre demande ${demande.reference || ''} a été acceptée. Vous pouvez télécharger la facture proforma et l’attestation de préinscription depuis votre espace.`,
      link: '/dashboard',
      meta: { demande_id: id, reference: demande.reference, statut: 'acceptee' },
    });
  }

  const updated = db.get('demandes_proforma').find({ id }).value();
  return {
    ok: true,
    message:
      'Demande acceptée. La facture proforma et l’attestation de préinscription sont disponibles pour le candidat sur son espace (même compte).',
    demande: updated,
  };
}

module.exports = { proformaDemandeDecision, buildFactureDemandeFromFormation };
