/**
 * Vérification non-régression P0 — exécution locale uniquement.
 * Usage: node scripts/verify-regression-p0.js
 * Prérequis: API sur http://localhost:5000
 */
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

process.env.SKIP_DB_AUTOSTART_BACKUP = '1';
const db = require('../database/db');

const BASE = process.env.API_BASE || 'http://localhost:5000';
const VERIFY_TEST_PASSWORD = process.env.VERIFY_TEST_PASSWORD || 'Regress2026!';

const PASS_CANDIDATES = [
  VERIFY_TEST_PASSWORD,
  'Admin123!',
  'Comptable123!',
  'admin123',
  'Test1234!',
  'Password123!',
  'Esebat123!',
  'Universite123!',
  'Fatima123!',
  'Salif123!',
  'Agent123!',
  '12345678',
  'password',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Réinitialise les MDP via l’API admin (mémoire serveur à jour). Retourne email → mot de passe temporaire. */
async function prepareCredentialsViaAdmin() {
  if (process.env.VERIFY_PREPARE_CREDENTIALS !== '1') return {};
  const adminLg = await login('admin@universite.sn');
  if (!adminLg.ok || !adminLg.token) {
    console.error('[verify] Impossible de préparer les comptes : admin non connecté');
    return {};
  }
  const emails = [
    'adama.diop@esebat.com',
    'salif.sene@universite.sn',
    'ali.seck@test.com',
    'efosante@universite.sn',
    'comptable.verify@universite.sn',
  ];
  const temps = {};
  for (const email of emails) {
    const u = db.get('utilisateurs').find({ email }).value();
    if (!u || u.is_locked) continue;
    const r = await api('POST', `/api/admin/utilisateurs/${u.id}/reinitialiser-mot-de-passe`, {
      token: adminLg.token,
    });
    if (r.status === 200 && r.data?.mot_de_passe_temporaire) {
      temps[email] = r.data.mot_de_passe_temporaire;
      console.error(`[verify] MDP temporaire ${email}: ${r.data.mot_de_passe_temporaire}`);
    }
  }
  return temps;
}

/** Dossier en_attente pour tests upload / validation (VERIFY_SEED_DOSSIER=1). */
function seedPendingDossier() {
  if (process.env.VERIFY_SEED_DOSSIER !== '1') return null;
  const etu = db.get('utilisateurs').find({ email: 'ali.seck@test.com' }).value();
  if (!etu) return null;
  const fid = 5;
  const existing = (db.get('dossiers').value() || []).find(
    (d) => Number(d.etudiant_id) === Number(etu.id) && Number(d.formation_id) === fid,
  );
  if (existing) return existing;
  const formation = db.get('formations').find({ id: fid }).value();
  if (!formation) return null;
  const id = db.nextId('dossiers');
  const row = {
    id,
    etudiant_id: etu.id,
    numero_dossier: `VERIFY-${id}`,
    formation_id: fid,
    type_formation: formation.type,
    filiere: formation.titre,
    niveau: formation.niveau_requis,
    formation_niveau_cible: formation.niveau != null ? String(formation.niveau) : null,
    document_rule_profile: formation.niveau || 'generic',
    annee_academique: '2025-2026',
    date_naissance: '2000-01-01',
    lieu_naissance: 'Dakar',
    nationalite: 'Sénégalaise',
    telephone: '770000000',
    adresse: 'Test verify',
    dernier_diplome: 'BAC',
    etablissement_origine: 'Lycée test',
    annee_obtention: 2020,
    statut: 'en_attente',
    commentaire_admin: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.get('dossiers').push(row).write();
  console.error(`[verify] Dossier test #${id} (en_attente) créé pour ali.seck formation ${fid}`);
  return row;
}

async function api(method, urlPath, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function clearMustChangePassword(token, user, currentPassword) {
  if (!user?.matricule || !currentPassword) return { ok: false };
  const r = await api('POST', '/api/auth/changer-mot-de-passe-obligatoire', {
    token,
    body: {
      matricule: user.matricule,
      ancien_mot_de_passe: currentPassword,
      nouveau_mot_de_passe: VERIFY_TEST_PASSWORD,
      confirmation: VERIFY_TEST_PASSWORD,
    },
  });
  if (r.status !== 200 || !r.data?.token) return { ok: false, status: r.status };
  return { ok: true, token: r.data.token, user: r.data.utilisateur || user, password: VERIFY_TEST_PASSWORD };
}

async function login(email, extraPasswords = []) {
  const candidates = [...new Set([...extraPasswords, ...PASS_CANDIDATES])];
  const user = db.get('utilisateurs').find({ email }).value();
  if (user && user.actif === false) return { ok: false };

  for (const pwd of candidates) {
    const fromServer = extraPasswords.includes(pwd);
    if (!fromServer) {
      if (!user?.mot_de_passe || !bcrypt.compareSync(pwd, user.mot_de_passe)) continue;
    }
    const r = await api('POST', '/api/auth/connexion', {
      body: { email, mot_de_passe: pwd },
    });
    if (r.status === 200 && r.data?.token) {
      const pub = r.data.utilisateur || user;
      if (pub?.must_change_password === true) {
        const cleared = await clearMustChangePassword(r.data.token, pub, pwd);
        if (cleared.ok) return { ok: true, ...cleared };
      }
      return { ok: true, token: r.data.token, user: pub, password: pwd };
    }
    if (r.status === 403 && r.data?.code === 'MUST_CHANGE_PASSWORD') {
      return { ok: 'must_change', status: 403, user, password: pwd, data: r.data };
    }
  }
  return { ok: false };
}

function formationEtabId(formationId) {
  const f = db.get('formations').find({ id: formationId }).value();
  return f ? f.etablissement_id : null;
}

function dossierEtabId(dossier) {
  if (dossier.etablissement_id) return dossier.etablissement_id;
  return formationEtabId(dossier.formation_id);
}

function demandeEtabId(demande) {
  if (demande.etablissement_id) return demande.etablissement_id;
  return formationEtabId(demande.formation_id);
}

function allDossierEtabIds() {
  return [...new Set((db.get('dossiers').value() || []).map(dossierEtabId).filter(Boolean))];
}

async function ensureComptableViaAdmin(tempPasswords) {
  const email = 'comptable.verify@universite.sn';
  const tryLg = await login(email, ['Comptable123!', tempPasswords[email]].filter(Boolean));
  if (tryLg.ok && tryLg.token) {
    tempPasswords[email] = tryLg.password;
    return;
  }
  if (process.env.VERIFY_SEED_COMPTEABLE !== '1') return;
  const adminLg = await login('admin@universite.sn');
  if (!adminLg.ok || !adminLg.token) return;
  const r = await api('POST', '/api/admin/utilisateurs', {
    token: adminLg.token,
    body: {
      prenom: 'Verify',
      nom: 'Comptable',
      email,
      mot_de_passe: 'Comptable123!',
      mot_de_passe_confirmation: 'Comptable123!',
      role: 'comptable',
      etablissement_id: 1,
      telephone: '770000001',
    },
  });
  if (r.status === 201 || r.status === 200) {
    tempPasswords[email] = 'Comptable123!';
    console.error('[verify] Compte comptable créé via API admin');
  }
}

function seedComptableTestUser() {
  const existing = (db.get('utilisateurs').value() || []).find(
    (u) => u.role === 'comptable' && u.actif !== false,
  );
  if (existing) return existing;
  const verifyRow = db.get('utilisateurs').find({ email: 'comptable.verify@universite.sn' }).value();
  if (verifyRow) return verifyRow;
  if (process.env.VERIFY_SEED_COMPTEABLE !== '1') return null;
  const hash = bcrypt.hashSync('Comptable123!', 10);
  const id = db.nextId('utilisateurs');
  const row = {
    id,
    nom: 'Compta',
    prenom: 'Test',
    email: 'comptable.verify@universite.sn',
    matricule: 'CPT-VERIFY',
    mot_de_passe: hash,
    role: 'comptable',
    etablissement_id: 1,
    actif: true,
    must_change_password: false,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    created_at: new Date().toISOString(),
  };
  db.get('utilisateurs').push(row).write();
  console.error('[verify] Compte comptable test créé: comptable.verify@universite.sn / Comptable123! (VERIFY_SEED_COMPTEABLE=1)');
  return row;
}

async function main() {
  const results = [];
  const log = (row) => {
    results.push(row);
    console.log(JSON.stringify(row));
  };

  const tempPasswords = await prepareCredentialsViaAdmin();
  await ensureComptableViaAdmin(tempPasswords);
  const pendingDossier = seedPendingDossier();

  // health + backup dirs
  const health = await api('GET', '/api/health');
  log({
    role: 'système',
    parcours: '/api/health',
    resultat: health.status === 200 && health.data?.status === 'OK' ? 'OK' : 'ÉCHEC',
    erreur: health.status !== 200 ? `HTTP ${health.status}` : '',
    correction: '',
  });

  const backupDir = path.join(__dirname, '..', 'database', 'backups');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  log({
    role: 'système',
    parcours: 'backup JSON + uploads dirs',
    resultat: fs.existsSync(backupDir) && fs.existsSync(uploadsDir) ? 'OK' : 'ÉCHEC',
    erreur: '',
    correction: '',
  });

  const roles = [
    { role: 'admin', email: 'admin@universite.sn' },
    { role: 'responsable', email: 'adama.diop@esebat.com' },
    { role: 'responsable_alt', email: 'fatima.ly@universite.sn' },
    { role: 'agent_admin', email: 'efosante@universite.sn' },
    { role: 'controleur_qualite', email: 'salif.sene@universite.sn' },
    { role: 'etudiant', email: 'ali.seck@test.com' },
    { role: 'comptable', email: 'comptable.verify@universite.sn' },
  ];

  const tokens = {};

  for (const { role, email } of roles) {
    const lg = await login(email, tempPasswords[email] ? [tempPasswords[email]] : []);
    if (!lg.ok) {
      const u = db.get('utilisateurs').find({ email }).value();
      const expectLocked = role === 'responsable_alt' && u?.is_locked;
      log({
        role,
        parcours: 'Connexion POST /api/auth/connexion',
        resultat: expectLocked ? 'OK (verrouillé attendu)' : 'ÉCHEC',
        erreur: expectLocked
          ? ''
          : `Login impossible (${email}) — mot de passe inconnu ou compte inactif/verrouillé`,
        correction: expectLocked ? '' : 'VERIFY_PREPARE_CREDENTIALS=1 ou documenter identifiants',
      });
      continue;
    }
    if (lg.ok === 'must_change') {
      log({
        role,
        parcours: 'Connexion',
        resultat: 'PARTIEL',
        erreur: 'must_change_password — parcours dashboard bloqué sans changement MDP',
        correction: 'Tester avec compte must_change_password=false',
      });
      continue;
    }
    tokens[role] = { token: lg.token, user: lg.user, email };

    const me = await api('GET', '/api/auth/me', { token: lg.token });
    log({
      role,
      parcours: 'GET /api/auth/me',
      resultat: me.status === 200 ? 'OK' : 'ÉCHEC',
      erreur: me.status !== 200 ? `HTTP ${me.status}` : '',
      correction: '',
    });
  }

  // Admin dashboards
  if (tokens.admin) {
    const t = tokens.admin.token;
    for (const p of ['/api/admin/statistiques-globales', '/api/admin/dossiers?page=1&limit=5', '/api/admin/demandes-proforma']) {
      const r = await api('GET', p, { token: t });
      log({
        role: 'admin',
        parcours: p,
        resultat: r.status === 200 ? 'OK' : 'ÉCHEC',
        erreur: r.status !== 200 ? `HTTP ${r.status}` : '',
        correction: '',
      });
    }
  }

  // Responsable etab 1 (adama.diop@esebat.com)
  if (tokens.responsable) {
    const t = tokens.responsable.token;
    const etab = tokens.responsable.user.etablissement_id;
    const rDash = await api('GET', '/api/responsable/statistiques', { token: t });
    const rDos = await api('GET', '/api/responsable/dossiers?page=1&limit=50', { token: t });
    let leak = false;
    if (rDos.status === 200 && Array.isArray(rDos.data?.dossiers)) {
      for (const d of rDos.data.dossiers) {
        const de = dossierEtabId(db.get('dossiers').find({ id: d.id }).value() || d);
        if (de != null && de !== etab) leak = true;
      }
    }
    log({
      role: 'responsable',
      parcours: 'Dashboard + dossiers périmètre étab. ' + etab,
      resultat: rDash.status === 200 && rDos.status === 200 && !leak ? 'OK' : 'ÉCHEC',
      erreur: leak ? 'Fuite inter-établissement dans liste dossiers' : rDash.status !== 200 || rDos.status !== 200 ? 'HTTP' : '',
      correction: leak ? 'staffScope responsable' : '',
    });

    // IDOR: dossier autre étab si existe
    const foreign = (db.get('dossiers').value() || []).find((d) => dossierEtabId(d) !== etab);
    if (foreign) {
      const idor = await api('GET', `/api/responsable/dossiers/${foreign.id}`, { token: t });
      log({
        role: 'responsable',
        parcours: `IDOR GET dossier hors étab #${foreign.id}`,
        resultat: idor.status === 403 ? 'OK' : 'ÉCHEC',
        erreur: idor.status !== 403 ? `HTTP ${idor.status} — fuite` : '',
        correction: '',
      });
    }
  }

  // Agent admin etab 2
  if (tokens.agent_admin) {
    const t = tokens.agent_admin.token;
    const etab = tokens.agent_admin.user.etablissement_id;
    const rDash = await api('GET', '/api/agent-admin/dashboard', { token: t });
    const foreign = (db.get('dossiers').value() || []).find((d) => dossierEtabId(d) !== etab);
    let idorOk = true;
    if (foreign) {
      const idorGet = await api('GET', `/api/agent-admin/dossiers/${foreign.id}`, { token: t });
      const idorPut = await api('PUT', `/api/agent-admin/dossiers/${foreign.id}/completude`, {
        token: t,
        body: { statut_admin: 'en_verification' },
      });
      idorOk = idorGet.status === 403 && idorPut.status === 403;
      log({
        role: 'agent_admin',
        parcours: `IDOR dossier étab ${dossierEtabId(foreign)} (agent etab ${etab})`,
        resultat: idorOk ? 'OK' : 'ÉCHEC',
        erreur: !idorOk ? `GET ${idorGet.status} PUT ${idorPut.status}` : '',
        correction: '',
      });
    }
    const own = (db.get('dossiers').value() || []).find((d) => dossierEtabId(d) === etab);
    if (own) {
      const okGet = await api('GET', `/api/agent-admin/dossiers/${own.id}`, { token: t });
      log({
        role: 'agent_admin',
        parcours: 'GET dossier dans périmètre',
        resultat: okGet.status === 200 ? 'OK' : 'ÉCHEC',
        erreur: okGet.status !== 200 ? `HTTP ${okGet.status}` : '',
        correction: '',
      });
    }
    log({
      role: 'agent_admin',
      parcours: 'Dashboard',
      resultat: rDash.status === 200 ? 'OK' : 'ÉCHEC',
      erreur: '',
      correction: '',
    });
  }

  // Qualité etab 2
  if (tokens.controleur_qualite) {
    const t = tokens.controleur_qualite.token;
    const etab = tokens.controleur_qualite.user.etablissement_id;
    const r = await api('GET', '/api/qualite/dashboard', { token: t });
    log({
      role: 'controleur_qualite',
      parcours: 'Dashboard qualité',
      resultat: r.status === 200 ? 'OK' : 'ÉCHEC',
      erreur: r.status !== 200 ? `HTTP ${r.status}` : '',
      correction: '',
    });
    const rDos = await api('GET', '/api/qualite/dossiers?page=1&limit=20', { token: t });
    let leak = false;
    if (rDos.status === 200 && Array.isArray(rDos.data?.dossiers)) {
      for (const d of rDos.data.dossiers) {
        const full = db.get('dossiers').find({ id: d.id }).value();
        if (full && dossierEtabId(full) !== etab) leak = true;
      }
    }
    log({
      role: 'controleur_qualite',
      parcours: 'Liste dossiers périmètre',
      resultat: rDos.status === 200 && !leak ? 'OK' : 'ÉCHEC',
      erreur: leak ? 'Fuite inter-étab' : '',
      correction: '',
    });
  }

  if (tokens.comptable) {
    const t = tokens.comptable.token;
    const etab = tokens.comptable.user.etablissement_id;
    const rDash = await api('GET', '/api/comptable/dashboard', { token: t });
    const rDos = await api('GET', '/api/comptable/dossiers?page=1&limit=100', { token: t });
    let leakDos = false;
    if (rDos.status === 200 && Array.isArray(rDos.data?.dossiers)) {
      for (const row of rDos.data.dossiers) {
        const full = db.get('dossiers').find({ id: row.id }).value();
        if (full && dossierEtabId(full) !== etab) leakDos = true;
      }
    }
    log({
      role: 'comptable',
      parcours: `Dashboard + dossiers (étab ${etab})`,
      resultat: rDash.status === 200 && rDos.status === 200 && !leakDos ? 'OK' : 'ÉCHEC',
      erreur: leakDos ? 'Fuite inter-établissement' : '',
      correction: '',
    });
    const foreign = (db.get('dossiers').value() || []).find((d) => dossierEtabId(d) !== etab);
    if (foreign) {
      const idor = await api('PUT', `/api/comptable/dossiers/${foreign.id}/validation-financiere`, {
        token: t,
        body: { validation_financiere: 'en_attente' },
      });
      log({
        role: 'comptable',
        parcours: 'IDOR PUT validation-financière hors étab',
        resultat: idor.status === 403 ? 'OK' : 'ÉCHEC',
        erreur: idor.status !== 403 ? `HTTP ${idor.status}` : '',
        correction: '',
      });
    }
    const foreignDem = (db.get('demandes_proforma').value() || []).find(
      (d) => d.facture && demandeEtabId(d) !== etab,
    );
    if (foreignDem?.reference) {
      const idorRef = await api('GET', `/api/comptable/proformas/${foreignDem.reference}`, { token: t });
      log({
        role: 'comptable',
        parcours: 'IDOR GET proforma autre établissement',
        resultat: idorRef.status === 403 ? 'OK' : 'ÉCHEC',
        erreur: idorRef.status !== 403 ? `HTTP ${idorRef.status}` : '',
        correction: '',
      });
    }
  }

  // Etudiant
  if (tokens.etudiant) {
    const t = tokens.etudiant.token;
    const rDos = await api('GET', '/api/etudiant/dossiers', { token: t });
    const uid = tokens.etudiant.user.id;
    let leak = false;
    const list = rDos.data?.dossiers || rDos.data;
    if (rDos.status === 200 && Array.isArray(list)) {
      leak = list.some((d) => d.etudiant_id && d.etudiant_id !== uid);
    }
    log({
      role: 'etudiant',
      parcours: 'GET /api/etudiant/dossiers (ses dossiers uniquement)',
      resultat: rDos.status === 200 && !leak ? 'OK' : 'ÉCHEC',
      erreur: leak ? 'Voit dossiers autre étudiant' : '',
      correction: '',
    });
    const foreignDossier = (db.get('dossiers').value() || []).find((d) => d.etudiant_id !== uid);
    if (foreignDossier) {
      const idor = await api('GET', `/api/etudiant/lettre/${foreignDossier.id}`, { token: t });
      log({
        role: 'etudiant',
        parcours: 'IDOR lettre dossier autre',
        resultat: idor.status === 403 || idor.status === 404 ? 'OK' : 'ÉCHEC',
        erreur: idor.status === 200 ? 'Fuite' : '',
        correction: '',
      });
    }

    const dosUpload = pendingDossier || (db.get('dossiers').value() || []).find(
      (d) => Number(d.etudiant_id) === uid && ['en_attente', 'en_cours'].includes(d.statut),
    );
    if (dosUpload) {
      try {
        const png1x1 = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        );
        const fd = new FormData();
        fd.append('photo', new Blob([png1x1], { type: 'image/png' }), 'verify.png');
        const up = await fetch(`${BASE}/api/etudiant/dossiers/${dosUpload.id}/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}` },
          body: fd,
        });
        log({
          role: 'etudiant',
          parcours: `POST upload photo dossier #${dosUpload.id}`,
          resultat: up.status === 200 ? 'OK' : 'ÉCHEC',
          erreur: up.status !== 200 ? `HTTP ${up.status}` : '',
          correction: '',
        });
      } catch (e) {
        log({
          role: 'etudiant',
          parcours: 'POST upload photo',
          resultat: 'ÉCHEC',
          erreur: e.message,
          correction: '',
        });
      }
    } else {
      log({
        role: 'etudiant',
        parcours: 'Upload document (aucun dossier en_attente/en_cours)',
        resultat: 'NON TESTÉ',
        erreur: 'Dossier accepté uniquement — lancer VERIFY_SEED_DOSSIER=1',
        correction: '',
      });
    }
  }

  if (tokens.responsable && pendingDossier) {
    const t = tokens.responsable.token;
    const r = await api('PUT', `/api/responsable/dossiers/${pendingDossier.id}/statut`, {
      token: t,
      body: { statut: 'en_cours' },
    });
    log({
      role: 'responsable',
      parcours: `Validation dossier #${pendingDossier.id} → en_cours`,
      resultat: r.status === 200 ? 'OK' : 'ÉCHEC',
      erreur: r.status !== 200 ? `HTTP ${r.status}` : '',
      correction: '',
    });
  }

  if (tokens.agent_admin) {
    const etab = tokens.agent_admin.user.etablissement_id;
    const own = (db.get('dossiers').value() || []).find((d) => dossierEtabId(d) === etab);
    if (own) {
      const t = tokens.agent_admin.token;
      const ctrl = await api('PUT', `/api/agent-admin/dossiers/${own.id}/completude`, {
        token: t,
        body: { statut_admin: 'en_verification' },
      });
      log({
        role: 'agent_admin',
        parcours: `Contrôle complétude dossier #${own.id}`,
        resultat: ctrl.status === 200 ? 'OK' : 'PARTIEL',
        erreur: ctrl.status !== 200 ? `HTTP ${ctrl.status}` : '',
        correction: '',
      });
    }
  }

  if (tokens.comptable) {
    const etab = tokens.comptable.user.etablissement_id;
    const own = (db.get('dossiers').value() || []).find((d) => dossierEtabId(d) === etab);
    if (own) {
      const t = tokens.comptable.token;
      const fin = await api('PUT', `/api/comptable/dossiers/${own.id}/validation-financiere`, {
        token: t,
        body: { validation_financiere: 'en_attente' },
      });
      log({
        role: 'comptable',
        parcours: `Facturation / validation financière dossier #${own.id}`,
        resultat: fin.status === 200 ? 'OK' : 'PARTIEL',
        erreur: fin.status !== 200 ? `HTTP ${fin.status}` : '',
        correction: '',
      });
    }
  }

  if (tokens.salif || tokens.agent_admin) {
    const chatUser = tokens.salif || tokens.agent_admin;
    const t = chatUser.token;
    try {
      const pdfBuf = Buffer.from('%PDF-1.4\n%EOF');
      const fd = new FormData();
      fd.append('file', new Blob([pdfBuf], { type: 'application/pdf' }), 'verify.pdf');
      const resChat = await fetch(`${BASE}/api/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      });
      log({
        role: 'chat (staff)',
        parcours: 'POST /api/chat/upload PDF',
        resultat: resChat.status === 201 ? 'OK' : 'ÉCHEC',
        erreur: resChat.status !== 201 ? `HTTP ${resChat.status}` : '',
        correction: '',
      });
    } catch (e) {
      log({
        role: 'chat (staff)',
        parcours: 'POST /api/chat/upload',
        resultat: 'ÉCHEC',
        erreur: e.message,
        correction: '',
      });
    }
  }

  const dem = (db.get('demandes_proforma').value() || []).find((d) => d.reference);
  if (dem) {
    const pub = await api('GET', `/api/public/facture-proforma/${dem.reference}`);
    log({
      role: 'public',
      parcours: 'GET facture-proforma publique',
      resultat: pub.status === 200 || pub.status === 403 ? 'OK' : 'ÉCHEC',
      erreur: '',
      correction: '',
    });
  }

  if (tokens.admin) {
    const pag = await api('GET', '/api/admin/demandes-proforma?page=1&limit=5', {
      token: tokens.admin.token,
    });
    log({
      role: 'admin',
      parcours: 'Pagination demandes-proforma',
      resultat: pag.status === 200 && pag.data?.pagination ? 'OK' : 'PARTIEL',
      erreur: '',
      correction: '',
    });
  }

  console.log('\n--- SUMMARY ---');
  const fails = results.filter((r) => r.resultat === 'ÉCHEC');
  console.log(`Total: ${results.length}, OK/PARTIEL: ${results.length - fails.length}, ÉCHEC: ${fails.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
