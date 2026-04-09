const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const db = require('../database/db');
const { normalizeMatricule, normalizeTelephoneForUniqueness, telephoneTaken } = require('../utils/userIdentity');
const { generateNextMatriculeForEtablissement } = require('../utils/matriculeGenerator');
const { authMiddleware, adminOnly, adminOrDirecteur } = require('../middleware/auth');
const { buildFacturesExportHtml } = require('../utils/factureExportHtml');
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { logAudit } = require('../utils/auditLog');
const { verifyDiskFile, unlinkQuiet } = require('../utils/verifyUploadedFile');
const { optionalClamScanFile } = require('../utils/optionalClamScan');
const { computePrixAnnuel, normalizeFraisSupplementaires } = require('../utils/formationTarifs');
const { syncStoredFactureById } = require('../services/factureService');
const { isFactureSupprimee } = require('../utils/factureVisibility');
const { JWT_SECRET } = require('../utils/jwtHelpers');

function parseDureeMoisInput(v) {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseInt(String(v), 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(120, Math.max(0, n));
}

/** Recalcule le champ `prix` (forfait annuel) à partir inscription + mensualité × durée. */
function formationAvecPrixRecalcule(formation) {
  if (!formation || typeof formation !== 'object') return formation;
  return { ...formation, prix: computePrixAnnuel(formation) };
}

/** Admin, ou responsable/directeur de l'établissement désigné dans :id ou :etabId */
function etabPedagogieWrite(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'directeur') return next();
  const raw = req.params.id ?? req.params.etabId;
  const etabId = parseInt(raw, 10);
  if (Number.isNaN(etabId)) {
    return res.status(400).json({ message: 'Identifiant établissement invalide.' });
  }
  if (['responsable', 'directeur'].includes(req.user.role) && req.user.etablissement_id === etabId) {
    return next();
  }
  return res.status(403).json({ message: 'Accès réservé à l\'administrateur ou au responsable de cet établissement.' });
}

/** Liste / export / suppression factures : admin ou staff rattaché à l’établissement. */
function etabFacturesAccess(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'directeur') return next();
  const etabId = parseInt(req.params.id, 10);
  if (Number.isNaN(etabId)) {
    return res.status(400).json({ message: 'Identifiant établissement invalide.' });
  }
  const roles = ['responsable', 'directeur', 'comptable', 'agent_admin'];
  if (roles.includes(req.user.role) && Number(req.user.etablissement_id) === etabId) {
    return next();
  }
  return res.status(403).json({ message: 'Accès refusé.' });
}

function factureEtablissementId(facture) {
  if (!facture) return null;
  if (facture.formation_id) {
    const fo = db.get('formations').find({ id: facture.formation_id }).value();
    if (fo && fo.etablissement_id != null) return fo.etablissement_id;
  }
  const dossier = facture.dossier_id
    ? db.get('dossiers').find({ id: facture.dossier_id }).value()
    : null;
  if (dossier && dossier.etablissement_id != null) return dossier.etablissement_id;
  return null;
}

function factureBelongsToEtablissement(facture, etabId) {
  return factureEtablissementId(facture) === etabId;
}

// ─── Multer pour logo / cachet ───────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads', 'etablissements');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// Upload CSV (import en lot) en mémoire
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

async function verifyEtabUploadFiles(reqFiles) {
  if (!reqFiles) return { ok: true };
  const list = [];
  if (reqFiles.logo?.[0]) list.push(reqFiles.logo[0]);
  if (reqFiles.cachet?.[0]) list.push(reqFiles.cachet[0]);
  for (const f of list) {
    const fullPath = path.join(uploadsDir, f.filename);
    const v = await verifyDiskFile(fullPath, f.originalname, 'etab');
    if (!v.ok) {
      list.forEach((x) => unlinkQuiet(path.join(uploadsDir, x.filename)));
      return { ok: false, message: v.message };
    }
    const clam = await optionalClamScanFile(fullPath);
    if (!clam.ok) {
      list.forEach((x) => unlinkQuiet(path.join(uploadsDir, x.filename)));
      return { ok: false, message: clam.message };
    }
  }
  return { ok: true };
}

function parseBoolean(v, fallback = true) {
  if (v === undefined || v === null || String(v).trim() === '') return fallback;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'oui', 'yes'].includes(s)) return true;
  if (['false', '0', 'non', 'no'].includes(s)) return false;
  return null;
}

function parseCsvSemicolon(csvText) {
  const lines = String(csvText || '')
    .replace(/\uFEFF/g, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(';').map((h) => h.trim());
  const rows = lines.slice(1).map((line, i) => {
    const cells = line.split(';').map((c) => c.trim());
    const data = {};
    headers.forEach((h, idx) => { data[h] = cells[idx] ?? ''; });
    return { rowNumber: i + 2, data };
  });
  return { headers, rows };
}

function toInt(v, fallback = 0) {
  if (v === undefined || v === null || String(v).trim() === '') return fallback;
  const n = parseInt(String(v).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function isNonNegativeInt(v) {
  return Number.isInteger(v) && v >= 0;
}

function safeSheetName(name, fallback = 'Feuille') {
  const raw = String(name || fallback).trim() || fallback;
  const cleaned = raw.replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 31) || fallback;
}

function hexToArgb(hex, fallback = 'FF1E40AF') {
  const raw = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return fallback;
  return `FF${raw.toUpperCase()}`;
}

/** Chemin relatif type `uploads/etablissements/...` depuis logo_url (URL absolue ou relative). */
function normalizeLogoUrlToRelativePath(logoUrl) {
  if (!logoUrl) return null;
  let s = String(logoUrl).trim();
  if (!s) return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      s = new URL(s).pathname;
    }
  } catch {
    /* URL invalide : ignorer le préfixe http(s) et continuer avec s */
  }
  s = s.replace(/^\/+/, '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* ignore */
  }
  return s || null;
}

/** Fichier logo sur disque (plusieurs bases selon le répertoire de lancement du serveur). */
function resolveEtabLogoDiskPath(logoUrl) {
  const rel = normalizeLogoUrlToRelativePath(logoUrl);
  if (!rel) return null;
  const candidates = [
    path.join(__dirname, '..', rel),
    path.join(__dirname, '..', '..', rel),
    path.join(process.cwd(), rel),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Enregistre le logo dans le classeur Excel (PNG/JPEG/GIF natifs ; WebP/SVG convertis en PNG via sharp).
 */
async function prepareExcelLogoImageId(wb, logoUrl) {
  const diskPath = resolveEtabLogoDiskPath(logoUrl);
  if (!diskPath) return null;
  const ext = path.extname(diskPath).replace('.', '').toLowerCase();
  const native = ['png', 'jpg', 'jpeg', 'gif'];
  if (native.includes(ext)) {
    try {
      const extension = ext === 'jpg' ? 'jpeg' : ext;
      return wb.addImage({ filename: diskPath, extension });
    } catch {
      return null;
    }
  }
  if (['webp', 'svg'].includes(ext)) {
    try {
      const sharp = require('sharp');
      const buf = await sharp(diskPath)
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      return wb.addImage({ buffer: buf, extension: 'png' });
    } catch {
      return null;
    }
  }
  return null;
}

/** Normalise les variantes de type formation (présentiel / en ligne). */
function normalizeFormationType(v) {
  const raw = String(v || '').trim().toLowerCase();
  if (!raw) return '';
  if (['presentiel', 'présentiel', 'presentielle', 'présentielle', 'sur_site', 'sur site', 'campus'].includes(raw)) {
    return 'presentiel';
  }
  if (['en_ligne', 'en ligne', 'online', 'fad', 'distance', 'a distance', 'à distance'].includes(raw)) {
    return 'en_ligne';
  }
  return raw;
}

/** Retire formation_id des enregistrements liés avant suppression définitive d'une formation. */
function detachFormationReferences(formationId) {
  const id = formationId;
  (db.get('dossiers').value() || []).filter((row) => row.formation_id === id).forEach((row) => {
    db.get('dossiers').find({ id: row.id }).assign({ formation_id: null }).write();
  });
  (db.get('demandes_proforma').value() || []).filter((row) => row.formation_id === id).forEach((row) => {
    db.get('demandes_proforma').find({ id: row.id }).assign({ formation_id: null }).write();
  });
  (db.get('factures').value() || []).filter((row) => row.formation_id === id).forEach((row) => {
    db.get('factures').find({ id: row.id }).assign({ formation_id: null }).write();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ÉTABLISSEMENTS — CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Comptes rattachés à l’établissement en tant que staff (hors étudiants). */
function isEtabStaffMember(u) {
  return u && u.role && u.role !== 'etudiant';
}

// GET /api/etablissements — liste publique ou enrichie selon le rôle
router.get('/', (req, res) => {
  const isAuth = req.headers.authorization?.startsWith('Bearer ');

  // Déterminer le rôle si authentifié
  let userRole = null;
  if (isAuth) {
    try {
      const jwtLib = require('jsonwebtoken');
      const token = req.headers.authorization.split(' ')[1];
      userRole = jwtLib.verify(token, JWT_SECRET).role;
    } catch { /* token invalide → traitement comme public */ }
  }

  // Admin et directeur : tous les établissements (y compris inactifs pour consultation) ; le reste : actifs seulement
  const rawEtabs =
    userRole === 'admin' || userRole === 'directeur'
      ? db.get('etablissements').value()
      : db.get('etablissements').filter({ actif: true }).value();
  const etabs = Array.isArray(rawEtabs) ? rawEtabs : [];

  const enrichis = etabs.map(e => {
    // Données publiques minimales pour les non-authentifiés
    if (!isAuth) {
      return {
        id: e.id,
        nom: e.nom,
        type: e.type,
        logo_url: publicAssetUrl(req, e.logo_url),
        actif: e.actif,
        /** Coordonnées affichables (footer, fiches publiques) — absentes si non renseignées */
        telephone: (e.telephone && String(e.telephone).trim()) || null,
        email_contact: (e.email_contact && String(e.email_contact).trim()) || null,
        site_web: (e.site_web && String(e.site_web).trim()) || null,
        couleur_primaire: e.couleur_primaire || null,
        couleur_secondaire: e.couleur_secondaire || null,
      };
    }
    // Données complètes avec compteurs pour les authentifiés
    const nb_filieres  = db.get('filieres').filter({ etablissement_id: e.id }).value().length;
    const nb_formations = db.get('formations').filter({ etablissement_id: e.id }).value().length;
    const nb_membres   = db.get('utilisateurs')
      .filter((u) => u.etablissement_id === e.id && isEtabStaffMember(u))
      .value().length;
    return {
      ...e,
      logo_url: publicAssetUrl(req, e.logo_url),
      cachet_url: publicAssetUrl(req, e.cachet_url),
      nb_filieres,
      nb_formations,
      nb_membres,
    };
  });
  res.json(enrichis);
});

// Toutes les routes suivantes nécessitent auth
router.use(authMiddleware);

/** Multipart (logo/cachet) ou JSON classique */
function maybeUploadCreateFiles(req, res, next) {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    return upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'cachet', maxCount: 1 },
    ])(req, res, next);
  }
  next();
}

// POST /api/etablissements — créer (admin ou directeur) — JSON ou multipart/form-data (+ logo, cachet optionnels)
router.post('/', adminOrDirecteur, maybeUploadCreateFiles, async (req, res) => {
  const {
    nom, type, description, couleur_primaire, couleur_secondaire, adresse, telephone, email_contact, site_web,
    ninea, rc, arrete, compte_bancaire, banque, iban, swift, signataire_nom, signataire_fonction
  } = req.body;
  if (!nom || !nom.trim()) return res.status(400).json({ message: 'Le nom de l\'établissement est obligatoire.' });
  if (!type) return res.status(400).json({ message: 'Le type est obligatoire.' });

  if (req.files) {
    const ve = await verifyEtabUploadFiles(req.files);
    if (!ve.ok) return res.status(400).json({ message: ve.message || 'Fichier invalide.' });
  }

  let logo_url = null;
  let cachet_url = null;
  if (req.files?.logo?.[0]) logo_url = `/uploads/etablissements/${req.files.logo[0].filename}`;
  if (req.files?.cachet?.[0]) cachet_url = `/uploads/etablissements/${req.files.cachet[0].filename}`;

  const id = db.nextId('etablissements');
  const etab = {
    id,
    nom: nom.trim(), type,
    description: (description || '').trim(),
    logo_url,
    cachet_url,
    couleur_primaire:   couleur_primaire   || '#1e40af',
    couleur_secondaire: couleur_secondaire || '#3b82f6',
    adresse: (adresse || '').trim(),
    telephone: (telephone || '').trim(),
    email_contact: (email_contact || '').trim(),
    site_web: (site_web || '').trim(),
    ninea: (ninea || '').trim(),
    rc: (rc || '').trim(),
    arrete: (arrete || '').trim(),
    compte_bancaire: (compte_bancaire || '').trim(),
    banque: (banque || '').trim(),
    iban: (iban || '').trim(),
    swift: (swift || '').trim(),
    signataire_nom: (signataire_nom || '').trim(),
    signataire_fonction: (signataire_fonction || '').trim(),
    responsable_id: null,
    actif: true,
    created_at: new Date().toISOString()
  };

  db.get('etablissements').push(etab).write();
  res.status(201).json(etab);
});

// POST /api/etablissements/:id/upload — upload logo/cachet séparé
router.post('/:id/upload', adminOrDirecteur, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'cachet', maxCount: 1 }]), async (req, res) => {
  const id = parseInt(req.params.id);
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  if (req.files) {
    const ve = await verifyEtabUploadFiles(req.files);
    if (!ve.ok) return res.status(400).json({ message: ve.message || 'Fichier invalide.' });
  }
  const updates = {};
  if (req.files?.logo?.[0])   updates.logo_url   = `/uploads/etablissements/${req.files.logo[0].filename}`;
  if (req.files?.cachet?.[0]) updates.cachet_url = `/uploads/etablissements/${req.files.cachet[0].filename}`;
  db.get('etablissements').find({ id }).assign(updates).write();
  res.json(db.get('etablissements').find({ id }).value());
});

// ─── Préinscriptions acceptées, par formation (dérivé des dossiers) ─────────
// Chaque formation de l’établissement a une « liste » (vide si aucun accepté).
// Dès qu’un dossier passe en statut accepte, il apparaît ici (pas de sync manuelle).

// GET /api/etablissements/:id/acceptes-par-formation
router.get('/:id/acceptes-par-formation', etabFacturesAccess, (req, res) => {
  const etabId = parseInt(req.params.id, 10);
  if (Number.isNaN(etabId)) {
    return res.status(400).json({ message: 'Identifiant établissement invalide.' });
  }
  const etab = db.get('etablissements').find({ id: etabId }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  const formations = (db.get('formations').value() || []).filter(
    (f) => Number(f.etablissement_id) === etabId
  );
  const filieres = db.get('filieres').value() || [];
  const dossiers = db.get('dossiers').value() || [];
  const utilisateurs = db.get('utilisateurs').value() || [];
  const acceptes = dossiers.filter((d) => d.statut === 'accepte');

  const listes = formations
    .map((f) => {
      const rows = acceptes
        .filter((d) => Number(d.formation_id) === Number(f.id))
        .map((d) => {
          const u = utilisateurs.find((x) => x.id === d.etudiant_id) || {};
          return {
            dossier_id: d.id,
            numero_dossier: d.numero_dossier || null,
            date_acceptation: d.date_acceptation || d.updated_at || null,
            nom: u.nom || '',
            prenom: u.prenom || '',
            email: u.email || '',
            matricule: u.matricule || null,
          };
        })
        .sort((a, b) => {
          const da = a.date_acceptation ? new Date(a.date_acceptation).getTime() : 0;
          const db_ = b.date_acceptation ? new Date(b.date_acceptation).getTime() : 0;
          if (db_ !== da) return db_ - da;
          return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr');
        });

      return {
        formation_id: f.id,
        filiere_id: f.filiere_id || null,
        filiere_nom: filieres.find((fi) => Number(fi.id) === Number(f.filiere_id))?.nom || 'Sans filière',
        titre: f.titre || `Formation #${f.id}`,
        niveau: f.niveau || null,
        type: f.type || null,
        actif: f.actif !== false,
        count: rows.length,
        etudiants: rows,
      };
    })
    .sort((a, b) => String(a.titre || '').localeCompare(String(b.titre || ''), 'fr', { sensitivity: 'base' }));

  return res.json({
    etablissement_id: etabId,
    etablissement_nom: etab.nom,
    listes,
  });
});

// GET /api/etablissements/:id/acceptes-par-formation/export-xlsx?filiere_id=12
// Export d'une filière : une feuille par formation.
router.get('/:id/acceptes-par-formation/export-xlsx', etabFacturesAccess, async (req, res) => {
  const etabId = parseInt(req.params.id, 10);
  const filiereId = parseInt(req.query.filiere_id, 10);
  const typeFilterRaw = normalizeFormationType(req.query.type || '');
  const typeFilter = ['presentiel', 'en_ligne'].includes(typeFilterRaw) ? typeFilterRaw : '';
  if (Number.isNaN(etabId) || Number.isNaN(filiereId)) {
    return res.status(400).json({ message: 'Paramètres établissement/filière invalides.' });
  }

  const etab = db.get('etablissements').find({ id: etabId }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  const filiere = db.get('filieres').find({ id: filiereId }).value();
  if (!filiere || Number(filiere.etablissement_id) !== etabId) {
    return res.status(404).json({ message: 'Filière introuvable pour cet établissement.' });
  }

  const formations = (db.get('formations').value() || [])
    .filter((f) => Number(f.etablissement_id) === etabId && Number(f.filiere_id) === filiereId)
    .filter((f) => !typeFilter || String(f.type) === typeFilter)
    .sort((a, b) => String(a.titre || '').localeCompare(String(b.titre || ''), 'fr', { sensitivity: 'base' }));

  if (formations.length === 0) {
    return res.status(400).json({ message: 'Aucune formation trouvée pour cette filière avec ce filtre.' });
  }

  const dossiers = db.get('dossiers').value() || [];
  const utilisateurs = db.get('utilisateurs').value() || [];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'UniPortail';
  wb.created = new Date();
  const usedSheetNames = new Set();
  const primary = hexToArgb(etab.couleur_primaire, 'FF1E40AF');
  const secondary = hexToArgb(etab.couleur_secondaire, 'FF3B82F6');
  const logoImageId = await prepareExcelLogoImageId(wb, etab.logo_url);

  formations.forEach((fo, idx) => {
    let baseName = safeSheetName(fo.titre, `Formation-${idx + 1}`);
    let finalName = baseName;
    let n = 2;
    while (usedSheetNames.has(finalName.toLowerCase())) {
      const suffix = `-${n}`;
      finalName = safeSheetName(`${baseName}`.slice(0, Math.max(1, 31 - suffix.length)) + suffix, `Formation-${idx + 1}`);
      n += 1;
    }
    usedSheetNames.add(finalName.toLowerCase());
    const sheet = wb.addWorksheet(finalName);
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    sheet.getColumn(1).width = 14;
    sheet.getRow(1).height = 48;
    sheet.getRow(2).height = 20;
    sheet.getRow(3).height = 22;

    // En-tête branding établissement
    sheet.mergeCells('B1:F1');
    sheet.getCell('B1').value = etab.nom || 'Établissement';
    sheet.getCell('B1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('B1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
    sheet.getCell('B1').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('B2:F2');
    sheet.getCell('B2').value = `Filière: ${filiere.nom || '—'}${typeFilter ? ` | Type: ${typeFilter === 'en_ligne' ? 'FAD' : 'Présentiel'}` : ''}`;
    sheet.getCell('B2').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondary } };
    sheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('B3:F3');
    sheet.getCell('B3').value = `Formation: ${fo.titre || '—'}`;
    sheet.getCell('B3').font = { bold: true, color: { argb: 'FF1F2937' } };
    sheet.getCell('B3').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.columns = [
      { key: 'prenom', width: 18 },
      { key: 'nom', width: 18 },
      { key: 'email', width: 28 },
      { key: 'matricule', width: 18 },
      { key: 'numero_dossier', width: 20 },
      { key: 'date_acceptation', width: 20 },
    ];
    sheet.addRow(['Prénom', 'Nom', 'Email', 'Matricule', 'Numéro dossier', 'Date acceptation']);

    if (logoImageId) {
      sheet.addImage(logoImageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 56, height: 56 },
      });
    }

    const rows = dossiers
      .filter((d) => d.statut === 'accepte' && Number(d.formation_id) === Number(fo.id))
      .map((d) => {
        const u = utilisateurs.find((x) => x.id === d.etudiant_id) || {};
        return {
          prenom: u.prenom || '',
          nom: u.nom || '',
          email: u.email || '',
          matricule: u.matricule || '',
          numero_dossier: d.numero_dossier || '',
          date_acceptation: d.date_acceptation || d.updated_at || '',
        };
      })
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));

    if (rows.length === 0) {
      sheet.addRow({
        prenom: '',
        nom: '',
        email: '',
        matricule: '',
        numero_dossier: '',
        date_acceptation: 'Aucun étudiant accepté pour cette formation',
      });
    } else {
      rows.forEach((r) => sheet.addRow(r));
    }

    const tableHeader = sheet.getRow(4);
    tableHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tableHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
    tableHeader.alignment = { vertical: 'middle' };
  });

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="acceptes-${String(filiere.nom || 'filiere').replace(/\s+/g, '-').toLowerCase()}${typeFilter ? `-${typeFilter}` : ''}.xlsx"`
  );
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await wb.xlsx.write(res);
  return res.end();
});

// ─── Factures liées à l’établissement (dossiers / formations) ─────────────

// GET /api/etablissements/:id/factures/export?ids=1,2,3 (ids optionnel = toutes)
router.get('/:id/factures/export', etabFacturesAccess, (req, res) => {
  const etabId = parseInt(req.params.id, 10);
  const etab = db.get('etablissements').find({ id: etabId }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  const idsParam = String(req.query.ids || '').trim();
  const idSet = idsParam
    ? new Set(idsParam.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)))
    : null;
  const all = db.get('factures').value();
  let subset = all.filter((f) => factureBelongsToEtablissement(f, etabId) && !isFactureSupprimee(f));
  if (idSet && idSet.size > 0) {
    subset = subset.filter((f) => idSet.has(f.id));
  }
  if (subset.length === 0) {
    return res.status(400).json({ message: 'Aucune facture à exporter pour cette sélection.' });
  }
  subset.sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || '')));
  const syncedSubset = subset.map((f) => syncStoredFactureById(f.id) || f);
  const html = buildFacturesExportHtml(syncedSubset, etabId);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="factures-etablissement-${etabId}.html"`);
  return res.send(html);
});

const FACTURES_PAGE_MAX = 10;

// POST /api/etablissements/:id/factures/delete-batch — body { ids: number[] } — max 10 id. par requête
router.post('/:id/factures/delete-batch', etabFacturesAccess, (req, res) => {
  const etabId = parseInt(req.params.id, 10);
  const rawIds = Array.isArray(req.body.ids) ? req.body.ids : [];
  const ids = rawIds.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n));
  if (ids.length === 0) {
    return res.status(400).json({ message: 'Liste d’identifiants vide.' });
  }
  if (ids.length > FACTURES_PAGE_MAX) {
    return res.status(400).json({
      message: `Suppression groupée limitée à ${FACTURES_PAGE_MAX} facture(s) par envoi. Cochez au plus ${FACTURES_PAGE_MAX} ligne(s) ou utilisez « Tout supprimer » (plusieurs lots automatiques).`,
    });
  }
  const removed = [];
  const skipped = [];
  ids.forEach((fid) => {
    const f = db.get('factures').find({ id: fid }).value();
    if (!f || !factureBelongsToEtablissement(f, etabId)) {
      skipped.push(fid);
      return;
    }
    db.get('factures').remove({ id: fid }).write();
    removed.push(fid);
  });
  if (removed.length) {
    logAudit(req, 'factures_hard_delete_batch', 'etablissement', etabId, {
      count: removed.length,
      facture_ids: removed,
    });
  }
  return res.json({
    message: `${removed.length} facture(s) définitivement supprimée(s) de la base.`,
    removed,
    skipped,
  });
});

// GET /api/etablissements/:id/factures?page=1&limit=10 — liste paginée (10 max. par page)
router.get('/:id/factures', etabFacturesAccess, (req, res) => {
  const etabId = parseInt(req.params.id, 10);
  const etab = db.get('etablissements').find({ id: etabId }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Math.min(FACTURES_PAGE_MAX, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : FACTURES_PAGE_MAX));
  const all = db.get('factures').value();
  const factures = all
    .filter((f) => factureBelongsToEtablissement(f, etabId) && !isFactureSupprimee(f))
    .sort((a, b) => new Date(b.date_emission || 0) - new Date(a.date_emission || 0));
  const total = factures.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const slice = factures.slice(start, start + limit);
  const items = slice.map((f) => ({
    id: f.id,
    numero: f.numero,
    dossier_id: f.dossier_id,
    date_emission: f.date_emission,
    date_echeance: f.date_echeance,
    montant_ttc: f.montant_ttc,
    statut: f.statut,
    etudiant_snapshot: f.etudiant_snapshot,
    formation_snapshot: f.formation_snapshot,
  }));
  return res.json({
    items,
    total,
    page: safePage,
    limit,
    totalPages,
  });
});

// GET /api/etablissements/:id — détail complet
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  // Admin et directeur : tous les établissements ; autres rôles : uniquement leur rattachement
  const accesTousEtabs = req.user.role === 'admin' || req.user.role === 'directeur';
  if (!accesTousEtabs && Number(req.user.etablissement_id) !== id) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  const filieres = (db.get('filieres').value() || []).filter((f) => f.etablissement_id === id).map((f) => {
    const list = (db.get('formations').value() || []).filter((x) => x.filiere_id === f.id && x.etablissement_id === id);
    const actives = list.filter((x) => x.actif !== false);
    return {
      ...f,
      nb_formations: list.length,
      nb_formations_actives: actives.length,
      nb_formations_inactives: list.length - actives.length,
      nb_formations_presentiel: actives.filter((x) => x.type === 'presentiel').length,
      nb_formations_en_ligne: actives.filter((x) => x.type === 'en_ligne').length,
    };
  });
  const formations = (db.get('formations').value() || []).filter((f) => f.etablissement_id === id).map((f) => {
    const filiere = db.get('filieres').find({ id: f.filiere_id }).value();
    return { ...f, filiere_nom: filiere?.nom || null };
  });
  const membres = (db.get('utilisateurs').value() || [])
    .filter((u) => u.etablissement_id === id && isEtabStaffMember(u))
    .map((u) => ({
      id: u.id,
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      matricule: u.matricule || null,
      date_naissance: u.date_naissance || null,
      telephone: u.telephone || null,
      role: u.role,
      actif: u.actif,
      created_at: u.created_at,
    }));
  const responsable = etab.responsable_id
    ? db.get('utilisateurs').find({ id: etab.responsable_id }).pick(['id', 'prenom', 'nom', 'email', 'role']).value()
    : null;

  const noUserScope = req.user.role === 'directeur';
  res.json({
    ...etab,
    logo_url: publicAssetUrl(req, etab.logo_url),
    cachet_url: publicAssetUrl(req, etab.cachet_url),
    filieres,
    formations,
    membres: noUserScope ? [] : membres,
    responsable: noUserScope ? null : responsable,
  });
});

// PUT /api/etablissements/:id — modifier (JSON uniquement)
router.put('/:id', adminOrDirecteur, (req, res) => {
  const id = parseInt(req.params.id);
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  const updates = {};
  const fields = [
    'nom', 'type', 'description', 'couleur_primaire', 'couleur_secondaire',
    'adresse', 'telephone', 'email_contact', 'site_web',
    'ninea', 'rc', 'arrete', 'compte_bancaire',
    'banque', 'iban', 'swift', 'signataire_nom', 'signataire_fonction'
  ];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  db.get('etablissements').find({ id }).assign(updates).write();
  res.json(db.get('etablissements').find({ id }).value());
});

// DELETE /api/etablissements/:id — désactiver
router.delete('/:id', adminOrDirecteur, (req, res) => {
  const id = parseInt(req.params.id);
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  db.get('etablissements').find({ id }).assign({ actif: false }).write();
  res.json({ message: 'Établissement désactivé.' });
});

// PUT /api/etablissements/:id/responsable — désigner un responsable (comptes utilisateurs → admin uniquement)
router.put('/:id/responsable', adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  const { utilisateur_id } = req.body;
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  if (utilisateur_id) {
    const user = db.get('utilisateurs').find({ id: parseInt(utilisateur_id) }).value();
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    // Relier l'utilisateur à l'établissement
    db.get('utilisateurs').find({ id: parseInt(utilisateur_id) }).assign({ etablissement_id: id }).write();
  }

  db.get('etablissements').find({ id }).assign({ responsable_id: utilisateur_id ? parseInt(utilisateur_id) : null }).write();
  res.json({ message: 'Responsable mis à jour.' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FILIÈRES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/etablissements/:id/filieres
router.get('/:id/filieres', (req, res) => {
  const etablissement_id = parseInt(req.params.id);
  const filieres = (db.get('filieres').value() || []).filter((f) => f.etablissement_id === etablissement_id).map((f) => {
    const list = (db.get('formations').value() || []).filter((x) => x.filiere_id === f.id && x.etablissement_id === etablissement_id);
    const actives = list.filter((x) => x.actif !== false);
    const nb_formations = list.length;
    const nb_formations_actives = actives.length;
    const nb_formations_inactives = list.length - actives.length;
    const nb_formations_presentiel = actives.filter(x => x.type === 'presentiel').length;
    const nb_formations_en_ligne = actives.filter(x => x.type === 'en_ligne').length;
    return {
      ...f,
      nb_formations,
      nb_formations_actives,
      nb_formations_inactives,
      nb_formations_presentiel,
      nb_formations_en_ligne,
    };
  });
  res.json(filieres);
});

// POST /api/etablissements/:id/filieres
router.post('/:id/filieres', etabPedagogieWrite, (req, res) => {
  const etablissement_id = parseInt(req.params.id);
  const etab = db.get('etablissements').find({ id: etablissement_id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  const { nom, code, description } = req.body;
  if (!nom) return res.status(400).json({ message: 'Nom de filière obligatoire.' });

  const id = db.nextId('filieres');
  const filiere = {
    id, etablissement_id, nom, code: code || '', description: description || '',
    actif: true, created_at: new Date().toISOString()
  };
  db.get('filieres').push(filiere).write();
  res.status(201).json(filiere);
});

// PUT /api/etablissements/:etabId/filieres/:id
router.put('/:etabId/filieres/:id', etabPedagogieWrite, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id);
  const filiere = db.get('filieres').find({ id }).value();
  if (!filiere || filiere.etablissement_id !== etabId) {
    return res.status(404).json({ message: 'Filière introuvable.' });
  }

  const { nom, code, description, actif, duree_cycle, condition_acces, eligibility } = req.body;
  const updates = {};
  if (nom !== undefined) updates.nom = nom;
  if (code !== undefined) updates.code = code;
  if (description !== undefined) updates.description = description;
  if (actif !== undefined) updates.actif = actif;
  if (duree_cycle !== undefined) updates.duree_cycle = duree_cycle;
  if (condition_acces !== undefined) updates.condition_acces = condition_acces;
  if (eligibility !== undefined) updates.eligibility = eligibility;

  db.get('filieres').find({ id }).assign(updates).write();
  res.json(db.get('filieres').find({ id }).value());
});

// DELETE /api/etablissements/:etabId/filieres/:id
router.delete('/:etabId/filieres/:id', etabPedagogieWrite, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id);
  const filiere = db.get('filieres').find({ id }).value();
  if (!filiere || filiere.etablissement_id !== etabId) {
    return res.status(404).json({ message: 'Filière introuvable.' });
  }

  const list = (db.get('formations').value() || []).filter((x) => x.filiere_id === id && x.etablissement_id === etabId);
  const actives = list.filter((x) => x.actif !== false);
  if (actives.length > 0) {
    return res.status(400).json({
      message: `Impossible : ${actives.length} formation(s) encore active(s). Désactivez-les ou supprimez-les définitivement avant de supprimer la filière.`,
    });
  }

  // Formations désactivées : détachement des références puis purge pour libérer la filière.
  const restantes = list.filter((x) => x.actif === false);
  for (const fo of restantes) {
    detachFormationReferences(fo.id);
    db.get('formations').remove({ id: fo.id }).write();
  }

  db.get('filieres').remove({ id }).write();
  res.json({ message: 'Filière supprimée.' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FORMATIONS (par établissement)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/etablissements/:id/formations
router.get('/:id/formations', (req, res) => {
  const etablissement_id = parseInt(req.params.id);
  const formations = (db.get('formations').value() || []).filter((f) => f.etablissement_id === etablissement_id).map((f) => {
    const filiere = db.get('filieres').find({ id: f.filiere_id }).value();
    return { ...f, filiere_nom: filiere?.nom || null };
  });
  res.json(formations);
});

// POST /api/etablissements/:id/formations
router.post('/:id/formations', etabPedagogieWrite, (req, res) => {
  const etablissement_id = parseInt(req.params.id);
  const etab = db.get('etablissements').find({ id: etablissement_id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  const {
    filiere_id, titre, type, niveau, niveau_requis, duree, description,
    ville, places,
    frais_inscription, mensualite, frais_soutenance, autres_frais,
    duree_mois, frais_supplementaires,
    nombre_photos_preinscription,
  } = req.body;

  if (!titre || !type || !filiere_id) return res.status(400).json({ message: 'Titre, type et filière obligatoires.' });
  const normalizedType = normalizeFormationType(type);
  if (!['presentiel', 'en_ligne'].includes(normalizedType)) return res.status(400).json({ message: 'Type invalide.' });

  const fid = parseInt(filiere_id);
  const filiere = db.get('filieres').find({ id: fid, etablissement_id }).value();
  if (!filiere) return res.status(400).json({ message: 'Filière non rattachée à cet établissement.' });

  const placesN = places ? parseInt(places, 10) : 0;
  const fraisInscriptionN = parseInt(frais_inscription, 10) || 0;
  const mensualiteN = parseInt(mensualite, 10) || 0;
  const fraisSoutenanceN = parseInt(frais_soutenance, 10) || 0;
  const autresFraisN = parseInt(autres_frais, 10) || 0;
  const dureeMoisN = parseDureeMoisInput(duree_mois);
  const fraisSupp = normalizeFraisSupplementaires(frais_supplementaires);
  if (![placesN, fraisInscriptionN, mensualiteN, fraisSoutenanceN, autresFraisN].every(isNonNegativeInt)) {
    return res.status(400).json({ message: 'Les champs numériques doivent être des entiers positifs ou nuls.' });
  }

  const { normalizeNombrePhotosPreinscription } = require('../utils/preinscriptionDocumentRules');
  const nPhotos = normalizeNombrePhotosPreinscription(
    nombre_photos_preinscription != null ? nombre_photos_preinscription : 1,
  );

  const id = db.nextId('formations');
  let formation = {
    id, etablissement_id, filiere_id: fid,
    titre: String(titre).trim(), type: normalizedType, niveau: niveau || '',
    niveau_requis: niveau_requis || '',
    duree: duree || '',
    duree_mois: dureeMoisN,
    description: description || '',
    ville: normalizedType === 'presentiel' ? (ville || '') : null,
    places: placesN,
    frais_inscription: fraisInscriptionN,
    mensualite: mensualiteN,
    frais_soutenance: fraisSoutenanceN,
    autres_frais: autresFraisN,
    frais_supplementaires: fraisSupp,
    nombre_photos_preinscription: nPhotos,
    actif: true,
    created_at: new Date().toISOString()
  };
  formation = formationAvecPrixRecalcule(formation);

  db.get('formations').push(formation).write();
  logAudit(req, 'create', 'formation', formation.id, {
    etablissement_id,
    filiere_id: formation.filiere_id,
    titre: formation.titre,
    type: formation.type,
  });
  res.status(201).json(formation);
});

// POST /api/etablissements/:id/formations/import/:filiereId?dry_run=true
// Import en lot de formations pour UNE filière donnée.
router.post('/:id/formations/import/:filiereId', etabPedagogieWrite, csvUpload.single('file'), (req, res) => {
  const etablissement_id = parseInt(req.params.id, 10);
  const filiereId = parseInt(req.params.filiereId, 10);
  const dryRun = ['1', 'true', 'yes', 'oui'].includes(String(req.query.dry_run || '').toLowerCase());
  if (Number.isNaN(etablissement_id) || Number.isNaN(filiereId)) {
    return res.status(400).json({ message: 'Identifiant établissement/filière invalide.' });
  }
  if (!req.file) return res.status(400).json({ message: 'Fichier CSV requis (champ file).' });

  const etab = db.get('etablissements').find({ id: etablissement_id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  const filiere = db.get('filieres').find({ id: filiereId, etablissement_id }).value();
  if (!filiere) return res.status(404).json({ message: 'Filière introuvable pour cet établissement.' });

  const { headers, rows } = parseCsvSemicolon(req.file.buffer.toString('utf8'));
  const expected = [
    'titre', 'type', 'niveau', 'niveau_requis', 'duree', 'description', 'ville',
    'places', 'frais_inscription', 'prix', 'mensualite', 'frais_soutenance', 'autres_frais', 'actif',
  ];
  const missing = expected.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return res.status(400).json({ message: `En-têtes manquants: ${missing.join(', ')}` });
  }

  const errors = [];
  const toCreate = [];
  let skipped = 0;

  rows.forEach(({ rowNumber, data }) => {
    const titre = String(data.titre || '').trim();
    const type = normalizeFormationType(data.type);
    const niveau = String(data.niveau || '').trim();
    const niveau_requis = String(data.niveau_requis || '').trim();
    const duree = String(data.duree || '').trim();
    const description = String(data.description || '').trim();
    const ville = String(data.ville || '').trim();
    const places = toInt(data.places, 0);
    const frais_inscription = toInt(data.frais_inscription, 0);
    const prix = toInt(data.prix, 0);
    const mensualite = toInt(data.mensualite, 0);
    const frais_soutenance = toInt(data.frais_soutenance, 0);
    const autres_frais = toInt(data.autres_frais, 0);
    const actif = parseBoolean(data.actif, true);

    if (!titre) errors.push({ row: rowNumber, field: 'titre', message: 'Titre obligatoire.' });
    if (!['presentiel', 'en_ligne'].includes(type)) {
      errors.push({ row: rowNumber, field: 'type', message: 'Type invalide (exemples acceptés: presentiel, en_ligne, en ligne, fad).' });
    }
    if (type === 'presentiel' && !ville) errors.push({ row: rowNumber, field: 'ville', message: 'Ville obligatoire en présentiel.' });
    if ([places, frais_inscription, prix, mensualite, frais_soutenance, autres_frais].some((v) => v === null || v < 0)) {
      errors.push({ row: rowNumber, field: 'montants', message: 'Montants/places invalides (entiers >= 0).' });
    }
    if (actif === null) errors.push({ row: rowNumber, field: 'actif', message: 'Valeur booléenne invalide.' });

    const dup = db.get('formations').find({ etablissement_id, filiere_id: filiereId, titre, type }).value();
    if (dup) {
      skipped += 1;
      return;
    }

    const duree_mois =
      data.duree_mois != null && String(data.duree_mois).trim() !== ''
        ? toInt(data.duree_mois, 0)
        : 0;

    toCreate.push({
      titre,
      type,
      niveau,
      niveau_requis,
      duree,
      duree_mois,
      description,
      // En ligne: ville forcée à null pour éviter les incohérences importées.
      ville: type === 'presentiel' ? ville : null,
      places,
      frais_inscription,
      prix,
      mensualite,
      frais_soutenance,
      autres_frais,
      frais_supplementaires: [],
      actif,
    });
  });

  if (errors.length > 0) {
    return res.status(422).json({
      ok: false,
      entity: 'formations',
      dry_run: dryRun,
      summary: { total_rows: rows.length, valid_rows: 0, invalid_rows: errors.length, created: 0, updated: 0, skipped },
      errors,
    });
  }

  if (!dryRun) {
    toCreate.forEach((p) => {
      const rec = formationAvecPrixRecalcule({
        id: db.nextId('formations'),
        etablissement_id,
        filiere_id: filiereId,
        ...p,
        created_at: new Date().toISOString(),
      });
      db.get('formations').push(rec).write();
    });
  }

  return res.json({
    ok: true,
    entity: 'formations',
    dry_run: dryRun,
    summary: {
      total_rows: rows.length,
      valid_rows: toCreate.length,
      invalid_rows: 0,
      created: toCreate.length,
      updated: 0,
      skipped,
    },
    errors: [],
  });
});

// PUT /api/etablissements/:etabId/formations/:id
router.put('/:etabId/formations/:id', etabPedagogieWrite, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id);
  const formation = db.get('formations').find({ id }).value();
  if (!formation || Number(formation.etablissement_id) !== etabId) {
    return res.status(404).json({ message: 'Formation introuvable.' });
  }

  const fields = [
    'filiere_id', 'titre', 'type', 'niveau', 'niveau_requis', 'duree',
    'description', 'ville', 'places',
    'frais_inscription', 'mensualite', 'frais_soutenance', 'autres_frais', 'actif',
    'duree_mois', 'frais_supplementaires', 'nombre_photos_preinscription',
  ];
  const updates = {};
  fields.forEach(f => {
    if (req.body[f] === undefined) return;
    if (f === 'frais_supplementaires') {
      updates[f] = normalizeFraisSupplementaires(req.body[f]);
      return;
    }
    if (f === 'duree_mois') {
      updates[f] = parseDureeMoisInput(req.body[f]);
      return;
    }
    const numFields = ['filiere_id', 'places', 'frais_inscription', 'mensualite', 'frais_soutenance', 'autres_frais'];
    updates[f] = numFields.includes(f) ? parseInt(req.body[f]) : req.body[f];
  });
  if (updates.nombre_photos_preinscription !== undefined) {
    const { normalizeNombrePhotosPreinscription } = require('../utils/preinscriptionDocumentRules');
    updates.nombre_photos_preinscription = normalizeNombrePhotosPreinscription(updates.nombre_photos_preinscription);
  }
  if (updates.type !== undefined) {
    updates.type = normalizeFormationType(updates.type);
    if (!['presentiel', 'en_ligne'].includes(updates.type)) {
      return res.status(400).json({ message: 'Type invalide.' });
    }
  }
  const numericFields = ['places', 'frais_inscription', 'mensualite', 'frais_soutenance', 'autres_frais', 'duree_mois'];
  for (const f of numericFields) {
    if (updates[f] !== undefined && !isNonNegativeInt(updates[f])) {
      return res.status(400).json({ message: `Champ numérique invalide: ${f}.` });
    }
  }
  if (updates.type === 'en_ligne') updates.ville = null;
  if (updates.actif === true) updates.deleted_at = null;

  db.get('formations').find({ id }).assign(updates).write();
  let saved = db.get('formations').find({ id }).value();
  saved = formationAvecPrixRecalcule(saved);
  db.get('formations').find({ id }).assign({ prix: saved.prix }).write();
  saved = db.get('formations').find({ id }).value();
  logAudit(req, 'update', 'formation', id, { etablissement_id: etabId, updates });
  res.json(saved);
});

// PUT /api/etablissements/:etabId/formations/batch
// body: { items: [{ id, ...champs_modifiables }] }
router.put('/:etabId/formations/batch', etabPedagogieWrite, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  if (Number.isNaN(etabId)) {
    return res.status(400).json({ message: 'Identifiant établissement invalide.' });
  }
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  if (rawItems.length === 0) {
    return res.status(400).json({ message: 'Aucune ligne à modifier.' });
  }

  const allowed = new Set([
    'filiere_id', 'titre', 'type', 'niveau', 'niveau_requis', 'duree',
    'description', 'ville', 'places',
    'frais_inscription', 'mensualite', 'frais_soutenance', 'autres_frais', 'actif',
    'duree_mois', 'frais_supplementaires', 'nombre_photos_preinscription',
  ]);
  const numericFields = new Set([
    'filiere_id', 'places', 'frais_inscription', 'mensualite', 'frais_soutenance', 'autres_frais', 'duree_mois',
  ]);

  const updated = [];
  const created = [];
  const errors = [];

  rawItems.forEach((row, idx) => {
    const id = parseInt(row?.id, 10);
    const updates = {};
    Object.keys(row || {}).forEach((k) => {
      if (k === 'id' || !allowed.has(k)) return;
      let v = row[k];
      if (k === 'frais_supplementaires') {
        updates[k] = normalizeFraisSupplementaires(v);
        return;
      }
      if (k === 'duree_mois') {
        updates[k] = parseDureeMoisInput(v);
        return;
      }
      if (numericFields.has(k)) {
        const n = parseInt(v, 10);
        if (Number.isNaN(n)) return;
        v = n;
      }
      updates[k] = v;
    });

    if (updates.nombre_photos_preinscription !== undefined) {
      const { normalizeNombrePhotosPreinscription } = require('../utils/preinscriptionDocumentRules');
      updates.nombre_photos_preinscription = normalizeNombrePhotosPreinscription(updates.nombre_photos_preinscription);
    }

    if (updates.type !== undefined) {
      updates.type = normalizeFormationType(updates.type);
      if (!['presentiel', 'en_ligne'].includes(updates.type)) {
        errors.push({ index: idx, id: Number.isNaN(id) ? null : id, message: 'Type invalide (presentiel / en_ligne).' });
        return;
      }
    }
    for (const k of ['places', 'frais_inscription', 'mensualite', 'frais_soutenance', 'autres_frais', 'duree_mois']) {
      if (updates[k] !== undefined && !isNonNegativeInt(updates[k])) {
        errors.push({ index: idx, id: Number.isNaN(id) ? null : id, message: `Champ numérique invalide: ${k}.` });
        return;
      }
    }

    if (updates.filiere_id !== undefined) {
      const filiere = db.get('filieres').find({ id: updates.filiere_id, etablissement_id: etabId }).value();
      if (!filiere) {
        errors.push({ index: idx, id: Number.isNaN(id) ? null : id, message: 'filiere_id non rattachée à cet établissement.' });
        return;
      }
    }

    if (updates.titre !== undefined) {
      const t = String(updates.titre).trim();
      if (!t) {
        errors.push({ index: idx, id: Number.isNaN(id) ? null : id, message: 'Le titre ne peut pas être vide.' });
        return;
      }
      updates.titre = t;
    }

    // Sans id => création d'une nouvelle formation depuis le tableau batch.
    if (Number.isNaN(id)) {
      const titre = String(updates.titre || '').trim();
      const type = updates.type || 'presentiel';
      const filiere_id = updates.filiere_id;
      if (!titre || !filiere_id) {
        errors.push({ index: idx, message: 'Nouvelle ligne invalide: titre et filière obligatoires.' });
        return;
      }
      const fid = parseInt(filiere_id, 10);
      const filiere = db.get('filieres').find({ id: fid, etablissement_id: etabId }).value();
      if (!filiere) {
        errors.push({ index: idx, message: 'Nouvelle ligne invalide: filière non rattachée à cet établissement.' });
        return;
      }

      let newFormation = {
        id: db.nextId('formations'),
        etablissement_id: etabId,
        filiere_id: fid,
        titre,
        type,
        niveau: updates.niveau || '',
        niveau_requis: updates.niveau_requis || '',
        duree: updates.duree || '',
        duree_mois: updates.duree_mois !== undefined ? updates.duree_mois : 0,
        description: updates.description || '',
        ville: type === 'presentiel' ? String(updates.ville || '') : null,
        places: parseInt(updates.places, 10) || 0,
        frais_inscription: parseInt(updates.frais_inscription, 10) || 0,
        mensualite: parseInt(updates.mensualite, 10) || 0,
        frais_soutenance: parseInt(updates.frais_soutenance, 10) || 0,
        autres_frais: parseInt(updates.autres_frais, 10) || 0,
        frais_supplementaires: Array.isArray(updates.frais_supplementaires) ? updates.frais_supplementaires : [],
        actif: updates.actif === undefined ? true : !!updates.actif,
        created_at: new Date().toISOString(),
      };
      newFormation = formationAvecPrixRecalcule(newFormation);
      db.get('formations').push(newFormation).write();
      created.push(newFormation);
      logAudit(req, 'create', 'formation', newFormation.id, {
        etablissement_id: etabId,
        source: 'batch',
        filiere_id: newFormation.filiere_id,
        titre: newFormation.titre,
      });
      return;
    }

    const current = db.get('formations').find({ id }).value();
    if (!current || Number(current.etablissement_id) !== etabId) {
      errors.push({ index: idx, id, message: 'Formation introuvable pour cet établissement.' });
      return;
    }
    if (updates.type === 'en_ligne' && updates.ville === undefined) updates.ville = null;
    if (updates.type === 'presentiel' && updates.ville === null) updates.ville = current.ville || '';

    db.get('formations').find({ id }).assign(updates).write();
    let saved = db.get('formations').find({ id }).value();
    saved = formationAvecPrixRecalcule(saved);
    db.get('formations').find({ id }).assign({ prix: saved.prix }).write();
    saved = db.get('formations').find({ id }).value();
    updated.push(saved);
    logAudit(req, 'update', 'formation', id, { etablissement_id: etabId, source: 'batch', updates });
  });

  logAudit(req, 'batch_upsert', 'formation', null, {
    etablissement_id: etabId,
    requested: rawItems.length,
    updated: updated.length,
    created: created.length,
    errors: errors.length,
  });

  return res.json({
    message: `${updated.length} formation(s) modifiée(s), ${created.length} créée(s).`,
    updated,
    created,
    errors,
  });
});

// POST /api/etablissements/:etabId/formations/delete-batch
// body: { ids: number[], hard?: boolean }
router.post('/:etabId/formations/delete-batch', etabPedagogieWrite, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  if (Number.isNaN(etabId)) {
    return res.status(400).json({ message: 'Identifiant établissement invalide.' });
  }
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n))
    : [];
  if (ids.length === 0) {
    return res.status(400).json({ message: 'Liste des ids vide.' });
  }
  const hardRequested = ['1', 'true', 'yes', 'oui'].includes(String(req.body?.hard || '').toLowerCase());
  const hard = hardRequested && (req.user.role === 'admin' || req.user.role === 'directeur');

  const removed = [];
  const deactivated = [];
  const skipped = [];

  ids.forEach((id) => {
    const formation = db.get('formations').find({ id }).value();
    if (!formation || Number(formation.etablissement_id) !== etabId) {
      skipped.push(id);
      return;
    }
    if (hard) {
      detachFormationReferences(id);
      db.get('formations').remove({ id }).write();
      removed.push(id);
      logAudit(req, 'delete_hard', 'formation', id, { etablissement_id: etabId, source: 'batch' });
    } else {
      db.get('formations').find({ id }).assign({ actif: false, deleted_at: new Date().toISOString() }).write();
      deactivated.push(id);
      logAudit(req, 'deactivate', 'formation', id, { etablissement_id: etabId, source: 'batch' });
    }
  });

  logAudit(req, 'batch_delete', 'formation', null, {
    etablissement_id: etabId,
    hard,
    requested: ids.length,
    removed: removed.length,
    deactivated: deactivated.length,
    skipped: skipped.length,
  });

  return res.json({
    message: hard
      ? `${removed.length} formation(s) supprimée(s) définitivement.`
      : `${deactivated.length} formation(s) désactivée(s).`,
    hard,
    removed,
    deactivated,
    skipped,
  });
});

// DELETE /api/etablissements/:etabId/formations/:id
router.delete('/:etabId/formations/:id', etabPedagogieWrite, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id);
  const formation = db.get('formations').find({ id }).value();
  if (!formation || Number(formation.etablissement_id) !== etabId) {
    return res.status(404).json({ message: 'Formation introuvable.' });
  }

  // Mode production: suppression non destructive par défaut.
  // Suppression définitive: ?hard=true (admin uniquement).
  const hard = ['1', 'true', 'yes', 'oui'].includes(String(req.query.hard || '').toLowerCase());

  if (!hard) {
    db.get('formations').find({ id }).assign({ actif: false, deleted_at: new Date().toISOString() }).write();
    logAudit(req, 'deactivate', 'formation', id, { etablissement_id: etabId, source: 'single' });
    return res.json({ message: 'Formation désactivée (soft delete).' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'directeur') {
    return res.status(403).json({ message: 'Suppression définitive réservée à l’administrateur ou au directeur.' });
  }

  detachFormationReferences(id);
  db.get('formations').remove({ id }).write();
  logAudit(req, 'delete_hard', 'formation', id, { etablissement_id: etabId, source: 'single' });
  return res.json({ message: 'Formation supprimée définitivement.' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MEMBRES (utilisateurs rattachés à un établissement)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/etablissements/:id/membres (admin uniquement)
router.get('/:id/membres', adminOnly, (req, res) => {
  const etablissement_id = parseInt(req.params.id);
  const membres = db.get('utilisateurs')
    .filter((u) => u.etablissement_id === etablissement_id && isEtabStaffMember(u))
    .map(u => ({
      id: u.id,
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      telephone: u.telephone || '',
      adresse: u.adresse || '',
      matricule: u.matricule || null,
      role: u.role,
      actif: u.actif !== false,
      created_at: u.created_at,
    }))
    .value();
  res.json(membres);
});

// POST /api/etablissements/:id/membres — créer un compte membre (admin uniquement)
router.post('/:id/membres', adminOnly, (req, res) => {
  const etablissement_id = parseInt(req.params.id);
  const etab = db.get('etablissements').find({ id: etablissement_id }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

  const {
    prenom, nom, email, mot_de_passe, mot_de_passe_confirmation, role,
    date_naissance, telephone, adresse,
  } = req.body;
  if (!prenom || !nom || !email || !mot_de_passe || !role || !date_naissance || !telephone) {
    return res.status(400).json({
      message: 'Champs obligatoires : prénom, nom, email, date de naissance, téléphone, mot de passe, rôle.',
    });
  }
  if (mot_de_passe !== mot_de_passe_confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }

  const ROLES_AUTORISÉS = ['responsable', 'agent_admin', 'comptable', 'controleur_qualite', 'directeur'];
  if (!ROLES_AUTORISÉS.includes(role)) return res.status(400).json({ message: 'Rôle invalide.' });

  const gen = generateNextMatriculeForEtablissement(etablissement_id);
  if (gen.error) return res.status(400).json({ message: gen.error });
  const matNorm = normalizeMatricule(gen.matricule);

  const emailNorm = String(email).trim().toLowerCase();
  const exist = db.get('utilisateurs').find({ email: emailNorm }).value();
  if (exist) return res.status(400).json({ message: 'Email déjà utilisé.' });

  const telTrim = String(telephone).trim();
  const telNorm = normalizeTelephoneForUniqueness(telTrim);
  if (telNorm.length < 8) {
    return res.status(400).json({
      message: 'Numéro de téléphone invalide ou trop court (minimum 8 chiffres).',
    });
  }
  if (telephoneTaken(telNorm, null)) {
    return res.status(409).json({ message: 'Ce numéro de téléphone est déjà associé à un autre compte.' });
  }

  const hash = bcrypt.hashSync(mot_de_passe, 10);
  const id = db.nextId('utilisateurs');
  const user = {
    id,
    prenom: String(prenom).trim(),
    nom: String(nom).trim(),
    email: emailNorm,
    matricule: matNorm,
    date_naissance: date_naissance ? String(date_naissance).trim() : null,
    telephone: telTrim,
    adresse: adresse ? String(adresse).trim() : '',
    mot_de_passe: hash,
    role,
    etablissement_id,
    actif: true,
    must_change_password: true,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    created_at: new Date().toISOString(),
  };

  db.get('utilisateurs').push(user).write();
  res.status(201).json({
    id,
    prenom: user.prenom,
    nom: user.nom,
    email: user.email,
    matricule: user.matricule,
    role,
    etablissement_id,
    actif: true,
    must_change_password: true,
  });
});

// PUT /api/etablissements/:etabId/membres/:id — modifier (admin uniquement)
router.put('/:etabId/membres/:id', adminOnly, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(etabId) || Number.isNaN(id)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (user.etablissement_id !== etabId) {
    return res.status(404).json({ message: 'Ce membre n’appartient pas à cet établissement.' });
  }
  if (user.role === 'etudiant') {
    return res.status(400).json({ message: 'Les comptes étudiants ne sont pas gérés dans la liste des membres du staff.' });
  }

  const {
    role, actif, prenom, nom, email, telephone, adresse, mot_de_passe,
  } = req.body;
  const ROLES_STAFF = ['responsable', 'agent_admin', 'comptable', 'controleur_qualite', 'directeur'];
  const updates = { updated_at: new Date().toISOString() };

  if (role !== undefined) {
    if (!ROLES_STAFF.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide pour un membre du staff.' });
    }
    updates.role = role;
  }
  if (actif !== undefined) updates.actif = !!actif;
  if (prenom !== undefined) updates.prenom = String(prenom).trim();
  if (nom !== undefined) updates.nom = String(nom).trim();
  if (email !== undefined) {
    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }
    const exist = db.get('utilisateurs').find({ email: emailNorm }).value();
    if (exist && exist.id !== id) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }
    updates.email = emailNorm;
  }
  if (telephone !== undefined) {
    const telTrim = String(telephone).trim();
    const telNorm = normalizeTelephoneForUniqueness(telTrim);
    if (telNorm.length < 8) {
      return res.status(400).json({ message: 'Téléphone invalide ou trop court (8 chiffres min.).' });
    }
    if (telephoneTaken(telNorm, id)) {
      return res.status(409).json({ message: 'Ce numéro est déjà associé à un autre compte.' });
    }
    updates.telephone = telTrim;
  }
  if (adresse !== undefined) updates.adresse = adresse != null ? String(adresse).trim() : '';
  if (mot_de_passe != null && String(mot_de_passe).trim() !== '') {
    if (String(mot_de_passe).length < 6) {
      return res.status(400).json({ message: 'Mot de passe trop court (min. 6 caractères).' });
    }
    updates.mot_de_passe = bcrypt.hashSync(mot_de_passe, 10);
    updates.must_change_password = true;
  }

  db.get('utilisateurs').find({ id }).assign(updates).write();
  const fresh = db.get('utilisateurs').find({ id }).value();
  res.json({
    message: 'Membre mis à jour.',
    membre: {
      id: fresh.id,
      prenom: fresh.prenom,
      nom: fresh.nom,
      email: fresh.email,
      matricule: fresh.matricule,
      role: fresh.role,
      actif: fresh.actif !== false,
      telephone: fresh.telephone,
      adresse: fresh.adresse,
    },
  });
});

// DELETE /api/etablissements/:etabId/membres/:id — désactiver (soft) (admin uniquement)
router.delete('/:etabId/membres/:id', adminOnly, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id, 10);
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (user.etablissement_id !== etabId) {
    return res.status(404).json({ message: 'Ce membre n’appartient pas à cet établissement.' });
  }
  if (user.role === 'etudiant') {
    return res.status(400).json({ message: 'Les comptes étudiants ne font pas partie du staff de l’établissement.' });
  }
  db.get('utilisateurs').find({ id }).assign({ actif: false, updated_at: new Date().toISOString() }).write();
  res.json({ message: 'Compte désactivé.' });
});

// POST /api/etablissements/:etabId/membres/:id/supprimer-definitif — suppression base (admin uniquement)
router.post('/:etabId/membres/:id/supprimer-definitif', adminOnly, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id, 10);
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (user.etablissement_id !== etabId) {
    return res.status(404).json({ message: 'Ce membre n’appartient pas à cet établissement.' });
  }
  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Impossible de supprimer un administrateur depuis cet écran.' });
  }
  if (user.role === 'etudiant') {
    return res.status(400).json({ message: 'Opération réservée aux comptes staff.' });
  }
  const confirmation_email = String(req.body?.confirmation_email || '').trim().toLowerCase();
  const expected = String(user.email || '').trim().toLowerCase();
  if (!expected || confirmation_email !== expected) {
    return res.status(400).json({
      message: 'Saisissez l’adresse e-mail exacte du compte pour confirmer la suppression définitive.',
    });
  }
  db.get('utilisateurs').remove({ id }).write();
  res.json({ message: 'Compte supprimé définitivement.' });
});

module.exports = router;
