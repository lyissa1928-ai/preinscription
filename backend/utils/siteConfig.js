const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../database/db');
const { publicAssetUrl, normalizeAssetPath } = require('./publicAssetUrl');
const { verifyDiskFile } = require('./verifyUploadedFile');

const PLATFORM_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'platform');
if (!fs.existsSync(PLATFORM_UPLOAD_DIR)) {
  fs.mkdirSync(PLATFORM_UPLOAD_DIR, { recursive: true });
}

const DEFAULT_SITE_CONFIG = {
  platform_name: 'Préinscription Universitaire',
  favicon_url: null,
  platform_logo_url: null,
  updated_at: null,
};

function getSiteConfigRaw() {
  const stored = db.get('site_config').value();
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SITE_CONFIG };
  return { ...DEFAULT_SITE_CONFIG, ...stored };
}

function getSiteConfigForClient(req) {
  const raw = getSiteConfigRaw();
  return {
    platform_name: raw.platform_name || DEFAULT_SITE_CONFIG.platform_name,
    favicon_url: publicAssetUrl(req, raw.favicon_url),
    platform_logo_url: publicAssetUrl(req, raw.platform_logo_url),
    updated_at: raw.updated_at || null,
  };
}

function updateSiteConfig(patch) {
  const current = getSiteConfigRaw();
  const next = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  db.set('site_config', next).write();
  return next;
}

const platformUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PLATFORM_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      const base = file.fieldname === 'favicon' ? 'favicon' : 'platform-logo';
      cb(null, `${base}${ext}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.ico', '.png', '.svg', '.webp', '.jpg', '.jpeg'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

async function verifyPlatformFile(file, kind) {
  const fullPath = path.join(PLATFORM_UPLOAD_DIR, file.filename);
  const v = await verifyDiskFile(fullPath, file.originalname, kind === 'favicon' ? 'etab' : 'etab');
  if (!v.ok) {
    try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
    return v;
  }
  return { ok: true, fullPath };
}

function removeOldPlatformFile(storedUrl, prefix) {
  const rel = normalizeAssetPath(storedUrl);
  if (!rel || !rel.startsWith('/uploads/platform/')) return;
  const name = path.basename(rel);
  if (!name.startsWith(prefix)) return;
  const abs = path.join(PLATFORM_UPLOAD_DIR, name);
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch { /* ignore */ }
}

module.exports = {
  DEFAULT_SITE_CONFIG,
  PLATFORM_UPLOAD_DIR,
  getSiteConfigRaw,
  getSiteConfigForClient,
  updateSiteConfig,
  platformUpload,
  verifyPlatformFile,
  removeOldPlatformFile,
};
