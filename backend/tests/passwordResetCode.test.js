const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

function hashResetCode(email, code) {
  return crypto.createHash('sha256')
    .update(`${String(email).trim().toLowerCase()}:${String(code).trim()}`)
    .digest('hex');
}

describe('password reset code hashing', () => {
  it('est déterministe et sensible à l’e-mail', () => {
    const a = hashResetCode('A@x.com', '123456');
    const b = hashResetCode('a@x.com', '123456');
    const c = hashResetCode('a@x.com', '000000');
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 64);
  });
});
