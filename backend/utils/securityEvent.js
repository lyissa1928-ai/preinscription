const db = require('../database/db');

function getClientIp(req) {
  const fwd = req?.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req?.socket?.remoteAddress || req?.ip || 'unknown';
}

function logSecurityEvent(req, type, details = {}, severity = 'warning') {
  try {
    const id = db.nextId('security_events');
    db.get('security_events').push({
      id,
      type: String(type || 'unknown_security_event'),
      severity: String(severity || 'warning'),
      user_id: req?.user?.id || null,
      user_role: req?.user?.role || null,
      method: req?.method || null,
      path: req?.originalUrl || req?.url || null,
      ip: req ? getClientIp(req) : null,
      details: details || null,
      created_at: new Date().toISOString(),
    }).write();
  } catch {
    // Best effort: ne jamais casser le flux métier.
  }
}

module.exports = { logSecurityEvent };

