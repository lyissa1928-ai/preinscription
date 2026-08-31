/**
 * Adaptateur lowdb — délègue au singleton existant sans dupliquer la logique d’initialisation.
 */

const db = require('../db');

function collection(name) {
  return db.get(name);
}

function readCollection(name) {
  const v = db.get(name).value();
  return Array.isArray(v) ? v : v ?? [];
}

function writeCollection(name, rows) {
  db.set(name, rows).write();
}

function nextId(collectionName) {
  if (typeof db.nextId === 'function') return db.nextId(collectionName);
  throw new Error('nextId non disponible sur l’adaptateur lowdb');
}

module.exports = {
  driver: 'lowdb',
  collection,
  readCollection,
  writeCollection,
  nextId,
  raw: () => db,
};
