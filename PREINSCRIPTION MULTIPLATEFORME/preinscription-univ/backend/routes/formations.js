const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { evaluateSanteFiliereEligibility } = require('../utils/santeEligibility');

function enrichFormationPublic(f, opts = {}) {
  const { dernier_diplome } = opts;
  const etab = f.etablissement_id ? db.get('etablissements').find({ id: f.etablissement_id }).value() : null;
  const filiere = f.filiere_id ? db.get('filieres').find({ id: f.filiere_id }).value() : null;
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

// GET /api/formations - Liste publique
router.get('/', (req, res) => {
  const { type, etablissement_id, dernier_diplome } = req.query;
  let formations = db.get('formations').filter({ actif: true }).value();
  if (type) formations = formations.filter(f => f.type === type);
  if (etablissement_id) formations = formations.filter(f => String(f.etablissement_id) === String(etablissement_id));
  formations = formations.map((f) =>
    enrichFormationPublic(f, { dernier_diplome: dernier_diplome || undefined }),
  );
  res.json(formations);
});

// GET /api/formations/:id
router.get('/:id', (req, res) => {
  const formation = db.get('formations').find({ id: parseInt(req.params.id), actif: true }).value();
  if (!formation) return res.status(404).json({ message: 'Formation non trouvée' });
  const { dernier_diplome } = req.query;
  res.json(enrichFormationPublic(formation, { dernier_diplome: dernier_diplome || undefined }));
});

// POST /api/formations - Admin uniquement
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { titre, type, description, prix, frais_inscription, duree, ville, niveau_requis, places } = req.body;
  if (!titre || !type || !prix) return res.status(400).json({ message: 'Champs obligatoires manquants' });
  const id = db.get('formations').value().length + 1;
  const formation = { id, titre, type, description, prix: parseInt(prix), frais_inscription: parseInt(frais_inscription) || 0, duree, ville: ville || null, niveau_requis, places: parseInt(places) || 50, actif: true };
  db.get('formations').push(formation).write();
  res.status(201).json(formation);
});

module.exports = router;
