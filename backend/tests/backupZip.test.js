const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUserDataZip,
  buildPlatformBackupZip,
  parseUploadedBackupZip,
} = require('../utils/backupZip');

describe('backupZip', () => {
  it('buildUserDataZip contient donnees.json et manifest format zip', () => {
    const donnees = { _exportType: 'etudiant', id: 1, prenom: 'Test' };
    const { buffer, filename, manifest } = buildUserDataZip(donnees, { included: ['Profil'] });
    assert.match(filename, /\.zip$/);
    assert.equal(manifest.format, 'uniportail-backup-zip');
    const parsed = parseUploadedBackupZip(buffer);
    assert.equal(parsed.kind, 'donnees');
    assert.equal(parsed.payload._exportType, 'etudiant');
  });

  it('parseUploadedBackupZip détecte une archive plateforme', () => {
    const db = { utilisateurs: [], _schemaVersion: 1 };
    const { buffer } = buildUserDataZip(db, {});
    const platform = buildPlatformBackupZip(undefined);
    const p = parseUploadedBackupZip(platform.buffer);
    assert.equal(p.kind, 'plateforme');
    assert.ok(Array.isArray(p.payload.utilisateurs) || p.payload._schemaVersion != null);
  });

  it('rejette un buffer vide', () => {
    assert.throws(() => parseUploadedBackupZip(Buffer.alloc(0)), /vide/);
  });
});
