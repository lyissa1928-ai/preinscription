/**
 * Vérifie le chargement des bases JSON (preinscription + chat).
 * Usage : npm run db:check
 */
process.env.SKIP_DB_AUTOSTART_BACKUP = '1';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../database/db');
const { chatDb } = require('../database/chatStore');

const COLLECTIONS = [
  'etablissements',
  'filieres',
  'formations',
  'utilisateurs',
  'dossiers',
  'documents',
  'factures',
  'demandes_proforma',
  'notifications',
  'audit_logs',
  'security_events',
  'conditions_admission',
];

function countArr(getter) {
  const v = getter();
  return Array.isArray(v) ? v.length : `(non-tableau: ${typeof v})`;
}

console.log('Base preinscription.json');
for (const col of COLLECTIONS) {
  const n = countArr(() => db.get(col).value());
  console.log(`  ${col}: ${n}`);
}

const nextKeys = [
  'etablissements',
  'filieres',
  'formations',
  'utilisateurs',
  'dossiers',
  'documents',
  'factures',
  'demandes_proforma',
  'notifications',
  'audit_logs',
  'security_events',
  'conditions_admission',
];
console.log('Compteurs _nextId');
for (const k of nextKeys) {
  const v = db.get(`_nextId.${k}`).value();
  console.log(`  ${k}: ${v}`);
}

console.log('Base chat.json');
console.log(`  messages: ${countArr(() => chatDb.get('messages').value())}`);
console.log(`  conversations: ${countArr(() => chatDb.get('conversations').value())}`);
console.log(`  reads: ${countArr(() => chatDb.get('reads').value())}`);
console.log(`  _nextId.messages: ${chatDb.get('_nextId.messages').value()}`);

console.log('OK — bases chargées.');
