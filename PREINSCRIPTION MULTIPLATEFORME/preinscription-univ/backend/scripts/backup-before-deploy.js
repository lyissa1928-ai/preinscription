/**
 * Sauvegarde complète avant déploiement (base + uploads).
 * Usage : node backend/scripts/backup-before-deploy.js
 */
process.env.SKIP_DB_AUTOSTART_BACKUP = '1';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const fs = require('fs');
const { runFullBackup, DB_PATH } = require('../utils/dbBackup');

function countCollection(name) {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(raw);
    const arr = data[name];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return null;
  }
}

const stats = {
  utilisateurs: countCollection('utilisateurs'),
  factures: countCollection('factures'),
  dossiers: countCollection('dossiers'),
  etablissements: countCollection('etablissements'),
};

const result = runFullBackup('deploy');
console.log(JSON.stringify({ stats, backup: result }, null, 2));
