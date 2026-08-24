const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, comptableOrAdmin } = require('../middleware/auth');
const { isFactureSupprimee } = require('../utils/factureVisibility');
const {
  filterDossiersForUser,
  filterDemandesForUser,
  filterFormationsForUser,
  assertDossierForUser,
  assertDemandeForUser,
  requireStaffEtablissement,
} = require('../utils/staffScope');
const { parsePagination, paginateArray } = require('../utils/pagination');

router.use(authMiddleware, comptableOrAdmin);

// ─── GET /api/comptable/dashboard ────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  if (req.user.role !== 'admin' && !requireStaffEtablissement(req.user, res)) return;

  let demandes = filterDemandesForUser(req.user, db.get('demandes_proforma').value() || []);
  let dossiers = filterDossiersForUser(req.user, db.get('dossiers').value() || []);

  const demandesAvecFacture = demandes.filter((d) => d.facture);

  const montantTotal = demandesAvecFacture.reduce(
    (sum, d) => sum + (d.facture.montant_ttc || 0),
    0,
  );

  const parType = {
    en_ligne: {
      count: demandes.filter((d) => d.type_formation === 'en_ligne').length,
      montant: demandes
        .filter((d) => d.type_formation === 'en_ligne' && d.facture)
        .reduce((s, d) => s + d.facture.montant_ttc, 0),
    },
    presentiel: {
      count: demandes.filter((d) => d.type_formation === 'presentiel').length,
      montant: demandes
        .filter((d) => d.type_formation === 'presentiel' && d.facture)
        .reduce((s, d) => s + d.facture.montant_ttc, 0),
    },
  };

  const dossiersAcceptes = dossiers.filter((d) => d.statut === 'accepte');
  const formations = filterFormationsForUser(req.user, db.get('formations').value() || []);
  const montantInterne = dossiersAcceptes.reduce((sum, d) => {
    const f = formations.find((fo) => fo.id === d.formation_id);
    return sum + (f ? (f.prix || 0) : 0);
  }, 0);

  const recentes = [...demandesAvecFacture]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map((d) => ({
      reference: d.reference,
      nom: `${d.prenom} ${d.nom}`,
      type_formation: d.type_formation,
      montant: d.facture.montant_ttc,
      created_at: d.created_at,
    }));

  res.json({
    total_demandes_proforma: demandes.length,
    factures_generees: demandesAvecFacture.length,
    montant_total_proforma: montantTotal,
    montant_interne_acceptes: montantInterne,
    dossiers_acceptes: dossiersAcceptes.length,
    par_type: parType,
    recentes,
  });
});

// ─── GET /api/comptable/proformas ─────────────────────────────────────────────
router.get('/proformas', (req, res) => {
  if (req.user.role !== 'admin' && !requireStaffEtablissement(req.user, res)) return;

  const { type, statut, page = 1, limit = 15 } = req.query;
  const { page: pageNum, limit: limitNum } = parsePagination({ page, limit }, { page: 1, limit: 15 });

  let demandes = filterDemandesForUser(req.user, db.get('demandes_proforma').value() || []).filter(
    (d) => d.facture,
  );
  if (type) demandes = demandes.filter((d) => d.type_formation === type);
  if (statut) demandes = demandes.filter((d) => d.statut === statut);

  demandes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const { items, pagination } = paginateArray(demandes, pageNum, limitNum);
  res.json({ demandes: items, pagination });
});

// ─── GET /api/comptable/proformas/:reference ──────────────────────────────────
router.get('/proformas/:reference', (req, res) => {
  if (req.user.role !== 'admin' && !requireStaffEtablissement(req.user, res)) return;

  const demande = db.get('demandes_proforma').find({ reference: req.params.reference }).value();
  if (!demande) return res.status(404).json({ message: 'Proforma introuvable' });

  const check = assertDemandeForUser(req.user, demande);
  if (!check.ok) return res.status(check.status).json({ message: check.message });

  res.json(demande);
});

// ─── GET /api/comptable/tarifs ────────────────────────────────────────────────
router.get('/tarifs', (req, res) => {
  if (req.user.role !== 'admin' && !requireStaffEtablissement(req.user, res)) return;

  const formations = filterFormationsForUser(req.user, db.get('formations').value() || []).filter(
    (f) => f.actif === true,
  );
  res.json({
    en_ligne: formations
      .filter((f) => f.type === 'en_ligne')
      .map((f) => ({
        id: f.id,
        titre: f.titre,
        prix: f.prix,
        frais_inscription: f.frais_inscription,
        mensualite: f.mensualite,
        duree_mois: f.duree_mois,
        total_annuel: f.prix,
      })),
    presentiel: formations
      .filter((f) => f.type === 'presentiel')
      .map((f) => ({
        id: f.id,
        titre: f.titre,
        ville: f.ville,
        prix: f.prix,
        frais_inscription: f.frais_inscription,
        mensualite: f.mensualite,
        duree_mois: f.duree_mois,
        total_annuel: f.prix,
      })),
  });
});

// ─── GET /api/comptable/dossiers ──────────────────────────────────────────────
router.get('/dossiers', (req, res) => {
  if (req.user.role !== 'admin' && !requireStaffEtablissement(req.user, res)) return;

  const { page = 1, limit = 15, statut } = req.query;
  const { page: pageNum, limit: limitNum } = parsePagination({ page, limit }, { page: 1, limit: 15 });

  const utilisateurs = db.get('utilisateurs').value() || [];
  const formations = db.get('formations').value() || [];
  const factures = db.get('factures').value() || [];

  let dossiers = filterDossiersForUser(req.user, db.get('dossiers').value() || []).map((d) => {
    const u = utilisateurs.find((us) => us.id === d.etudiant_id) || {};
    const f = formations.find((fo) => fo.id === d.formation_id) || {};
    const facture = factures.find((fac) => fac.dossier_id === d.id && !isFactureSupprimee(fac)) || null;
    return {
      id: d.id,
      numero_dossier: d.numero_dossier,
      statut: d.statut,
      validation_financiere: d.validation_financiere,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      formation_titre: f.titre,
      type_formation: d.type_formation,
      montant: f.prix || 0,
      facture_generee: !!facture,
      created_at: d.created_at,
    };
  });

  if (statut) dossiers = dossiers.filter((d) => d.statut === statut);
  dossiers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const { items, pagination } = paginateArray(dossiers, pageNum, limitNum);
  res.json({ dossiers: items, pagination });
});

// ─── PUT /api/comptable/dossiers/:id/validation-financiere ───────────────────
router.put('/dossiers/:id/validation-financiere', (req, res) => {
  const { validation_financiere, commentaire_financier } = req.body;
  if (!['recevable', 'non_recevable', 'en_attente'].includes(validation_financiere)) {
    return res.status(400).json({ message: 'Valeur de validation financière invalide.' });
  }

  const id = parseInt(req.params.id, 10);
  const dossier = db.get('dossiers').find({ id }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });

  const check = assertDossierForUser(req.user, dossier);
  if (!check.ok) return res.status(check.status).json({ message: check.message });

  db.get('dossiers')
    .find({ id })
    .assign({
      validation_financiere,
      commentaire_financier: commentaire_financier || null,
      valide_par_comptable: req.user.id,
      valide_financier_le: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .write();

  res.json({ message: `Validation financière : ${validation_financiere}` });
});

module.exports = router;
