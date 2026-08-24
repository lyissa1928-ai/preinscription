const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Évite une sauvegarde autostart lors du chargement de db dans les tests
process.env.SKIP_DB_AUTOSTART_BACKUP = '1';

test('runHealthChecks retourne une structure cohérente', () => {
  const { runHealthChecks } = require(path.join(__dirname, '..', 'utils', 'healthCheck'));
  const h = runHealthChecks();
  assert.strictEqual(typeof h.ok, 'boolean');
  assert.ok(h.json_file && typeof h.json_file.ok === 'boolean');
  assert.ok(h.database && typeof h.database.ok === 'boolean');
  assert.ok(h.uploads && typeof h.uploads.ok === 'boolean');
  assert.ok(h.chat_file && typeof h.chat_file.ok === 'boolean');
  assert.ok(h.disk && typeof h.disk.ok === 'boolean');
  assert.ok(h.socket_io && typeof h.socket_io.ok === 'boolean');
  assert.ok(h.maintenance && typeof h.maintenance.ok === 'boolean');
});
