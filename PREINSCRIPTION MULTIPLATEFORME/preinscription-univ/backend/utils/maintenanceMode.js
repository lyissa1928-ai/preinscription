/**
 * Mode maintenance applicatif (variable d’environnement).
 * Les routes publiques de santé restent accessibles ; le staff admin peut continuer à travailler.
 */

function isMaintenanceModeEnabled() {
  const v = String(process.env.MAINTENANCE_MODE || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function getMaintenanceMessage() {
  return (
    process.env.MAINTENANCE_MESSAGE ||
    'Le portail est temporairement en maintenance. Réessayez dans quelques minutes.'
  );
}

module.exports = {
  isMaintenanceModeEnabled,
  getMaintenanceMessage,
};
