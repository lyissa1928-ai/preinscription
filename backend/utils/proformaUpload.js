const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { unlinkQuiet } = require('./verifyUploadedFile');

const uploadsDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.bin';
    cb(null, `tmp_${Date.now()}_${Math.round(Math.random() * 1e12)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Format non autorisé. Utilisez PDF, JPG ou PNG'));
  },
});

const proformaJustificatifFieldsCompte = [
  { name: 'justificatif_diplome', maxCount: 1 },
  { name: 'justificatif_releve', maxCount: 1 },
  { name: 'justificatif_formation', maxCount: 1 },
];

const proformaJustificatifFieldsPublic = [
  { name: 'justificatif_identite', maxCount: 1 },
  { name: 'justificatif_diplome', maxCount: 1 },
];

function cleanupProformaUploads(files) {
  if (!files) return;
  Object.values(files).forEach((arr) => {
    if (arr?.[0]?.path) unlinkQuiet(arr[0].path);
  });
}

function persistProformaJustificatif(file, demandeId, kind) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const safe = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.pdf';
  const dir = path.join(__dirname, '../uploads/proforma-justificatifs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const base = `demande-${demandeId}-${kind}${safe}`;
  const dest = path.join(dir, base);
  fs.renameSync(file.path, dest);
  return `proforma-justificatifs/${base}`;
}

module.exports = {
  upload,
  proformaJustificatifFieldsCompte,
  proformaJustificatifFieldsPublic,
  cleanupProformaUploads,
  persistProformaJustificatif,
};
