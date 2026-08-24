/**
 * Sérialisation des écritures JSON (lowdb FileSync) — verrou fichier léger, sans PostgreSQL.
 * Réduit les races last-write-wins et copies backup pendant write.
 */

const fs = require('fs');
const path = require('path');

const lockDepth = new Map();

function lockDirFor(basePath) {
  return `${basePath}.write-lock`;
}

function runWithDbLockSync(basePath, fn) {
  const prev = lockDepth.get(basePath) || 0;
  if (prev > 0) {
    lockDepth.set(basePath, prev + 1);
    try {
      return fn();
    } finally {
      lockDepth.set(basePath, prev);
    }
  }

  const lockDir = lockDirFor(basePath);
  const maxWait = parseInt(process.env.DB_LOCK_MAX_WAIT_MS || '15000', 10) || 15000;
  const start = Date.now();
  let acquired = false;

  while (!acquired) {
    try {
      fs.mkdirSync(lockDir);
      acquired = true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() - start > maxWait) {
        throw new Error(`Verrou base JSON expiré (${path.basename(basePath)})`);
      }
      const spinUntil = Date.now() + 8;
      while (Date.now() < spinUntil) {
        /* attente courte synchrone */
      }
    }
  }

  lockDepth.set(basePath, 1);
  try {
    return fn();
  } finally {
    lockDepth.delete(basePath);
    try {
      fs.rmdirSync(lockDir);
    } catch {
      /* lock orphelin — prochain write réessaiera */
    }
  }
}

function installWriteLockOnAdapter(adapter, basePath) {
  if (!adapter || adapter.__uniWriteLockInstalled) return adapter;
  const origWrite = adapter.write.bind(adapter);
  adapter.write = function writeWithLock(state) {
    return runWithDbLockSync(basePath, () => origWrite(state));
  };
  adapter.__uniWriteLockInstalled = true;
  return adapter;
}

/** File d’attente micro-tâches : sérialise les writes async intercalés (routes avec await). */
let writeChain = Promise.resolve();

function enqueueAsyncWrite(fn) {
  const run = writeChain.then(() => fn());
  writeChain = run.catch(() => {});
  return run;
}

function warnPm2ClusterRisk() {
  if (process.env.DISABLE_PM2_CLUSTER_WARN === '1') return;
  const pm2 = process.env.pm_id != null || process.env.PM2_HOME != null;
  if (!pm2) return;

  const instances = parseInt(process.env.PM2_INSTANCES || process.env.instances || '1', 10);
  if (Number.isFinite(instances) && instances > 1) {
    console.error(
      `[CRITIQUE] PM2 cluster (${instances} instances) incompatible avec lowdb/JSON. ` +
        'Utilisez exec_mode: fork et instances: 1, ou DISABLE_PM2_CLUSTER_WARN=1 à vos risques.'
    );
    return;
  }

  if (process.env.NODE_APP_INSTANCE != null) {
    console.warn(
      '[AVERTISSEMENT] Processus PM2 détecté. Une seule instance Node doit écrire preinscription.json. ' +
        'Voir backend/.env.example (PM2_INSTANCES=1).'
    );
  }
}

module.exports = {
  runWithDbLockSync,
  installWriteLockOnAdapter,
  enqueueAsyncWrite,
  warnPm2ClusterRisk,
  lockDirFor,
};
