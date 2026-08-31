const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('tokenRevocation persistance', () => {
  it('persiste et détecte un jti révoqué', () => {
    const { revokeToken, isTokenRevoked, initTokenRevocationFromDisk } = require('../utils/tokenRevocation');
    const exp = Date.now() + 60_000;
    revokeToken('jti-test-1', exp);
    assert.strictEqual(isTokenRevoked('jti-test-1'), true);
    initTokenRevocationFromDisk();
    assert.strictEqual(isTokenRevoked('jti-test-1'), true);
  });
});
