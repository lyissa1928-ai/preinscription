const db = require('../database/db');

/**
 * Journal d'audit minimal et robuste (best-effort, ne bloque jamais l'action métier).
 */
function logAudit(req, action, entity, entityId, details = null) {
  try {
    const id = db.nextId('audit_logs');
    const user = req?.user || {};
    const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null;
    db.get('audit_logs').push({
      id,
      action: String(action || '').trim() || 'unknown_action',
      entity: String(entity || '').trim() || 'unknown_entity',
      entity_id: entityId ?? null,
      user_id: user.id || null,
      user_role: user.role || null,
      etablissement_id: user.etablissement_id || null,
      method: req?.method || null,
      path: req?.originalUrl || req?.url || null,
      ip: typeof ip === 'string' ? ip.split(',')[0].trim() : null,
      details: details || null,
      created_at: new Date().toISOString(),
    }).write();
  } catch {
    // Ne jamais interrompre le flux principal sur un échec de log.
  }
}

module.exports = { logAudit };

