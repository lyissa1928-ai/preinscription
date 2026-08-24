const fs = require('fs');
const path = require('path');
const { isMaintenanceModeEnabled } = require('./maintenanceMode');
const { DB_PATH } = require('./dbBackup');

/**
 * Vérifications légères pour load balancers / monitoring (sans logique métier lourde).
 */
function checkJsonDatabaseFile() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { ok: false, error: 'preinscription.json missing' };
    }
    fs.accessSync(DB_PATH, fs.constants.R_OK | fs.constants.W_OK);
    const stat = fs.statSync(DB_PATH);
    if (!stat.isFile() || stat.size < 2) {
      return { ok: false, error: 'preinscription.json empty or invalid' };
    }
    return { ok: true, bytes: stat.size };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

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

function checkDiskSpace() {
  const minMb = parseInt(process.env.HEALTH_MIN_DISK_MB || '100', 10) || 100;
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const target = fs.existsSync(uploadsDir) ? uploadsDir : path.dirname(DB_PATH);
    // Node 18+ : fs.statfsSync
    if (typeof fs.statfsSync !== 'function') {
      return { ok: true, note: 'statfs unavailable' };
    }
    const st = fs.statfsSync(target);
    const freeBytes = Number(st.bavail) * Number(st.bsize);
    const freeMb = Math.floor(freeBytes / (1024 * 1024));
    const ok = freeMb >= minMb;
    return {
      ok,
      free_mb: freeMb,
      min_required_mb: minMb,
      ...(ok ? {} : { error: `disk free ${freeMb}MB < ${minMb}MB` }),
    };
  } catch (e) {
    return { ok: true, note: `disk check skipped: ${e.message}` };
  }
}

function checkSocketIo() {
  try {
    const { getIO } = require('../socket/chatSocket');
    const io = getIO();
    if (!io) {
      return { ok: true, note: 'not_initialized' };
    }
    const nsp = io.of('/');
    const clients = nsp ? nsp.sockets.size : 0;
    return { ok: true, connected_clients: clients };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function checkMaintenanceMode() {
  const enabled = isMaintenanceModeEnabled();
  return { ok: true, enabled };
}

function runHealthChecks() {
  const json_file = checkJsonDatabaseFile();
  const database = checkDatabaseReadable();
  const uploads = checkUploadsDir();
  const chat_file = checkChatFileReadable();
  const disk = checkDiskSpace();
  const socket_io = checkSocketIo();
  const maintenance = checkMaintenanceMode();
  const ok =
    json_file.ok &&
    database.ok &&
    uploads.ok &&
    chat_file.ok &&
    disk.ok &&
    socket_io.ok;
  return {
    ok,
    json_file,
    database,
    uploads,
    chat_file,
    disk,
    socket_io,
    maintenance,
  };
}

module.exports = {
  runHealthChecks,
  checkJsonDatabaseFile,
  checkDatabaseReadable,
  checkUploadsDir,
  checkChatFileReadable,
  checkDiskSpace,
  checkSocketIo,
  checkMaintenanceMode,
};
