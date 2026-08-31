const { describe, it } = require('node:test');
const assert = require('node:assert');
const { EXPORT_LIMITS, capArray } = require('../utils/exportLimits');

describe('exportLimits', () => {
  it('capArray tronque avec flag', () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    const { items, truncated, total } = capArray(arr, 10, 'rows');
    assert.strictEqual(items.length, 10);
    assert.strictEqual(truncated, true);
    assert.strictEqual(total, 20);
  });

  it('limites export définies', () => {
    assert.ok(EXPORT_LIMITS.maxExcelRowsPerSheet > 0);
    assert.ok(EXPORT_LIMITS.maxFacturesHtmlExport > 0);
  });
});
