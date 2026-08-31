const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFactureSupprimee,
  isFactureVisiblePourConsultation,
} = require('../utils/factureVisibility');

describe('factureVisibility', () => {
  it('masque les factures soft-deleted', () => {
    assert.equal(isFactureSupprimee({ deleted_at: '2025-01-01' }), true);
    assert.equal(isFactureVisiblePourConsultation({ deleted_at: '2025-01-01' }), false);
    assert.equal(isFactureVisiblePourConsultation({ numero: 'F-1' }), true);
  });
});
