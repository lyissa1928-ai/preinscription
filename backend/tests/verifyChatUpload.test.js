const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { verifyChatUploadBuffer } = require('../utils/verifyUploadedFile');

describe('verifyChatUploadBuffer', () => {
  it('refuse les SVG', async () => {
    const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const r = await verifyChatUploadBuffer(buf, '.svg');
    assert.equal(r.ok, false);
  });

  it('accepte un PDF minimal', async () => {
    const buf = Buffer.from('%PDF-1.4\n');
    const r = await verifyChatUploadBuffer(buf, '.pdf');
    assert.equal(r.ok, true);
  });
});
