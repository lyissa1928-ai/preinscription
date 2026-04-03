/**
 * Synchronisation automatique vers GitHub
 * Surveille les changements et push automatiquement
 * Lancer : node auto-sync.js  ou  pnpm sync:auto
 */

const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = __dirname;
const DELAY_MS = 10000; // 10 secondes après le dernier changement
const IGNORE = ['node_modules', '.git', '.next', 'dist', 'build'];

let timeout = null;

function sync() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Synchronisation...`);
    execSync('git add .', { cwd: ROOT, stdio: 'pipe' });
    const status = execSync('git status --short', { cwd: ROOT, encoding: 'utf8' });
    if (!status.trim()) {
      console.log('Aucun changement.');
      return;
    }
    execSync('git commit -m "Auto-sync: mise a jour automatique"', { cwd: ROOT, stdio: 'pipe' });
    execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });
    console.log('[OK] Synchronisation terminee.');
  } catch (e) {
    const msg = e.stderr?.toString() || e.stdout?.toString() || e.message || '';
    if (msg.includes('nothing to commit') || msg.includes('no changes')) {
      console.log('Aucun changement a committer.');
    } else {
      console.error('Erreur:', msg || e);
    }
  }
}

function scheduleSync() {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    sync();
    timeout = null;
  }, DELAY_MS);
}

const watcher = chokidar.watch(ROOT, {
  ignored: (p) => {
    const rel = path.relative(ROOT, p);
    return IGNORE.some((i) => rel.startsWith(i) || rel.includes(`/${i}/`));
  },
  persistent: true,
  ignoreInitial: true,
});

watcher.on('change', (p) => {
  console.log(`[${new Date().toLocaleTimeString()}] Changement: ${path.relative(ROOT, p)}`);
  scheduleSync();
});

watcher.on('add', (p) => {
  console.log(`[${new Date().toLocaleTimeString()}] Nouveau: ${path.relative(ROOT, p)}`);
  scheduleSync();
});

watcher.on('unlink', (p) => {
  console.log(`[${new Date().toLocaleTimeString()}] Supprime: ${path.relative(ROOT, p)}`);
  scheduleSync();
});

console.log('========================================');
console.log('  Auto-sync GitHub actif');
console.log('  Surveille:', ROOT);
console.log('  Push automatique 10 secondes apres le dernier changement');
console.log('  Arreter: Ctrl+C');
console.log('========================================\n');
