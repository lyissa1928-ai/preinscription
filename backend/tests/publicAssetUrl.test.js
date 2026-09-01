const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAssetPath, publicAssetUrl } = require('../utils/publicAssetUrl');

describe('publicAssetUrl', () => {
  it('normalise une URL localhost vers /uploads/...', () => {
    assert.equal(
      normalizeAssetPath('http://localhost:5000/uploads/etablissements/logo.png'),
      '/uploads/etablissements/logo.png',
    );
  });

  it('construit une URL absolue depuis la requête', () => {
    const req = {
      protocol: 'http',
      get: (h) => (h === 'host' ? 'example.com' : undefined),
      headers: { 'x-forwarded-proto': 'https' },
    };
    assert.equal(
      publicAssetUrl(req, '/uploads/etablissements/x.png'),
      'https://example.com/uploads/etablissements/x.png',
    );
  });
});
