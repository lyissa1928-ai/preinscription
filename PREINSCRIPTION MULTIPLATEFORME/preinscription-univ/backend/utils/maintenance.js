const db = require('../database/db');
const { pruneBackups } = require('./dbBackup');

function toPositiveInt(v, fallback) {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseDateSafe(v) {
  const t = new Date(v || '').getTime();
  return Number.isFinite(t) ? t : null;
}

function retentionConfigFromEnv() {
  return {
    audit_logs_days: toPositiveInt(process.env.RETENTION_AUDIT_LOG_DAYS, 180),
    security_events_days: toPositiveInt(process.env.RETENTION_SECURITY_EVENT_DAYS, 180),
    notifications_days: toPositiveInt(process.env.RETENTION_NOTIFICATION_DAYS, 90),
    read_notifications_days: toPositiveInt(process.env.RETENTION_READ_NOTIFICATION_DAYS, 30),
    backup_max_files: toPositiveInt(process.env.BACKUP_MAX_FILES, 80),
  };
}

function purgeOlderThan(collectionName, cutoffTs, field = 'created_at', dryRun = false) {
  const rows = db.get(collectionName).value() || [];
  const before = rows.length;
  const keepIds = new Set(
    rows
      .filter((r) => {
        const ts = parseDateSafe(r[field]);
        return ts == null || ts >= cutoffTs;
      })
      .map((r) => r.id)
  );
  if (!dryRun) {
    db.set(collectionName, rows.filter((r) => keepIds.has(r.id))).write();
  }
  return { before, after: keepIds.size, removed: before - keepIds.size };
}

function purgeReadNotificationsOlderThan(cutoffTs, dryRun = false) {
  const rows = db.get('notifications').value() || [];
  const before = rows.length;
  const filtered = rows.filter((n) => {
    if (!n.read_at) return true;
    const ts = parseDateSafe(n.read_at) ?? parseDateSafe(n.created_at);
    return ts == null || ts >= cutoffTs;
  });
  if (!dryRun) {
    db.set('notifications', filtered).write();
  }
  return { before, after: filtered.length, removed: before - filtered.length };
}

function runMaintenancePrune(customConfig = null, options = {}) {
  const cfg = customConfig || retentionConfigFromEnv();
  const dryRun = options.dryRun === true;
  const now = Date.now();

  const auditCutoff = now - cfg.audit_logs_days * 24 * 60 * 60 * 1000;
  const securityCutoff = now - cfg.security_events_days * 24 * 60 * 60 * 1000;
  const notifCutoff = now - cfg.notifications_days * 24 * 60 * 60 * 1000;
  const notifReadCutoff = now - cfg.read_notifications_days * 24 * 60 * 60 * 1000;

  const results = {
    dry_run: dryRun,
    generated_at: new Date(now).toISOString(),
    config: cfg,
    audit_logs: purgeOlderThan('audit_logs', auditCutoff, 'created_at', dryRun),
    security_events: purgeOlderThan('security_events', securityCutoff, 'created_at', dryRun),
    notifications: purgeOlderThan('notifications', notifCutoff, 'created_at', dryRun),
    notifications_read: purgeReadNotificationsOlderThan(notifReadCutoff, dryRun),
    backups: dryRun ? { kept: null, removed: null, simulated_max_files: cfg.backup_max_files } : pruneBackups(cfg.backup_max_files),
  };
  results.total_removed = [
    results.audit_logs.removed,
    results.security_events.removed,
    results.notifications.removed,
    results.notifications_read.removed,
    results.backups.removed || 0,
  ].reduce((a, b) => a + b, 0);
  return results;
}

module.exports = { retentionConfigFromEnv, runMaintenancePrune };

