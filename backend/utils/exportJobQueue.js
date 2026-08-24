/**
 * File d’attente export en mémoire (préparation worker/Redis futur).
 * Ne bloque pas l’event loop : traitement via setImmediate par lot.
 */
const crypto = require('crypto');

const jobs = new Map();
const MAX_JOBS = 50;

function pruneJobs() {
  if (jobs.size <= MAX_JOBS) return;
  const sorted = [...jobs.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  while (jobs.size > MAX_JOBS && sorted.length) {
    const [id] = sorted.shift();
    jobs.delete(id);
  }
}

/**
 * @param {() => Promise<unknown>} runner
 */
function enqueueExportJob(runner) {
  const id = crypto.randomBytes(8).toString('hex');
  const job = {
    id,
    status: 'pending',
    createdAt: Date.now(),
    result: null,
    error: null,
  };
  jobs.set(id, job);
  pruneJobs();

  setImmediate(() => {
    job.status = 'running';
    Promise.resolve()
      .then(() => runner())
      .then((result) => {
        job.status = 'done';
        job.result = result;
      })
      .catch((err) => {
        job.status = 'failed';
        job.error = err?.message || String(err);
      });
  });

  return id;
}

function getExportJob(id) {
  return jobs.get(String(id)) || null;
}

function shouldSuggestDeferredExport(estimatedRows) {
  const threshold = parseInt(process.env.EXPORT_DEFER_THRESHOLD_ROWS || '8000', 10);
  return Number.isFinite(estimatedRows) && estimatedRows > threshold;
}

module.exports = { enqueueExportJob, getExportJob, shouldSuggestDeferredExport };
