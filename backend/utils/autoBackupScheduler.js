const { runFullBackup } = require('./dbBackup');

let timer = null;

function backupIntervalMs() {
  const hours = parseInt(process.env.BACKUP_INTERVAL_HOURS || '6', 10);
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return hours * 60 * 60 * 1000;
}

function startAutoBackupScheduler() {
  if (process.env.DISABLE_AUTO_BACKUP === '1') return null;
  const ms = backupIntervalMs();
  if (!ms) return null;

  const tick = () => {
    try {
      const r = runFullBackup('scheduled');
      console.log(`[BACKUP] scheduled: db=${r.dbPath} uploads=${r.uploadsPath}`);
    } catch (e) {
      console.warn('[BACKUP] scheduled failed:', e.message);
    }
  };

  timer = setInterval(tick, ms);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

function stopAutoBackupScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  startAutoBackupScheduler,
  stopAutoBackupScheduler,
  backupIntervalMs,
};
