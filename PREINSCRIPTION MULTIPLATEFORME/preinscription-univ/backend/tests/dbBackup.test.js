const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('dbBackup (smoke)', () => {
  let tmpDir;
  let originalDbPath;
  let originalBackupDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'univ-backup-'));
    const dbBackup = require('../utils/dbBackup');
    originalDbPath = dbBackup.DB_PATH;
    originalBackupDir = dbBackup.BACKUP_DIR;
  });

  after(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('exporte createBackup et runFullBackup', () => {
    const dbBackup = require('../utils/dbBackup');
    assert.equal(typeof dbBackup.createBackup, 'function');
    assert.equal(typeof dbBackup.runFullBackup, 'function');
    assert.equal(typeof dbBackup.createUploadsBackup, 'function');
  });
});
