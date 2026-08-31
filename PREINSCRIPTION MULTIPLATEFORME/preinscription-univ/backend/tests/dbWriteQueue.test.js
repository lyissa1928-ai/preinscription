const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runWithDbLockSync } = require('../utils/dbWriteQueue');

describe('dbWriteQueue', () => {
  it('runWithDbLockSync est réentrant sur le même fichier', () => {
    const base = path.join(os.tmpdir(), `uni-lock-${Date.now()}.json`);
    fs.writeFileSync(base, '{}');
    let n = 0;
    runWithDbLockSync(base, () => {
      n += 1;
      runWithDbLockSync(base, () => {
        n += 2;
      });
    });
    assert.equal(n, 3);
    fs.unlinkSync(base);
    try {
      fs.rmdirSync(`${base}.write-lock`);
    } catch {
      /* ok */
    }
  });
});
