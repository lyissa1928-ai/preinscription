const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { evaluateSanteFiliereEligibility } = require('../utils/santeEligibility');

/** Dossiers qui comptent pour l’occupation « indicative » des places catalogue. */
const STATUT_COMPTE_POUR_PLACES = new Set(['en_attente', 'en_cours', 'accepte']);

function buildCaches() {
  const etablissements = db.get('etablissements').value() || [];
  const filieres = db.get('filieres').value() || [];
  const etabById = new Map(etablissements.map((e) => [Number(e.id), e]));
  const filiereById = new Map(filieres.map((f) => [Number(f.id), f]));
  return { etabById, filiereById };
}

/** Nombre de candidatures actives par formation_id (un passage en base). */
function candidaturesActivesParFormation() {
  const dossiers = db.get('dossiers').value() || [];
  const map = new Map();
  for (const d of dossiers) {
    if (!d || d.formation_id == null) continue;
    if (!STATUT_COMPTE_POUR_PLACES.has(d.statut)) continue;
    const fid = Number(d.formation_id);
    if (!Number.isFinite(fid)) continue;
    map.set(fid, (map.get(fid) || 0) + 1);
  }
  return map;
}

function enrichFormationPublic(f, opts = {}, caches) {
  const { dernier_diplome } = opts;
  const etab =
    f.etablissement_id != null ? caches.etabById.get(Number(f.etablissement_id)) : null;
  const filiere = f.filiere_id != null ? caches.filiereById.get(Number(f.filiere_id)) : null;
  const out = {
    ...f,
    etablissement_nom: etab?.nom || null,
    filiere_nom: filiere?.nom || null,
  };
  if (filiere) {
    if (filiere.duree_cycle != null) out.filiere_duree_cycle = filiere.duree_cycle;
    if (filiere.condition_acces != null) out.filiere_condition_acces = filiere.condition_acces;
    if (filiere.eligibility != null) out.filiere_eligibility = filiere.eligibility;
    if (filiere.description != null && filiere.description !== '') {
      out.filiere_description = filiere.description;
    }
  }
  if (
    dernier_diplome &&
    filiere &&
    filiere.eligibility &&
    Number(f.etablissement_id) === 3
  ) {
    const ev = evaluateSanteFiliereEligibility(filiere, dernier_diplome);
    out.eligibilite = {
      eligible: ev.eligible,
      message: ev.message,
      candidat_levels: ev.candidat_levels,
    };
  }
  return out;
}

function attachPlacesIndicatif(out, formationId, candidaturesParFormation) {
  const occ = candidaturesParFormation.get(Number(formationId)) || 0;
  out.candidatures_actives = occ;
  const capRaw = out.places;
  if (capRaw != null && capRaw !== '') {
    const capN = parseInt(String(capRaw), 10);
    if (Number.isFinite(capN) && capN >= 0) {
      out.places_restantes = Math.max(0, capN - occ);
    }
  }
  return out;
}

function sortFormationsListe(arr) {
  return [...arr].sort((a, b) => {
    const cmpF = String(a.filiere_nom || '').localeCompare(String(b.filiere_nom || ''), 'fr', {
      sensitivity: 'base',
    });
    if (cmpF !== 0) return cmpF;
    return String(a.titre || '').localeCompare(String(b.titre || ''), 'fr', { sensitivity: 'base' });
  });
}

// GET /api/formations - Liste publique
router.get('/', (req, res) => {
  const { type, etablissement_id, dernier_diplome, niveau_requis } = req.query;
  const caches = buildCaches();
  const candidaturesParFormation = candidaturesActivesParFormation();

  let formations = (db.get('formations').value() || []).filter((f) => f.actif === true);
  if (type) formations = formations.filter((f) => f.type === type);
  if (etablissement_id) {
    formations = formations.filter((f) => String(f.etablissement_id) === String(etablissement_id));
  }
  if (niveau_requis != null && String(niveau_requis).trim() !== '') {
    const nr = String(niveau_requis).trim();
    formations = formations.filter((f) => String(f.niveau_requis || '').trim() === nr);
  }

  let list = formations.map((f) => {
    const out = enrichFormationPublic(f, { dernier_diplome: dernier_diplome || undefined }, caches);
    return attachPlacesIndicatif(out, f.id, candidaturesParFormation);
  });

  list = sortFormationsListe(list);
  res.json(list);
});

// GET /api/formations/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Identifiant de formation invalide.' });
  }
  const formation = db.get('formations').find({ id, actif: true }).value();
  if (!formation) return res.status(404).json({ message: 'Formation non trouvée' });
  const { dernier_diplome } = req.query;
  const caches = buildCaches();
  const candidaturesParFormation = candidaturesActivesParFormation();
  let out = enrichFormationPublic(formation, { dernier_diplome: dernier_diplome || undefined }, caches);
  out = attachPlacesIndicatif(out, formation.id, candidaturesParFormation);
  res.json(out);
});

// POST /api/formations - Admin uniquement
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { titre, type, description, prix, frais_inscription, duree, ville, niveau_requis, places } = req.body;
  if (!titre || !type || !prix) return res.status(400).json({ message: 'Champs obligatoires manquants' });
  const id = db.nextId('formations');
  const formation = {
    id,
    titre,
    type,
    description,
    prix: parseInt(prix, 10),
    frais_inscription: parseInt(frais_inscription, 10) || 0,
    duree,
    ville: ville || null,
    niveau_requis,
    places: parseInt(places, 10) || 50,
    actif: true,
  };
  db.get('formations').push(formation).write();
  res.status(201).json(formation);
});

module.exports = router;
