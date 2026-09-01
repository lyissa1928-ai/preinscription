const db = require('../database/db');
const { createBackup } = require('./dbBackup');
const { ETAB_STAFF_ROLES, isPlatformAdmin, isAdminEtablissement } = require('./staffRoles');
const { logAudit } = require('./auditLog');

const EXPORT_VERSION = 1;

const SENSITIVE_USER_KEYS = [
  'mot_de_passe',
  'refresh_token',
  'reset_token',
  'password_reset_token',
  'password_reset_expires',
];

function sanitizeUserExport(u) {
  if (!u) return null;
  const copy = { ...u };
  SENSITIVE_USER_KEYS.forEach((k) => delete copy[k]);
  return copy;
}

function exportEtudiantData(userId) {
  const u = db.get('utilisateurs').find({ id: userId }).value();
  if (!u) return null;

  const dossiers = (db.get('dossiers').value() || []).filter(
    (d) => Number(d.etudiant_id) === Number(userId),
  );
  const dossierIds = new Set(dossiers.map((d) => d.id));
  const documents = (db.get('documents').value() || []).filter((d) => dossierIds.has(d.dossier_id));
  const factures = (db.get('factures').value() || []).filter(
    (f) => dossierIds.has(f.dossier_id) || Number(f.etudiant_id) === Number(userId),
  );
  const demandes_proforma = (db.get('demandes_proforma').value() || []).filter(
    (d) => Number(d.etudiant_id) === Number(userId),
  );

  return {
    _exportType: 'etudiant',
    _exportVersion: EXPORT_VERSION,
    _exportedAt: new Date().toISOString(),
    _userId: userId,
    _manifest: getManifestForRole('etudiant'),
    profil: sanitizeUserExport(u),
    dossiers,
    documents,
    factures,
    demandes_proforma,
  };
}

function exportStaffProfile(userId) {
  const u = db.get('utilisateurs').find({ id: userId }).value();
  if (!u) return null;
  return {
    _exportType: 'staff_profil',
    _exportVersion: EXPORT_VERSION,
    _exportedAt: new Date().toISOString(),
    _userId: userId,
    _manifest: getManifestForRole(u.role),
    profil: sanitizeUserExport(u),
  };
}

function exportEtablissementData(etabId) {
  const id = Number(etabId);
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab) return null;

  const formations = (db.get('formations').value() || []).filter(
    (f) => Number(f.etablissement_id) === id,
  );
  const filiereIds = new Set(formations.map((f) => f.filiere_id).filter(Boolean));
  const filieres = (db.get('filieres').value() || []).filter(
    (f) => Number(f.etablissement_id) === id || filiereIds.has(f.id),
  );

  const dossiers = (db.get('dossiers').value() || []).filter(
    (d) => Number(d.etablissement_id) === id,
  );
  const dossierIds = new Set(dossiers.map((d) => d.id));

  const documents = (db.get('documents').value() || []).filter((d) => dossierIds.has(d.dossier_id));
  const factures = (db.get('factures').value() || []).filter(
    (f) => dossierIds.has(f.dossier_id) || Number(f.etablissement_id) === id,
  );
  const demandes_proforma = (db.get('demandes_proforma').value() || []).filter(
    (d) => Number(d.etablissement_id) === id,
  );
  const conditions_admission = (db.get('conditions_admission').value() || []).filter(
    (c) => Number(c.etablissement_id) === id,
  );
  const utilisateurs_staff = (db.get('utilisateurs').value() || [])
    .filter((u) => Number(u.etablissement_id) === id && ETAB_STAFF_ROLES.includes(u.role))
    .map(sanitizeUserExport);

  return {
    _exportType: 'etablissement',
    _exportVersion: EXPORT_VERSION,
    _exportedAt: new Date().toISOString(),
    _etablissementId: id,
    _manifest: getManifestForRole('admin_etablissement'),
    etablissement: { ...etab },
    filieres,
    formations,
    conditions_admission,
    utilisateurs_staff,
    dossiers,
    documents,
    factures,
    demandes_proforma,
  };
}

function getManifestForRole(role) {
  const commonExcluded = [
    'Mots de passe (jamais exportés en clair)',
    'Tokens de session et jetons de réinitialisation',
    'Fichiers uploadés sur le serveur (PDF, pièces jointes) — export séparé côté administrateur plateforme',
  ];
  const migrationNote =
    'Les mises à jour de l’application préservent vos données : backup automatique avant chaque migration de schéma (_schemaVersion).';

  if (role === 'admin') {
    return {
      title: 'Sauvegarde complète de la plateforme',
      format: 'zip',
      included: [
        'Archive ZIP : preinscription.json (base complète)',
        'Utilisateurs, établissements, formations, dossiers, factures, etc.',
        'Historique des migrations appliquées',
      ],
      excluded: [
        ...commonExcluded,
        'Dossier uploads/ (pièces jointes PDF/images — copie serveur séparée)',
      ],
      canRestore: true,
      restoreHint:
        'Restauration depuis un fichier .zip contenant preinscription.json. Un backup automatique est créé avant toute opération. Les mises à jour git ne remplacent pas vos données prod (skip-worktree).',
      migrationNote,
    };
  }

  if (role === 'admin_etablissement') {
    return {
      title: 'Sauvegarde de votre établissement',
      format: 'zip',
      included: [
        'Fiche établissement (identité, contact, banque, charte graphique)',
        'Filières et formations (grilles tarifaires incluses)',
        'Conditions d’admission',
        'Comptes staff de l’établissement (profils, sans mot de passe)',
        'Dossiers de préinscription et métadonnées des documents',
        'Factures et demandes proforma',
      ],
      excluded: [
        ...commonExcluded,
        'Données des autres établissements',
        'Comptes administrateur plateforme',
        'Journal d’audit global',
      ],
      canRestore: true,
      restoreHint:
        'Restauration depuis un fichier .zip (donnees.json). Fusion par identifiant — aucune suppression automatique. Backup auto avant restauration.',
      migrationNote,
    };
  }

  if (role === 'etudiant') {
    return {
      title: 'Export de mes données candidat',
      format: 'zip',
      included: [
        'Profil du compte (nom, contact, adresse)',
        'Dossiers de préinscription',
        'Métadonnées des documents déposés',
        'Factures et demandes proforma',
      ],
      excluded: [
        ...commonExcluded,
        'Données des autres candidats',
      ],
      canRestore: true,
      restoreHint:
        'Restauration depuis un fichier .zip — profil uniquement (nom, téléphone, adresse).',
      migrationNote,
    };
  }

  return {
    title: 'Export de mon profil staff',
    format: 'zip',
    included: ['Profil du compte (identité, contact, rôle, matricule)'],
    excluded: [...commonExcluded, 'Données métier de l’établissement (réservées à l’administrateur établissement)'],
    canRestore: true,
    restoreHint: 'Restauration depuis un fichier .zip — champs de profil uniquement.',
    migrationNote,
  };
}

function getBackupEndpointsForUser(user) {
  const manifest = getManifestForRole(user.role);
  if (isPlatformAdmin(user)) {
    return {
      ...manifest,
      exportUrl: '/api/admin/backup/export',
      restoreUrl: '/api/admin/backup/restore',
    };
  }
  if (isAdminEtablissement(user) && user.etablissement_id) {
    const etabId = user.etablissement_id;
    return {
      ...manifest,
      exportUrl: `/api/etablissements/${etabId}/donnees/export`,
      restoreUrl: `/api/etablissements/${etabId}/donnees/restore`,
    };
  }
  return {
    ...manifest,
    exportUrl: '/api/auth/mes-donnees/export',
    restoreUrl: '/api/auth/mes-donnees/restore',
  };
}

function exportForUser(user) {
  if (isPlatformAdmin(user)) return null;
  if (isAdminEtablissement(user)) return exportEtablissementData(user.etablissement_id);
  if (user.role === 'etudiant') return exportEtudiantData(user.id);
  return exportStaffProfile(user.id);
}

function upsertCollection(collectionName, items, belongsFn) {
  if (!Array.isArray(items)) return { added: 0, updated: 0, skipped: 0 };
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item || item.id == null) {
      skipped += 1;
      continue;
    }
    const existing = db.get(collectionName).find({ id: item.id }).value();
    if (existing && belongsFn && !belongsFn(existing)) {
      skipped += 1;
      continue;
    }
    if (existing) {
      db.get(collectionName).find({ id: item.id }).assign(item).write();
      updated += 1;
    } else {
      db.get(collectionName).push(item).write();
      added += 1;
    }
  }
  return { added, updated, skipped };
}

function restoreEtablissementData(etabId, payload, req) {
  const id = Number(etabId);
  if (!payload || payload._exportType !== 'etablissement') {
    throw new Error('Fichier incompatible : attendu un export établissement.');
  }
  if (Number(payload._etablissementId) !== id) {
    throw new Error('Cet export appartient à un autre établissement.');
  }

  const preBackup = createBackup('pre-restore-etab');
  const belongsEtab = (row) => Number(row.etablissement_id) === id;

  if (payload.etablissement?.id === id) {
    const { id: _id, ...patch } = payload.etablissement;
    db.get('etablissements').find({ id }).assign(patch).write();
  }

  const stats = {
    filieres: upsertCollection('filieres', payload.filieres, belongsEtab),
    formations: upsertCollection('formations', payload.formations, belongsEtab),
    conditions_admission: upsertCollection('conditions_admission', payload.conditions_admission, belongsEtab),
    dossiers: upsertCollection('dossiers', payload.dossiers, belongsEtab),
    documents: upsertCollection('documents', payload.documents, (doc) => {
      const dossier = db.get('dossiers').find({ id: doc.dossier_id }).value();
      return dossier && Number(dossier.etablissement_id) === id;
    }),
    factures: upsertCollection('factures', payload.factures, (f) => {
      if (Number(f.etablissement_id) === id) return true;
      if (f.dossier_id) {
        const dossier = db.get('dossiers').find({ id: f.dossier_id }).value();
        return dossier && Number(dossier.etablissement_id) === id;
      }
      return false;
    }),
    demandes_proforma: upsertCollection('demandes_proforma', payload.demandes_proforma, belongsEtab),
    staff_profiles: { updated: 0, skipped: 0 },
  };

  for (const u of payload.utilisateurs_staff || []) {
    if (!u?.id || Number(u.etablissement_id) !== id) continue;
    const existing = db.get('utilisateurs').find({ id: u.id }).value();
    if (!existing) {
      stats.staff_profiles.skipped += 1;
      continue;
    }
    db.get('utilisateurs')
      .find({ id: u.id })
      .assign({
        prenom: u.prenom,
        nom: u.nom,
        telephone: u.telephone,
        adresse: u.adresse,
        updated_at: new Date().toISOString(),
      })
      .write();
    stats.staff_profiles.updated += 1;
  }

  if (req) {
    logAudit(req, 'restauration_donnees_etablissement', 'etablissement', id, {
      pre_backup: preBackup,
      stats,
      scope: 'etablissement',
      etablissement_id: id,
    });
  }

  return { preBackup, stats };
}

function restoreUserProfileData(user, payload) {
  if (!payload?.profil) throw new Error('Export invalide : profil manquant.');
  const allowedTypes = ['etudiant', 'staff_profil'];
  if (!allowedTypes.includes(payload._exportType)) {
    throw new Error('Ce fichier ne peut pas être restauré sur ce compte.');
  }
  if (Number(payload._userId) !== Number(user.id)) {
    throw new Error('Cet export appartient à un autre utilisateur.');
  }

  const preBackup = createBackup('pre-restore-profil');
  const p = payload.profil;
  db.get('utilisateurs')
    .find({ id: user.id })
    .assign({
      prenom: p.prenom,
      nom: p.nom,
      telephone: p.telephone,
      adresse: p.adresse,
      date_naissance: p.date_naissance || null,
      updated_at: new Date().toISOString(),
    })
    .write();

  return { preBackup, message: 'Profil restauré.' };
}

module.exports = {
  EXPORT_VERSION,
  exportEtudiantData,
  exportStaffProfile,
  exportEtablissementData,
  exportForUser,
  getManifestForRole,
  getBackupEndpointsForUser,
  restoreEtablissementData,
  restoreUserProfileData,
};
