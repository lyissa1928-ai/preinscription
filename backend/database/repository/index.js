/**
 * Couche d’abstraction données (P2 — préparation PostgreSQL/Prisma).
 * Implémentation actuelle : lowdb (JSON). Les routes existantes continuent d’utiliser `require('../database/db')`.
 * Nouveau code ou refactors progressifs peuvent passer par ce module.
 */

const lowdbAdapter = require('./lowdbAdapter');

let _instance = lowdbAdapter;

function getRepository() {
  return _instance;
}

/** Réservé aux tests ou à une future bascule Prisma */
function setRepository(adapter) {
  _instance = adapter;
}

module.exports = {
  getRepository,
  setRepository,
};
