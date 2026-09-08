#!/usr/bin/env node
/**
 * Usage :
 *   node scripts/purge-orphan-user-traces.js           # dry-run
 *   node scripts/purge-orphan-user-traces.js --apply   # exécute la purge
 */
const { purgeOrphanUserTraces } = require('../utils/purgeOrphanUserTraces');

const apply = process.argv.includes('--apply');
const { summary } = purgeOrphanUserTraces({ dryRun: !apply });
console.log(JSON.stringify(summary, null, 2));
if (!apply) {
  console.log('\nDry-run uniquement. Relancer avec --apply pour supprimer.');
  process.exit(0);
}
console.log('\nPurge appliquée.');
