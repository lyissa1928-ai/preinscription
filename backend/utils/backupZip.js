const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const multer = require('multer');
const { DB_PATH } = require('./dbBackup');
const { runWithDbLockSync } = require('./dbWriteQueue');

const DONNEES_ENTRY = 'donnees.json';
const MANIFEST_ENTRY = 'manifest.json';
const PLATFORM_DB_ENTRY = 'preinscription.json';
const README_ENTRY = 'LISEZMOI.txt';

const backupZipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    const ok =
      name.endsWith('.zip') ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed';
    cb(ok ? null : new Error('Seuls les fichiers .zip sont acceptés.'), ok);
  },
});

function stamp() {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

function buildReadme(manifest) {
  const lines = [
    'UniPortail — archive de sauvegarde',
    '================================',
    '',
    `Généré le : ${manifest.exported_at || new Date().toISOString()}`,
    `Type : ${manifest.export_type || 'inconnu'}`,
    '',
    'Contenu de l’archive :',
    `- ${MANIFEST_ENTRY} — description de la sauvegarde`,
  ];
  if (manifest.export_type === 'plateforme') {
    lines.push(`- ${PLATFORM_DB_ENTRY} — base complète (utilisateurs, dossiers, formations…)`);
  } else {
    lines.push(`- ${DONNEES_ENTRY} — export JSON structuré`);
  }
  lines.push('', 'Restauration : utilisez « Restaurer depuis un fichier » dans l’application (fichier .zip).');
  lines.push('Un backup automatique est créé avant toute restauration.');
  lines.push('', 'Mise à jour production : vos données restent intactes (migrations additives + skip-worktree git).');
  return lines.join('\n');
}

function createZipBuffer(files) {
  const zip = new AdmZip();
  for (const { name, content, isJson } of files) {
    const buf = isJson
      ? Buffer.from(JSON.stringify(content, null, 2), 'utf8')
      : Buffer.from(String(content), 'utf8');
    zip.addFile(name, buf);
  }
  return zip.toBuffer();
}

/** Export utilisateur / établissement → ZIP avec donnees.json */
function buildUserDataZip(donnees, manifestExtra = {}) {
  const manifest = {
    format: 'uniportail-backup-zip',
    format_version: 1,
    exported_at: new Date().toISOString(),
    export_type: donnees._exportType || 'donnees',
    ...manifestExtra,
    entries: [MANIFEST_ENTRY, DONNEES_ENTRY, README_ENTRY],
    included: manifestExtra.included || [],
    excluded: manifestExtra.excluded || [],
  };
  return {
    buffer: createZipBuffer([
      { name: MANIFEST_ENTRY, content: manifest, isJson: true },
      { name: DONNEES_ENTRY, content: donnees, isJson: true },
      { name: README_ENTRY, content: buildReadme(manifest), isJson: false },
    ]),
    filename: `uniportail-${donnees._exportType || 'donnees'}-${stamp()}.zip`,
    manifest,
  };
}

/** Export admin plateforme → ZIP avec preinscription.json */
function buildPlatformBackupZip(sourceJsonPath = DB_PATH) {
  if (!fs.existsSync(sourceJsonPath)) {
    throw new Error('Base de données introuvable.');
  }
  const raw = fs.readFileSync(sourceJsonPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Base de données JSON invalide.');
  }
  const manifest = {
    format: 'uniportail-backup-zip',
    format_version: 1,
    exported_at: new Date().toISOString(),
    export_type: 'plateforme',
    entries: [MANIFEST_ENTRY, PLATFORM_DB_ENTRY, README_ENTRY],
    included: [
      'Utilisateurs, établissements, formations, dossiers, factures, documents (métadonnées)',
      'Historique migrations (_schemaVersion, _migrations)',
    ],
    excluded: [
      'Dossier uploads/ (pièces jointes) — sauvegarde séparée sur le serveur',
      'Mots de passe en clair (stockés hachés dans la base)',
    ],
  };
  const zip = new AdmZip();
  zip.addFile(MANIFEST_ENTRY, Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
  zip.addFile(PLATFORM_DB_ENTRY, Buffer.from(raw, 'utf8'));
  zip.addFile(README_ENTRY, Buffer.from(buildReadme(manifest), 'utf8'));
  return {
    buffer: zip.toBuffer(),
    filename: `uniportail-plateforme-${stamp()}.zip`,
    manifest,
    parsed,
  };
}

function findZipEntry(zip, names) {
  const list = zip.getEntries();
  for (const name of names) {
    const exact = list.find((e) => !e.isDirectory && e.entryName === name);
    if (exact) return exact;
  }
  for (const name of names) {
    const suffix = list.find(
      (e) => !e.isDirectory && e.entryName.replace(/\\/g, '/').endsWith(`/${name}`),
    );
    if (suffix) return suffix;
  }
  return null;
}

/** Lit un ZIP uploadé → { kind: 'donnees'|'plateforme', payload } */
function parseUploadedBackupZip(buffer) {
  if (!buffer || !buffer.length) {
    throw new Error('Fichier ZIP vide ou manquant.');
  }
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new Error('Archive ZIP invalide ou corrompue.');
  }

  const platformEntry = findZipEntry(zip, [PLATFORM_DB_ENTRY]);
  if (platformEntry) {
    const text = platformEntry.getData().toString('utf8');
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`${PLATFORM_DB_ENTRY} illisible dans le ZIP.`);
    }
    return { kind: 'plateforme', payload };
  }

  const donneesEntry = findZipEntry(zip, [DONNEES_ENTRY]);
  if (!donneesEntry) {
    throw new Error(`Archive incompatible : attendu ${DONNEES_ENTRY} ou ${PLATFORM_DB_ENTRY}.`);
  }
  const text = donneesEntry.getData().toString('utf8');
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${DONNEES_ENTRY} illisible dans le ZIP.`);
  }
  return { kind: 'donnees', payload };
}

/** Restauration complète plateforme (admin) — remplace preinscription.json */
function restorePlatformDatabaseFromObject(dbObject) {
  if (!dbObject || typeof dbObject !== 'object') {
    throw new Error('Contenu de base invalide.');
  }
  runWithDbLockSync(DB_PATH, () => {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbObject, null, 2), 'utf8');
  });
  const db = require('../database/db');
  if (typeof db.read === 'function') db.read();
  return DB_PATH;
}

function sendZipDownload(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
}

function handleBackupUpload(fieldName = 'backup') {
  return (req, res, next) => {
    backupZipUpload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Fichier ZIP invalide.' });
      }
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ message: 'Fichier ZIP requis.' });
      }
      next();
    });
  };
}

function isRestoreConfirmed(body) {
  const v = body?.confirm;
  return v === true || v === 'true' || v === '1' || v === 1;
}

module.exports = {
  DONNEES_ENTRY,
  PLATFORM_DB_ENTRY,
  backupZipUpload,
  buildUserDataZip,
  buildPlatformBackupZip,
  parseUploadedBackupZip,
  restorePlatformDatabaseFromObject,
  sendZipDownload,
  handleBackupUpload,
  isRestoreConfirmed,
};
