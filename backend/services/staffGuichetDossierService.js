/**
 * Création d'une préinscription guichet (staff) — même modèle métier que le dossier étudiant.
 * Un seul dossier = facture + attestation + lettre. Pas de doublon candidat pour la même formation.
 */
const db = require('../database/db');
const { genererOuRecupererFactureDossier, normalizeTypeDocument } = require('./factureService');
const { buildLignesForfaitAnnuel, getDureeMoisEffectif } = require('../utils/formationTarifs');
const { normalizePreinscriptionNiveau } = require('../utils/preinscriptionDocumentRules');

function genererNumeroDossier() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `PREINSC-${year}-${rand}`;
}

function tarifFromFormation(formation) {
  if (!formation) return null;
  const tarif = buildLignesForfaitAnnuel(formation);
  return {
    frais_inscription: formation.frais_inscription ?? null,
    mensualite: formation.mensualite ?? null,
    duree_mois: getDureeMoisEffectif(formation),
    prix_annuel: tarif.montant_ht,
    lignes: tarif.lignes,
    lignes_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires: tarif.montant_supplementaires,
  };
}

function findExistingGuichetDossier({ telephone, email, formationId, etablissementId }) {
  const tel = String(telephone || '').replace(/\D/g, '');
  const mail = String(email || '').trim().toLowerCase();
  const list = db.get('dossiers').value() || [];
  return list.find((d) => {
    if (Number(d.formation_id) !== Number(formationId)) return false;
    if (d.source !== 'staff') return false;
    if (etablissementId != null && d.etablissement_id != null && Number(d.etablissement_id) !== Number(etablissementId)) {
      return false;
    }
    const dTel = String(d.telephone || '').replace(/\D/g, '');
    const dMail = String(d.email || '').trim().toLowerCase();
    if (tel && dTel && tel === dTel) return true;
    if (mail && dMail && mail === dMail) return true;
    return false;
  });
}

function creerDossierGuichet({ staffUser, body }) {
  const prenom = String(body.prenom || '').trim();
  const nom = String(body.nom || '').trim();
  const telephone = String(body.telephone || '').trim();
  const fid = parseInt(String(body.formation_id), 10);

  if (!prenom || !nom) {
    return { ok: false, status: 400, message: 'Nom et prénom obligatoires.' };
  }
  if (!telephone || telephone.replace(/\D/g, '').length < 8) {
    return { ok: false, status: 400, message: 'Téléphone obligatoire (8 chiffres minimum).' };
  }
  if (!Number.isFinite(fid)) {
    return { ok: false, status: 400, message: 'Formation obligatoire.' };
  }

  const typeDoc = normalizeTypeDocument(body.type_document || body.nature || 'proforma');
  const isProformaGuichet = typeDoc === 'proforma';

  if (!isProformaGuichet) {
    // Date / lieu de naissance : facultatifs même pour une préinscription guichet.
    const required = [
      'nationalite',
      'adresse',
      'dernier_diplome',
      'etablissement_origine',
      'annee_obtention',
      'annee_academique',
    ];
    for (const k of required) {
      if (!String(body[k] || '').trim()) {
        return { ok: false, status: 400, message: 'Tous les champs obligatoires de préinscription doivent être renseignés.' };
      }
    }
  }

  const typePayeur = body.type_payeur === 'organisation' ? 'organisation' : 'etudiant';
  const destinataireOrg = String(body.destinataire || body.payeur_org_nom || '').trim();
  if (isProformaGuichet && typePayeur === 'organisation' && !destinataireOrg) {
    return { ok: false, status: 400, message: 'Destinataire obligatoire (entreprise, État ou organisation).' };
  }

  const email = String(body.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, message: 'Email invalide.' };
  }

  const formation = db.get('formations').find({ id: fid }).value();
  if (!formation || formation.actif === false) {
    return { ok: false, status: 404, message: 'Formation introuvable ou désactivée.' };
  }

  const etabId = Number(formation.etablissement_id);
  if (staffUser.role !== 'admin' && Number(staffUser.etablissement_id) !== etabId) {
    return { ok: false, status: 403, message: 'Cette formation n’appartient pas à votre établissement.' };
  }

  const existing = findExistingGuichetDossier({
    telephone,
    email,
    formationId: fid,
    etablissementId: etabId,
  });
  const typeOpts = {
    type_document: body.type_document || body.nature || 'proforma',
  };

  if (existing) {
    const facture = genererOuRecupererFactureDossier(existing.id, typeOpts);
    return {
      ok: true,
      reused: true,
      message: `Préinscription déjà enregistrée (${existing.numero_dossier}). Les documents s’appuient sur ce dossier.`,
      dossier: existing,
      facture,
      tarif: tarifFromFormation(formation),
    };
  }

  const year = new Date().getFullYear();
  const defaultAnneeAcad = `${year}-${year + 1}`;

  // Lier un compte existant si email connu — sans créer de nouveau compte.
  let etudiantId = null;
  if (email) {
    const u = db.get('utilisateurs').find({ email }).value();
    if (u && u.role === 'etudiant' && u.actif !== false) {
      if (u.etablissement_id == null || Number(u.etablissement_id) === etabId) {
        etudiantId = u.id;
      }
    }
  }

  const now = new Date().toISOString();
  const id = db.nextId('dossiers');
  const numero = genererNumeroDossier();
  const passeport = String(body.numero_passeport || body.numero_piece || '').trim();
  const documentRuleProfile = normalizePreinscriptionNiveau(formation.niveau);

  const dossier = {
    id,
    etudiant_id: etudiantId,
    numero_dossier: numero,
    formation_id: fid,
    etablissement_id: etabId,
    type_formation: formation.type,
    filiere: formation.titre,
    niveau: formation.niveau_requis,
    formation_niveau_cible: formation.niveau != null ? String(formation.niveau) : null,
    document_rule_profile: documentRuleProfile,
    annee_academique: String(body.annee_academique || '').trim() || defaultAnneeAcad,
    prenom,
    nom,
    email: email || '',
    sexe: String(body.sexe || '').trim() || null,
    date_naissance: body.date_naissance ? String(body.date_naissance).trim() : null,
    lieu_naissance: body.lieu_naissance ? String(body.lieu_naissance).trim() : null,
    nationalite: body.nationalite ? String(body.nationalite).trim() : null,
    pays_residence: String(body.pays_residence || '').trim() || null,
    telephone,
    adresse: body.adresse ? String(body.adresse).trim() : null,
    type_piece: String(body.type_piece || '').trim() || null,
    numero_piece: String(body.numero_piece || '').trim() || (passeport || null),
    numero_passeport: passeport || null,
    dernier_diplome: body.dernier_diplome ? String(body.dernier_diplome).trim() : null,
    etablissement_origine: body.etablissement_origine ? String(body.etablissement_origine).trim() : null,
    mention: String(body.mention || '').trim() || null,
    annee_obtention: body.annee_obtention ? parseInt(String(body.annee_obtention), 10) || null : null,
    type_payeur: typePayeur,
    payeur: typePayeur === 'organisation' ? { org_nom: destinataireOrg } : null,
    statut: 'accepte',
    source: 'staff',
    creee_par: staffUser.id,
    commentaire_admin: isProformaGuichet
      ? 'Facture proforma guichet — saisie allégée.'
      : 'Préinscription guichet — documents générables immédiatement.',
    date_acceptation: now,
    lettre_generee: true,
    created_at: now,
    updated_at: now,
  };

  db.get('dossiers').push(dossier).write();
  const facture = genererOuRecupererFactureDossier(id, typeOpts);

  return {
    ok: true,
    reused: false,
    message: `Préinscription ${numero} enregistrée. Vous pouvez générer les documents.`,
    dossier,
    facture,
    tarif: tarifFromFormation(formation),
  };
}

module.exports = { creerDossierGuichet, tarifFromFormation, findExistingGuichetDossier };
