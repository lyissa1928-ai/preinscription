const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'preinscription.json');
const BACKUP_DIR = path.join(__dirname, '..', 'database', 'backups');

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
  fs.copyFileSync(DB_PATH, backupPath);
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

module.exports = {
  DB_PATH,
  BACKUP_DIR,
  createBackup,
  pruneBackups,
};

