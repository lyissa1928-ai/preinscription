const fs = require('fs');
const path = require('path');

/**
 * Vérifications légères pour load balancers / monitoring (sans logique métier lourde).
 */
function checkUploadsDir() {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      return { ok: false, error: 'uploads directory missing' };
    }
    fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function checkDatabaseReadable() {
  try {
    const db = require('../database/db');
    const v = db.get('etablissements').value();
    if (!Array.isArray(v)) {
      return { ok: false, error: 'etablissements is not an array' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function checkChatFileReadable() {
  const p = path.join(__dirname, '..', 'database', 'chat.json');
  try {
    if (!fs.existsSync(p)) return { ok: true, note: 'absent' };
    fs.accessSync(p, fs.constants.R_OK);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function runHealthChecks() {
  const database = checkDatabaseReadable();
  const uploads = checkUploadsDir();
  const chat_file = checkChatFileReadable();
  const ok = database.ok && uploads.ok && chat_file.ok;
  return { ok, database, uploads, chat_file };
}

module.exports = {
  runHealthChecks,
  checkDatabaseReadable,
  checkUploadsDir,
  checkChatFileReadable,
};
