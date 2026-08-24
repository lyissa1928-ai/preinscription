const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, paginateArray, wantsPagination } = require('../utils/pagination');

describe('pagination', () => {
  it('plafonne limit à 100', () => {
    const p = parsePagination({ page: 1, limit: 500 });
    assert.equal(p.limit, 100);
  });

  it('paginateArray conserve le total', () => {
    const arr = Array.from({ length: 30 }, (_, i) => i);
    const r = paginateArray(arr, 2, 10);
    assert.equal(r.items.length, 10);
    assert.equal(r.pagination.total, 30);
    assert.equal(r.pagination.totalPages, 3);
  });

  it('wantsPagination détecte page/limit', () => {
    assert.equal(wantsPagination({}), false);
    assert.equal(wantsPagination({ page: '2' }), true);
  });
});
