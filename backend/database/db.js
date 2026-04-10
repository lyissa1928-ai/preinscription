const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');
const path = require('path');
const { createBackup, pruneBackups } = require('../utils/dbBackup');

const DB_PATH = path.join(__dirname, 'preinscription.json');
const adapter = new FileSync(DB_PATH);
let db;
try {
  db = low(adapter);
} catch (e) {
  console.error(
    `❌ Impossible de lire la base ${DB_PATH} (JSON invalide ou fichier inaccessible). ` +
      `Restaurez une copie depuis database/backups/ puis relancez.\n`,
    e.message
  );
  throw e;
}

// Backup automatique à chaque démarrage — sauf si le catalogue est entièrement vide :
// sinon on multiplie les snapshots vides et pruneBackups peut supprimer d’anciennes sauvegardes utiles.
const _etabN = (db.get('etablissements').value() || []).length;
const _filN = (db.get('filieres').value() || []).length;
const _formN = (db.get('formations').value() || []).length;
const _catalogEmpty = _etabN === 0 && _filN === 0 && _formN === 0;

try {
  if (process.env.SKIP_DB_AUTOSTART_BACKUP === '1') {
    // ex. npm run db:check — évite une sauvegarde à chaque contrôle
  } else if (_catalogEmpty) {
    console.warn(
      '⚠️ Aucun établissement / filière / formation dans la base — sauvegarde autostart ignorée. ' +
        'Si ce n’est pas voulu, restaurez un fichier depuis database/backups/ (copie vers preinscription.json) puis redémarrez.'
    );
  } else {
    const backupPath = createBackup('autostart');
    pruneBackups(80);
    console.log(`💾 Backup auto créé: ${backupPath}`);
  }
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
  conditions_admission: [],
  _nextId: {
    etablissements: 1,
    filieres: 1,
    formations: 1,
    utilisateurs: 1,
    dossiers: 1,
    documents: 1,
    factures: 1,
    demandes_proforma: 1,
    notifications: 1,
    audit_logs: 1,
    security_events: 1,
    conditions_admission: 1,
  },
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

// Note : les comptes staff (responsable, agent_admin, comptable, etc.)
// doivent être créés par l'admin via l'interface (établissement requis sauf admin).
// Migration : ancien rôle « directeur » → « admin »
try {
  const users = db.get('utilisateurs').value() || [];
  users.forEach((u) => {
    if (u && u.role === 'directeur') {
      db.get('utilisateurs')
        .find({ id: u.id })
        .assign({ role: 'admin', etablissement_id: null })
        .write();
    }
  });
} catch (e) {
  console.warn('⚠️ Migration rôle directeur → admin ignorée:', e.message);
}

// S'assurer que tous les compteurs _nextId existent
[
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
].forEach((col) => {
  const v = db.get(`_nextId.${col}`).value();
  if (!v || typeof v !== 'number') {
    // Calculer le prochain ID à partir des données existantes (ids numériques ou chaînes numériques)
    const rawCol = db.get(col).value();
    const existant = Array.isArray(rawCol) ? rawCol : [];
    const ids = existant
      .map((r) => (r && r.id != null ? Number(r.id) : NaN))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const max = ids.length ? Math.max(...ids) : 0;
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

// ─── Migration : conditions d’admission par établissement ─────────────────────
(() => {
  if (db.get('conditions_admission').value() == null) {
    db.set('conditions_admission', []).write();
  }
  const nid = db.get('_nextId.conditions_admission').value();
  if (nid == null || typeof nid !== 'number') {
    const rows = db.get('conditions_admission').value() || [];
    const max = rows.length ? Math.max(...rows.map((r) => r.id || 0)) : 0;
    db.set('_nextId.conditions_admission', max + 1).write();
  }
})();

// ─── Migration : ordre sur conditions d’admission (plusieurs blocs par établissement) ─
(() => {
  const rows = db.get('conditions_admission').value() || [];
  const byEtab = {};
  rows.forEach((r) => {
    const eid = Number(r.etablissement_id);
    if (!Number.isFinite(eid)) return;
    if (!byEtab[eid]) byEtab[eid] = [];
    byEtab[eid].push(r);
  });
  Object.keys(byEtab).forEach((key) => {
    const eid = Number(key);
    const list = byEtab[eid].sort((a, b) => (a.id || 0) - (b.id || 0));
    list.forEach((r, idx) => {
      if (r.ordre == null) {
        db.get('conditions_admission').find({ id: r.id }).assign({ ordre: idx + 1 }).write();
      }
    });
  });
})();

// ─── Migration : demandes proforma avec facture sans statut acceptee (ancien flux) ─
(() => {
  const list = db.get('demandes_proforma').value() || [];
  list.forEach((d) => {
    const fac = d.facture;
    const hasFac = fac && fac.numero;
    const legacy = ['nouvelle', 'vue', 'traitee'].includes(d.statut);
    if (hasFac && legacy && d.statut !== 'acceptee' && d.statut !== 'refusee') {
      db.get('demandes_proforma')
        .find({ id: d.id })
        .assign({
          statut: 'acceptee',
          acceptee_le: d.acceptee_le || d.updated_at || d.created_at || new Date().toISOString(),
        })
        .write();
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

