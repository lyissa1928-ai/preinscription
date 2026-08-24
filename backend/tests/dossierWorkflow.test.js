const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  DOSSIER_STATUSES,
  canTransitionDossierStatus,
  requiresRejectionComment,
} = require('../utils/dossierWorkflow');

describe('dossierWorkflow', () => {
  it('expose les statuts attendus', () => {
    assert.deepEqual(DOSSIER_STATUSES, ['en_attente', 'en_cours', 'accepte', 'refuse']);
  });

  it('autorise en_attente -> en_cours et accepte', () => {
    assert.equal(canTransitionDossierStatus('en_attente', 'en_cours'), true);
    assert.equal(canTransitionDossierStatus('en_attente', 'accepte'), true);
  });

  it('refuse les transitions invalides', () => {
    assert.equal(canTransitionDossierStatus('accepte', 'en_cours'), false);
    assert.equal(canTransitionDossierStatus('en_cours', 'en_attente'), false);
  });

  it('exige un commentaire pour refus', () => {
    assert.equal(requiresRejectionComment('refuse'), true);
    assert.equal(requiresRejectionComment('accepte'), false);
  });
});
