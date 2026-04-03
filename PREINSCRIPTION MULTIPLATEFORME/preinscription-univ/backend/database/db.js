const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');
const path = require('path');
const { createBackup, pruneBackups } = require('../utils/dbBackup');

const adapter = new FileSync(path.join(__dirname, 'preinscription.json'));
const db = low(adapter);

// Backup automatique à chaque démarrage backend (protection anti-perte).
try {
  const backupPath = createBackup('autostart');
  pruneBackups(80);
  console.log(`💾 Backup auto créé: ${backupPath}`);
} catch (e) {
  console.warn('⚠️ Impossible de créer le backup auto:', e.message);
}

// Initialiser la structure
db.defaults({
  etablissements: [],
  filieres: [],
  utilisateurs: [],
  dossiers: [],
  documents: [],
  formations: [],
  factures: [],
  demandes_proforma: [],
  notifications: [],
  audit_logs: [],
  security_events: [],
  _nextId: { etablissements: 1, filieres: 1, formations: 1, utilisateurs: 1, dossiers: 1, documents: 1, factures: 1, demandes_proforma: 1, notifications: 1, audit_logs: 1, security_events: 1 }
}).write();

// Les formations ne sont pas préremplies : elles sont créées par l’admin / le responsable (par établissement).

// ─── Comptes système par défaut ─────────────────────────────────────────────

// Admin
const adminExist = db.get('utilisateurs').find({ role: 'admin' }).value();
if (!adminExist) {
  const hash = bcrypt.hashSync('Admin123!', 10);
  const id = db.get('_nextId.utilisateurs').value();
  db.get('utilisateurs').push({
    id, nom: 'Admin', prenom: 'Système',
    email: 'admin@universite.sn',
    mot_de_passe: hash, role: 'admin',
    matricule: `ADM-${String(id).padStart(6, '0')}`,
    date_naissance: null,
    telephone: '',
    adresse: '',
    must_change_password: false,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    created_at: new Date().toISOString()
  }).write();
  db.set('_nextId.utilisateurs', id + 1).write();
  console.log('✅ Admin : admin@universite.sn / Admin123!');
}

// Note : les comptes staff (responsable, agent_admin, comptable, directeur)
// doivent être créés par l'admin via l'interface, car ils nécessitent
// un établissement_id valide. Pas de seeding automatique pour ces rôles.

// S'assurer que tous les compteurs _nextId existent
['etablissements', 'filieres', 'formations', 'utilisateurs', 'dossiers', 'documents', 'factures', 'demandes_proforma', 'notifications', 'audit_logs', 'security_events'].forEach(col => {
  const v = db.get(`_nextId.${col}`).value();
  if (!v || typeof v !== 'number') {
    // Calculer le prochain ID à partir des données existantes
    const existant = db.get(col).value() || [];
    const max = existant.length > 0 ? Math.max(...existant.map(r => r.id || 0)) : 0;
    db.set(`_nextId.${col}`, max + 1).write();
  }
});

// Helper ID auto-incrémenté
db.nextId = (collection) => {
  const id = db.get(`_nextId.${collection}`).value() || 1;
  db.set(`_nextId.${collection}`, id + 1).write();
  return id;
};

// ─── Migration : matricule / flags pour comptes existants (rétrocompatibilité) ─
(() => {
  const users = db.get('utilisateurs').value() || [];
  users.forEach((u) => {
    if (u.matricule && String(u.matricule).trim()) return;
    const prefix = u.role === 'admin' ? 'ADM' : 'LEG';
    const matricule = `${prefix}-${String(u.id).padStart(6, '0')}`;
    db.get('utilisateurs').find({ id: u.id }).assign({
      matricule,
      must_change_password: u.must_change_password === true,
      date_naissance: u.date_naissance !== undefined ? u.date_naissance : null,
      telephone: u.telephone !== undefined ? u.telephone : '',
      adresse: u.adresse !== undefined ? u.adresse : '',
    }).write();
  });
})();

// ─── Migration : verrouillage compte (tentatives / blocage) ─────────────────
(() => {
  const users = db.get('utilisateurs').value() || [];
  users.forEach((u) => {
    const patch = {};
    if (u.login_attempts === undefined) patch.login_attempts = 0;
    if (u.is_locked === undefined) patch.is_locked = false;
    if (u.lock_until === undefined) patch.lock_until = null;
    if (Object.keys(patch).length) {
      db.get('utilisateurs').find({ id: u.id }).assign(patch).write();
    }
  });
})();

module.exports = db;

// Après migration LEG/ADM : passer au format établissement (EFO001, …) pour les comptes rattachés
try {
  const { backfillMatriculesFromEstablishments } = require('../utils/backfillMatricules');
  backfillMatriculesFromEstablishments();
} catch (e) {
  console.warn('⚠️ Backfill matricules établissement :', e.message);
}

