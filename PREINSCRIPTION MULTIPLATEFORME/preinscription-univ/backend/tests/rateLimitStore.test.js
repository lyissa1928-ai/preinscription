const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { checkRateLimit, resetMemoryStoreForTests } = require('../utils/rateLimitStore');

describe('rateLimitStore (mémoire)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    resetMemoryStoreForTests();
  });

  it('bloque après max hits', async () => {
    const key = 'test-key';
    const opts = { windowMs: 60_000, max: 2 };
    const r1 = await checkRateLimit(key, opts.windowMs, opts.max);
    const r2 = await checkRateLimit(key, opts.windowMs, opts.max);
    const r3 = await checkRateLimit(key, opts.windowMs, opts.max);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r3.allowed, false);
    assert.ok(r3.retryAfterSec > 0);
  });
});
