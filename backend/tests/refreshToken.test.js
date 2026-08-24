const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const STORE = path.join(__dirname, '..', 'database', 'auth-sessions-test.json');

before(() => {
  process.env.SKIP_DB_AUTOSTART_BACKUP = '1';
  if (fs.existsSync(STORE)) fs.unlinkSync(STORE);
});

after(() => {
  try {
    if (fs.existsSync(STORE)) fs.unlinkSync(STORE);
  } catch {
    /* ignore */
  }
});

describe('authSessionStore refresh', () => {
  it('crée, valide et révoque un refresh token', () => {
    const storePath = path.join(__dirname, '..', 'database', 'auth-sessions.json');
    const {
      createRefreshToken,
      validateRefreshToken,
      revokeRefreshToken,
      rotateRefreshToken,
    } = require('../database/authSessionStore');

    const { refreshToken } = createRefreshToken(42);
    assert.ok(refreshToken);
    const row = validateRefreshToken(refreshToken);
    assert.strictEqual(row.user_id, 42);

    const rotated = rotateRefreshToken(refreshToken, 42);
    assert.ok(rotated.refreshToken);
    assert.strictEqual(validateRefreshToken(refreshToken), null);

    revokeRefreshToken(rotated.refreshToken);
    assert.strictEqual(validateRefreshToken(rotated.refreshToken), null);
    assert.ok(fs.existsSync(storePath));
  });
});
