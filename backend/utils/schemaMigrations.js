/**
 * Migrations versionnées de la base JSON (lowdb).
 * - Idempotentes (version courante stockée dans `_schemaVersion`)
 * - Backup automatique avant toute migration
 * - N’efface jamais de données métier : uniquement ajouts / normalisation
 */

const { createBackup } = require('./dbBackup');
const { getDureeMoisEffectif, computePrixAnnuel, normalizeFraisSupplementaires } = require('./formationTarifs');

/** Version cible de l’application actuelle. */
const CURRENT_SCHEMA_VERSION = 3;

function toNonNegInt(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * v1 — Continuité tarifs formations (ancienne → nouvelle grille / templates).
 * Ajoute frais_bibliotheque, frais_epi, duree_mois (dérivé du texte si besoin),
 * recalcule prix, normalise frais_supplementaires. Conserve ville/places historiques.
 */
function migrateFormationsTarifsV1(db) {
  const list = db.get('formations').value() || [];
  let touched = 0;
  list.forEach((f) => {
    if (!f || typeof f !== 'object') return;
    const patch = {};
    let changed = false;

    if (f.frais_bibliotheque === undefined || f.frais_bibliotheque === null) {
      patch.frais_bibliotheque = 0;
      changed = true;
    }
    if (f.frais_epi === undefined || f.frais_epi === null) {
      patch.frais_epi = 0;
      changed = true;
    }

    const moisEffectif = getDureeMoisEffectif(f);
    const moisStored = toNonNegInt(f.duree_mois, -1);
    if (moisStored < 0 || (moisStored === 0 && moisEffectif > 0)) {
      patch.duree_mois = moisEffectif;
      changed = true;
    }

    if (!Array.isArray(f.frais_supplementaires)) {
      const legacy = toNonNegInt(f.autres_frais, 0);
      patch.frais_supplementaires = legacy > 0
        ? [{ designation: 'Autres frais', montant: legacy }]
        : normalizeFraisSupplementaires(f.frais_supplementaires);
      changed = true;
    }

    if (f.type !== 'presentiel' && f.type !== 'en_ligne') {
      const t = String(f.type || '').toLowerCase();
      patch.type = ['en_ligne', 'en ligne', 'fad', 'online', 'distance'].includes(t)
        ? 'en_ligne'
        : 'presentiel';
      changed = true;
    }

    const merged = { ...f, ...patch };
    const prix = computePrixAnnuel(merged);
    if (toNonNegInt(f.prix, -1) !== prix) {
      patch.prix = prix;
      changed = true;
    }

    if (changed) {
      db.get('formations').find({ id: f.id }).assign(patch).write();
      touched += 1;
    }
  });
  return { formations_updated: touched };
}

/**
 * v2 — Photos préinscription + actif + snapshot migration_meta.
 */
function migrateFormationsMetaV2(db) {
  const list = db.get('formations').value() || [];
  let touched = 0;
  list.forEach((f) => {
    if (!f || typeof f !== 'object') return;
    const patch = {};
    let changed = false;

    if (f.nombre_photos_preinscription === undefined || f.nombre_photos_preinscription === null) {
      patch.nombre_photos_preinscription = 1;
      changed = true;
    } else {
      const n = toNonNegInt(f.nombre_photos_preinscription, 1);
      const clamped = Math.min(10, Math.max(1, n || 1));
      if (clamped !== f.nombre_photos_preinscription) {
        patch.nombre_photos_preinscription = clamped;
        changed = true;
      }
    }

    if (f.actif === undefined) {
      patch.actif = true;
      changed = true;
    }

    // Champs nouveaux absents → 0 (sans écraser les valeurs déjà saisies)
    if (f.frais_bibliotheque === undefined) {
      patch.frais_bibliotheque = 0;
      changed = true;
    }
    if (f.frais_epi === undefined) {
      patch.frais_epi = 0;
      changed = true;
    }

    if (changed) {
      db.get('formations').find({ id: f.id }).assign(patch).write();
      touched += 1;
    }
  });
  return { formations_updated: touched };
}

/** v3 — Configuration plateforme (favicon, nom affiché). */
function migrateSiteConfigV3(db) {
  if (db.get('site_config').value() == null) {
    db.set('site_config', {
      platform_name: 'Préinscription Universitaire',
      favicon_url: null,
      platform_logo_url: null,
      updated_at: null,
    }).write();
    return { site_config_created: true };
  }
  return { site_config_created: false };
}

const MIGRATIONS = [
  {
    version: 1,
    id: '2026_08_formations_tarifs_continuity',
    description: 'Ajoute Bibliothèque / EPI / duree_mois et recalcule le forfait sans perte de données.',
    up: migrateFormationsTarifsV1,
  },
  {
    version: 2,
    id: '2026_08_formations_photos_actif',
    description: 'Normalise photos préinscription et statut actif sur les formations existantes.',
    up: migrateFormationsMetaV2,
  },
  {
    version: 3,
    id: '2026_09_site_config',
    description: 'Ajoute site_config (favicon plateforme, nom affiché).',
    up: migrateSiteConfigV3,
  },
];

/**
 * Exécute les migrations manquantes. Retourne un résumé.
 * @param {import('lowdb').LowdbSync} db
 */
function runSchemaMigrations(db) {
  if (!db || typeof db.get !== 'function') {
    return { ok: false, message: 'db invalide' };
  }

  // Assurer la présence des clés de méta
  if (db.get('_schemaVersion').value() == null) {
    db.set('_schemaVersion', 0).write();
  }
  if (!Array.isArray(db.get('_migrations').value())) {
    db.set('_migrations', []).write();
  }

  let current = parseInt(db.get('_schemaVersion').value(), 10);
  if (!Number.isFinite(current) || current < 0) current = 0;

  const pending = MIGRATIONS.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
  if (pending.length === 0) {
    return {
      ok: true,
      skipped: true,
      from: current,
      to: CURRENT_SCHEMA_VERSION,
      applied: [],
    };
  }

  let backupPath = null;
  try {
    backupPath = createBackup(`pre-migrate-v${current}-to-v${CURRENT_SCHEMA_VERSION}`);
  } catch (e) {
    console.warn('⚠️ Backup pré-migration impossible:', e.message);
  }

  const applied = [];
  for (const m of pending) {
    try {
      const result = m.up(db) || {};
      const entry = {
        version: m.version,
        id: m.id,
        description: m.description,
        applied_at: new Date().toISOString(),
        result,
        backup: backupPath,
      };
      const hist = db.get('_migrations').value() || [];
      hist.push(entry);
      db.set('_migrations', hist).write();
      db.set('_schemaVersion', m.version).write();
      current = m.version;
      applied.push(entry);
      console.log(`✅ Migration v${m.version} (${m.id}) appliquée.`, result);
    } catch (err) {
      console.error(`❌ Migration v${m.version} échouée:`, err.message);
      return {
        ok: false,
        from: current,
        failed_at: m.version,
        applied,
        backup: backupPath,
        error: err.message,
      };
    }
  }

  return {
    ok: true,
    skipped: false,
    from: applied[0] ? applied[0].version - 1 : current,
    to: current,
    applied,
    backup: backupPath,
  };
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  runSchemaMigrations,
};
