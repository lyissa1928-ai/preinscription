const { describe, it } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-phase4';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';

const {
  signAccessToken,
  verifyAccessToken,
  accessExpiresInSeconds,
} = require('../utils/jwtHelpers');

describe('jwtHelpers', () => {
  it('signe et vérifie un access token avec jti', () => {
    const { token, jti } = signAccessToken({ id: 1, role: 'admin' });
    assert.ok(jti);
    const decoded = verifyAccessToken(token);
    assert.strictEqual(decoded.id, 1);
    assert.strictEqual(decoded.typ, 'access');
    assert.strictEqual(decoded.jti, jti);
  });

  it('accessExpiresInSeconds est positif', () => {
    assert.ok(accessExpiresInSeconds() >= 60);
  });

  it('rejette un token expiré', () => {
    const token = jwt.sign({ id: 1, jti: 'x' }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.throws(() => verifyAccessToken(token));
  });
});
