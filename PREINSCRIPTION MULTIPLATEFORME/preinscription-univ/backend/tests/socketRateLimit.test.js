const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { socketRateLimit, resetSocketRateLimitForTests } = require('../utils/socketRateLimit');

describe('socketRateLimit', () => {
  beforeEach(() => resetSocketRateLimitForTests());

  it('limite les envois successifs', () => {
    const key = 'u:1';
    assert.strictEqual(socketRateLimit(key, { max: 2 }).allowed, true);
    assert.strictEqual(socketRateLimit(key, { max: 2 }).allowed, true);
    assert.strictEqual(socketRateLimit(key, { max: 2 }).allowed, false);
  });
});
