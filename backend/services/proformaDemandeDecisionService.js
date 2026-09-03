/**
 * Acceptation / refus d'une demande de facture proforma (logique partagée responsable + admin).
 */
const db = require('../database/db');
const { buildLignesForfaitAnnuel, getDureeMoisEffectif } = require('../utils/formationTarifs');
const { demandeProformaJustificatifsComplets } = require('../utils/proformaJustificatifsCheck');
const { createUserNotification } = require('../utils/notificationService');
const { notifyProformaDecision } = require('../utils/transactionalEmail');
const { dateEcheanceFacture } = require('../utils/factureValidite');

function buildFactureDemandeFromFormation(demande, formation, opts = {}) {
  const tarif = buildLignesForfaitAnnuel(formation);
  let montantHT = tarif.montant_ht;
  let lignes = tarif.lignes;

  const remise = Number(opts.remise);
  if (Number.isFinite(remise) && remise > 0) {
    const r = Math.min(remise, montantHT);
    if (r > 0) {
      lignes = [...lignes, { designation: 'Remise', montant: -r }];
      montantHT = Math.max(0, montantHT - r);
    }
  }

  const year = new Date().getFullYear();
  const numero =
    demande.facture?.numero && !String(demande.facture.numero).includes('undefined')
      ? demande.facture.numero
      : `FACT-PUB-${year}-${String(demande.id).padStart(5, '0')}`;
  const annee_academique = demande.annee_academique || `${year}-${year + 1}`;
  return {
    numero,
    annee_academique,
    lignes,
    lignes_frais_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
    montant_ht: montantHT,
    tva: 0,
    montant_ttc: montantHT,
    remise: Number.isFinite(remise) && remise > 0 ? Math.min(remise, tarif.montant_ht) : 0,
    validite_jusqu_au: dateEcheanceFacture(new Date().toISOString()),
  };
}

function parseAvecCachet(value) {
  if (value === false || value === 0) return false;
  if (value === true || value === 1) return true;
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'false' || s === '0' || s === 'non' || s === 'sans') return false;
  return true;
}

async function proformaDemandeDecision({ demandeId, userId, decision, motif_refus, avec_cachet = true }) {
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
    const msgPublic =
      'Acceptation impossible : pièce d’identité et dernier diplôme requis pour une demande sans compte.';
    const msgCompte =
      'Acceptation impossible : les trois justificatifs (diplôme, relevé de notes, document formation) doivent être présents.';
    return {
      ok: false,
      status: 400,
      message: demande.source === 'public_distant' ? msgPublic : msgCompte,
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
    await notifyProformaDecision(updated, 'refusee');
    return { ok: true, message: 'Demande refusée.', demande: updated };
  }

  const formation = db.get('formations').find({ id: demande.formation_id }).value();
  if (!formation) return { ok: false, status: 404, message: 'Formation introuvable.' };

  const facture = buildFactureDemandeFromFormation(demande, formation);
  const factureAvecCachet = parseAvecCachet(avec_cachet);

  db.get('demandes_proforma')
    .find({ id })
    .assign({
      statut: 'acceptee',
      facture,
      facture_avec_cachet: factureAvecCachet,
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
  const emailEnvoye = await notifyProformaDecision(updated, 'acceptee');

  const msgBase =
    demande.etudiant_id != null
      ? 'Demande acceptée. La facture proforma est disponible sur l’espace candidat'
      : 'Demande acceptée. La facture proforma est disponible via le lien public';
  const msgEmail = emailEnvoye
    ? ' et un e-mail a été envoyé au candidat.'
    : updated.email
      ? ' (e-mail non envoyé : vérifiez la configuration SMTP).'
      : '.';

  return {
    ok: true,
    message: `${msgBase}${msgEmail}`,
    demande: updated,
    email_envoye: emailEnvoye,
  };
}

/**
 * Création directe d'une facture proforma par le staff.
 * Mode principal : saisie libre (personne qui se présente) — pas de compte requis.
 * Mode facultatif : etudiant_id pour lier un compte existant.
 */
async function creerProformaPourEtudiant({
  staffUser,
  etudiantId,
  formationId,
  prenom: prenomIn,
  nom: nomIn,
  telephone: telIn,
  email: emailIn,
  remise,
  buildEtabSnapshot,
}) {
  const fid = parseInt(String(formationId), 10);
  if (!Number.isFinite(fid)) {
    return { ok: false, status: 400, message: 'Formation obligatoire.' };
  }

  const formation = db.get('formations').find({ id: fid }).value();
  if (!formation) return { ok: false, status: 404, message: 'Formation introuvable.' };
  if (formation.actif === false) {
    return { ok: false, status: 400, message: 'Cette formation n’est plus proposée (désactivée).' };
  }

  const etabId = Number(formation.etablissement_id);
  if (staffUser.role !== 'admin' && Number(staffUser.etablissement_id) !== etabId) {
    return { ok: false, status: 403, message: 'Cette formation n’appartient pas à votre établissement.' };
  }

  const etab = db.get('etablissements').find({ id: etabId }).value();
  if (!etab || etab.actif === false) {
    return { ok: false, status: 404, message: 'Établissement introuvable ou inactif.' };
  }

  let etudiant = null;
  const eid = etudiantId != null && etudiantId !== '' ? parseInt(String(etudiantId), 10) : null;
  if (Number.isFinite(eid)) {
    etudiant = db.get('utilisateurs').find({ id: eid }).value();
    if (!etudiant || etudiant.role !== 'etudiant') {
      return { ok: false, status: 404, message: 'Étudiant introuvable.' };
    }
    if (etudiant.actif === false) {
      return { ok: false, status: 400, message: 'Ce compte étudiant est désactivé.' };
    }
    if (etudiant.etablissement_id != null && Number(etudiant.etablissement_id) !== etabId) {
      return { ok: false, status: 400, message: 'Cet étudiant est rattaché à un autre établissement.' };
    }
  }

  const prenom = String(prenomIn != null ? prenomIn : etudiant?.prenom || '').trim();
  const nom = String(nomIn != null ? nomIn : etudiant?.nom || '').trim();
  const telephone = String(telIn != null ? telIn : etudiant?.telephone || '').trim();
  const email = String(emailIn != null ? emailIn : etudiant?.email || '')
    .trim()
    .toLowerCase();

  if (!prenom || !nom) {
    return { ok: false, status: 400, message: 'Nom et prénom obligatoires.' };
  }
  if (!telephone || telephone.replace(/\D/g, '').length < 8) {
    return { ok: false, status: 400, message: 'Téléphone obligatoire (8 chiffres minimum).' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, message: 'Email invalide.' };
  }

  const id = db.nextId('demandes_proforma');
  const reference = `DEM-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
  const now = new Date().toISOString();

  const demande = {
    id,
    reference,
    etudiant_id: etudiant ? etudiant.id : null,
    prenom,
    nom,
    email: email || '',
    telephone,
    niveau: null,
    type_formation: formation.type,
    formation_id: fid,
    etablissement_id: etabId,
    formation_titre: formation.titre,
    formation_description: formation.description || null,
    formation_ville: formation.ville || null,
    formation_niveau_requis: formation.niveau_requis || null,
    formation_mensualite: formation.mensualite || null,
    formation_duree_mois: getDureeMoisEffectif(formation),
    details: null,
    type_payeur: 'etudiant',
    payeur: null,
    etablissement_snapshot: typeof buildEtabSnapshot === 'function' ? buildEtabSnapshot(etab) : null,
    justificatifs: null,
    statut: 'en_attente',
    facture: null,
    source: 'staff',
    creee_par: staffUser.id,
    created_at: now,
  };

  const facture = buildFactureDemandeFromFormation(demande, formation, { remise });
  demande.statut = 'acceptee';
  demande.facture = facture;
  demande.acceptee_le = now;
  demande.acceptee_par = staffUser.id;

  db.get('demandes_proforma').push(demande).write();

  if (etudiant) {
    createUserNotification(etudiant.id, {
      type: 'demande_proforma',
      title: 'Facture proforma disponible',
      message: `Une facture proforma (${reference}) a été établie pour vous par l’établissement. Retrouvez-la sur votre espace.`,
      link: '/dashboard',
      meta: { demande_id: id, reference, statut: 'acceptee' },
    });
  }

  await notifyProformaDecision(demande, 'generee');

  return {
    ok: true,
    message: `Facture proforma ${facture.numero} créée pour ${prenom} ${nom}.`,
    demande,
  };
}

module.exports = { proformaDemandeDecision, buildFactureDemandeFromFormation, creerProformaPourEtudiant };
