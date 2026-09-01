const db = require('../database/db');
const path = require('path');
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { getDureeMoisEffectif } = require('../utils/formationTarifs');
const { cleanupProformaUploads, persistProformaJustificatif } = require('../utils/proformaUpload');
const { notifyEtabStaff } = require('../utils/notifyEtabStaff');

function buildEtabSnapshot(req, etab) {
  if (!etab) return null;
  return {
    nom: etab.nom,
    type: etab.type,
    adresse: etab.adresse || '',
    telephone: etab.telephone || '',
    email_contact: etab.email_contact || '',
    site_web: etab.site_web || '',
    logo_url: publicAssetUrl(req, etab.logo_url),
    cachet_url: publicAssetUrl(req, etab.cachet_url),
    couleur_primaire: etab.couleur_primaire || '#1e40af',
    couleur_secondaire: etab.couleur_secondaire || '#3b82f6',
    ninea: etab.ninea || '',
    compte_bancaire: etab.compte_bancaire || '',
  };
}

/**
 * Demande proforma sans compte (étudiant à distance).
 */
function createPublicDemandeProforma({ req, body, files }) {
  const filesIn = files || {};
  if (!filesIn.justificatif_identite?.[0] || !filesIn.justificatif_diplome?.[0]) {
    cleanupProformaUploads(filesIn);
    return {
      ok: false,
      status: 400,
      message:
        'Pièces obligatoires : carte d’identité / NIN / passeport (JPG ou PNG) et dernier diplôme (PDF, JPG ou PNG — max 2 Mo chacun).',
    };
  }

  const identiteFile = filesIn.justificatif_identite[0];
  const identiteExt = path.extname(identiteFile.originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(identiteExt)) {
    cleanupProformaUploads(filesIn);
    return {
      ok: false,
      status: 400,
      message: 'La pièce d’identité / NIN / passeport doit être au format JPG ou PNG.',
    };
  }

  const prenom = String(body.prenom || '').trim() || '—';
  const nom = String(body.nom || '').trim() || '—';
  const email = String(body.email || '').trim().toLowerCase();
  const telephone = String(body.telephone || '').trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 400, message: 'Adresse e-mail valide obligatoire (pour recevoir la facture proforma).' };
  }
  const { type_formation, formation_id, etablissement_id } = body;

  if (!type_formation || !formation_id) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 400, message: 'Formation et mode obligatoires.' };
  }
  if (etablissement_id == null || String(etablissement_id).trim() === '') {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 400, message: 'Veuillez sélectionner un établissement.' };
  }

  const fid = parseInt(String(formation_id), 10);
  const formation = db.get('formations').find({ id: fid }).value();
  if (!formation) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 404, message: 'Formation introuvable ou identifiant invalide.' };
  }
  if (formation.actif === false) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 404, message: 'Cette formation n’est plus proposée (désactivée).' };
  }
  if (formation.type !== type_formation) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 400, message: 'La formation choisie ne correspond pas au mode sélectionné.' };
  }

  const etabIdBody = parseInt(String(etablissement_id), 10);
  if (!Number.isFinite(etabIdBody) || etabIdBody !== Number(formation.etablissement_id)) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 400, message: 'La formation ne correspond pas à l’établissement choisi.' };
  }

  const etab = db.get('etablissements').find({ id: etabIdBody }).value();
  if (!etab || etab.actif === false) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 404, message: 'Établissement introuvable ou inactif.' };
  }

  const id = db.nextId('demandes_proforma');
  const reference = `DEM-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;

  let identiteRel;
  let diplomeRel;
  try {
    identiteRel = persistProformaJustificatif(filesIn.justificatif_identite[0], id, 'identite');
    diplomeRel = persistProformaJustificatif(filesIn.justificatif_diplome[0], id, 'diplome');
  } catch {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 500, message: 'Erreur lors de l’enregistrement des fichiers.' };
  }

  const typePayeur = body.type_payeur === 'organisation' ? 'organisation' : 'etudiant';
  const payeurOrgNom = String(body.payeur_org_nom || body.destinataire || '').trim();

  if (typePayeur === 'organisation' && !payeurOrgNom) {
    cleanupProformaUploads(filesIn);
    return { ok: false, status: 400, message: 'Indiquez le destinataire (entreprise, État ou organisation).' };
  }

  const demande = {
    id,
    reference,
    etudiant_id: null,
    prenom,
    nom,
    email,
    telephone,
    niveau: body.niveau ? String(body.niveau).trim() : null,
    type_formation,
    formation_id: fid,
    etablissement_id: etabIdBody,
    formation_titre: formation.titre,
    formation_description: formation.description || null,
    formation_ville: formation.ville || null,
    formation_niveau_requis: formation.niveau_requis || null,
    formation_mensualite: formation.mensualite || null,
    formation_duree_mois: getDureeMoisEffectif(formation),
    details: body.details ? String(body.details).trim() : null,
    type_payeur: typePayeur,
    payeur:
      typePayeur === 'organisation'
        ? {
            org_nom: payeurOrgNom,
            ninea: String(body.payeur_org_ninea || '').trim(),
            contact: String(body.payeur_org_contact || '').trim(),
          }
        : null,
    etablissement_snapshot: buildEtabSnapshot(req, etab),
    justificatifs: {
      identite: identiteRel,
      diplome: diplomeRel,
    },
    source: 'public_distant',
    statut: 'en_attente',
    facture: null,
    facture_avec_cachet: null,
    created_at: new Date().toISOString(),
  };

  db.get('demandes_proforma').push(demande).write();

  notifyEtabStaff(etabIdBody, {
    type: 'demande_proforma',
    title: 'Nouvelle demande de facture (visiteur)',
    message: `${email} — ${formation.titre}. Réf. ${reference}`,
    link: '/responsable/demandes-proforma',
    meta: { demande_id: id, reference, etablissement_id: etabIdBody, source: 'public_distant' },
  });

  return {
    ok: true,
    status: 201,
    message:
      'Demande enregistrée. Le staff de l’établissement la traitera ; vous recevrez la facture proforma par e-mail après validation. Aucune préinscription n’est requise.',
    reference,
    id,
    demande,
  };
}

module.exports = { createPublicDemandeProforma, buildEtabSnapshot };
