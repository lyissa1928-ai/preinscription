const db = require('../database/db');
const { snapshotFromFormation, snapshotFromEtablissementId } = require('./etablissementSnapshot');
const { canIssueOfficialDocs } = require('./canIssueOfficialDocs');
const { resolveCandidatIdentite } = require('./candidatIdentite');
const { primaryPhotoDocumentFromList } = require('./preinscriptionDocumentRules');

/**
 * Données JSON pour l’attestation de préinscription (dossier accepté uniquement).
 * Réutilise la même logique de sources que la lettre (formation, snapshot établissement, photo).
 */
function buildAttestationPayloadForDossier(dossierId) {
  const id = parseInt(String(dossierId), 10);
  if (Number.isNaN(id)) return { error: { status: 400, message: 'Identifiant dossier invalide' } };

  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return { error: { status: 404, message: 'Dossier non trouvé' } };
  if (!canIssueOfficialDocs(dossier)) {
    return {
      error: {
        status: 403,
        message: 'L’attestation n’est pas encore disponible pour cette préinscription.',
      },
    };
  }

  const u = db.get('utilisateurs').find({ id: dossier.etudiant_id }).value() || {};
  const identite = resolveCandidatIdentite(dossier, u);
  const formation = dossier.formation_id
    ? db.get('formations').find({ id: dossier.formation_id }).value()
    : null;

  let filiere_libelle = dossier.filiere || null;
  if (formation?.filiere_id != null) {
    const fil = db.get('filieres').find({ id: formation.filiere_id }).value();
    if (fil?.nom) filiere_libelle = fil.nom;
  }

  const documents = db.get('documents').filter({ dossier_id: id }).value();
  const photoDoc = primaryPhotoDocumentFromList(documents);
  const etablissement =
    snapshotFromFormation(formation) || snapshotFromEtablissementId(dossier.etablissement_id || u.etablissement_id);

  const y = new Date().getFullYear();
  const reference_attestation = `ATT-${y}-${String(dossier.id).padStart(5, '0')}`;
  const verification_id = `${reference_attestation}-${String(dossier.id).padStart(4, '0')}`;

  const body = {
    type: 'attestation',
    dossier,
    etudiant: {
      nom: identite.nom,
      prenom: identite.prenom,
      email: identite.email,
    },
    candidat: {
      date_naissance: identite.date_naissance,
      lieu_naissance: identite.lieu_naissance,
      nationalite: identite.nationalite,
      pays_residence: identite.pays_residence,
      numero_dossier: dossier.numero_dossier,
      numero_passeport: identite.numero_passeport,
      sexe: identite.sexe,
    },
    formation,
    filiere_libelle,
    formation_libelle: formation?.titre || dossier.filiere || '—',
    niveau_libelle: formation?.niveau || dossier.niveau || dossier.formation_niveau_cible || '—',
    annee_academique: dossier.annee_academique || '—',
    etablissement,
    photo_url: photoDoc ? `/uploads/${photoDoc.chemin}` : null,
    date_generation: new Date().toISOString(),
    attestation_extensions: {
      reference_attestation,
      verification_id,
      texte_officiel_base:
        'Nous attestons que l’étudiant(e) concerné(e) est admis(e) en formation au titre de l’année académique indiquée ci-dessous, sous réserve du respect des formalités d’inscription définitive.',
    },
  };

  return { body };
}

/**
 * Attestation pour une demande de facture proforma acceptée (sans dossier de préinscription).
 */
function buildAttestationPayloadForDemandeProforma(demandeId) {
  const id = parseInt(String(demandeId), 10);
  if (Number.isNaN(id)) return { error: { status: 400, message: 'Identifiant de demande invalide' } };

  const demande = db.get('demandes_proforma').find({ id }).value();
  if (!demande) return { error: { status: 404, message: 'Demande introuvable' } };
  if (demande.statut !== 'acceptee') {
    return {
      error: {
        status: 403,
        message: 'L’attestation n’est disponible qu’après acceptation de votre demande par le service pédagogique.',
      },
    };
  }

  const uid = demande.etudiant_id != null ? Number(demande.etudiant_id) : null;
  const u = uid ? db.get('utilisateurs').find({ id: uid }).value() || {} : {};
  const formation = demande.formation_id
    ? db.get('formations').find({ id: demande.formation_id }).value()
    : null;

  let filiere_libelle = null;
  if (formation?.filiere_id != null) {
    const fil = db.get('filieres').find({ id: formation.filiere_id }).value();
    if (fil?.nom) filiere_libelle = fil.nom;
  }

  const etablissement =
    snapshotFromFormation(formation) || snapshotFromEtablissementId(demande.etablissement_id);

  const y = new Date().getFullYear();
  const reference_attestation = `ATT-DEM-${y}-${String(demande.id).padStart(5, '0')}`;
  const verification_id = `${reference_attestation}-${String(demande.id).padStart(4, '0')}`;

  const body = {
    type: 'demande_proforma',
    demande,
    etudiant: {
      nom: u.nom || demande.nom,
      prenom: u.prenom || demande.prenom,
      email: u.email || demande.email,
    },
    formation,
    filiere_libelle,
    formation_libelle: formation?.titre || demande.formation_titre || '—',
    niveau_libelle: formation?.niveau || demande.niveau || '—',
    annee_academique: `${y}-${y + 1}`,
    etablissement,
    photo_url: null,
    date_generation: new Date().toISOString(),
    attestation_extensions: {
      reference_attestation,
      verification_id,
      texte_officiel_base:
        'Nous attestons que la demande de préinscription ci-dessous a été acceptée sous réserve du règlement des frais conformément à la facture proforma.',
    },
  };

  return { body };
}

module.exports = { buildAttestationPayloadForDossier, buildAttestationPayloadForDemandeProforma };
