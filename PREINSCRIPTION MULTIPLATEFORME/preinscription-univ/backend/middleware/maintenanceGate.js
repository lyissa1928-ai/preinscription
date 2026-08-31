const { isMaintenanceModeEnabled, getMaintenanceMessage } = require('../utils/maintenanceMode');

/**
 * Bloque les requêtes API (sauf santé) en mode maintenance.
 * Les administrateurs connectés (header Authorization valide côté route) ne sont pas bloqués ici :
 * le gate est appliqué avant auth — on autorise /api/auth/login et /api/health.
 */
function maintenanceGate(req, res, next) {
  if (!isMaintenanceModeEnabled()) return next();

  const p = req.path || '';
  if (p === '/api/health' || p === '/health') return next();
  if (
    p.startsWith('/api/auth/connexion')
    || p.startsWith('/api/auth/refresh')
    || p.startsWith('/api/auth/login')
  ) return next();
  // Staff admin peut opérer pendant la maintenance (JWT requis sur chaque route).
  if (p.startsWith('/api/admin')) return next();

  return res.status(503).json({
    maintenance: true,
    message: getMaintenanceMessage(),
  });
}

module.exports = { maintenanceGate };
