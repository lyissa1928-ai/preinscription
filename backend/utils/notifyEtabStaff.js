const db = require('../database/db');
const { createUserNotification } = require('./notificationService');

const STAFF_ROLES_ETAB = new Set([
  'admin_etablissement',
  'responsable',
  'agent_admin',
  'comptable',
  'controleur_qualite',
]);

/**
 * Notifie tous les membres staff actifs rattachés à un établissement.
 */
function notifyEtabStaff(etabId, payload) {
  if (etabId == null) return [];
  const eid = Number(etabId);
  const users = (db.get('utilisateurs').value() || []).filter(
    (u) =>
      u.actif !== false &&
      STAFF_ROLES_ETAB.has(u.role) &&
      Number(u.etablissement_id) === eid,
  );
  const sent = [];
  users.forEach((u) => {
    const n = createUserNotification(u.id, payload);
    if (n) sent.push(n);
  });
  return sent;
}

module.exports = { notifyEtabStaff, STAFF_ROLES_ETAB };
