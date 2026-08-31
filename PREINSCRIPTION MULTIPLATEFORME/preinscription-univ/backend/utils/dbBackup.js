const fs = require('fs');
const path = require('path');
const { runWithDbLockSync } = require('./dbWriteQueue');

const DB_PATH = path.join(__dirname, '..', 'database', 'preinscription.json');
const BACKUP_DIR = path.join(__dirname, '..', 'database', 'backups');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const UPLOADS_BACKUP_DIR = path.join(BACKUP_DIR, 'uploads');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function stamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function createBackup(label = 'manual') {
  ensureBackupDir();
  const fileName = `preinscription-${label}-${stamp()}.json`;
  const backupPath = path.join(BACKUP_DIR, fileName);
  runWithDbLockSync(DB_PATH, () => {
    fs.copyFileSync(DB_PATH, backupPath);
  });
  return backupPath;
}

function pruneBackups(maxFiles = 50) {
  ensureBackupDir();
  const all = fs.readdirSync(BACKUP_DIR)
    .filter((n) => n.startsWith('preinscription-') && n.endsWith('.json'))
    .map((n) => ({ name: n, path: path.join(BACKUP_DIR, n), stat: fs.statSync(path.join(BACKUP_DIR, n)) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  const toDelete = all.slice(maxFiles);
  toDelete.forEach((f) => {
    try { fs.unlinkSync(f.path); } catch (_) {}
  });

  return { kept: Math.min(all.length, maxFiles), removed: toDelete.length };
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function createUploadsBackup(label = 'manual') {
  ensureBackupDir();
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_BACKUP_DIR)) {
    fs.mkdirSync(UPLOADS_BACKUP_DIR, { recursive: true });
  }
  const dirName = `uploads-${label}-${stamp()}`;
  const backupPath = path.join(UPLOADS_BACKUP_DIR, dirName);
  copyDirRecursive(UPLOADS_DIR, backupPath);
  return backupPath;
}

function pruneUploadsBackups(maxDirs = 20) {
  ensureBackupDir();
  if (!fs.existsSync(UPLOADS_BACKUP_DIR)) return { kept: 0, removed: 0 };
  const all = fs.readdirSync(UPLOADS_BACKUP_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('uploads-'))
    .map((e) => {
      const p = path.join(UPLOADS_BACKUP_DIR, e.name);
      return { name: e.name, path: p, stat: fs.statSync(p) };
    })
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  const toDelete = all.slice(maxDirs);
  toDelete.forEach((f) => {
    try {
      fs.rmSync(f.path, { recursive: true, force: true });
    } catch (_) {}
  });
  return { kept: Math.min(all.length, maxDirs), removed: toDelete.length };
}

function runFullBackup(label = 'scheduled') {
  const dbPath = createBackup(label);
  const uploadsPath = createUploadsBackup(label);
  const dbPrune = pruneBackups(
    parseInt(process.env.BACKUP_MAX_FILES || '80', 10) || 80
  );
  const uploadsPrune = pruneUploadsBackups(
    parseInt(process.env.BACKUP_UPLOADS_MAX_DIRS || '20', 10) || 20
  );
  return { dbPath, uploadsPath, dbPrune, uploadsPrune };
}

module.exports = {
  DB_PATH,
  BACKUP_DIR,
  UPLOADS_DIR,
  UPLOADS_BACKUP_DIR,
  createBackup,
  createUploadsBackup,
  pruneBackups,
  pruneUploadsBackups,
  runFullBackup,
};

