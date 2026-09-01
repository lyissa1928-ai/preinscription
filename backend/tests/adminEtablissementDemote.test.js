const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  demotePatchFromAdminEtab,
  promotePatchToAdminEtab,
} = require('../utils/adminEtablissement');

describe('adminEtablissement — rétrogradation rôle', () => {
  it('restaure le rôle d’origine à la rétrogradation', () => {
    const patch = demotePatchFromAdminEtab({
      role: 'admin_etablissement',
      role_before_admin_etab: 'comptable',
    });
    assert.equal(patch.role, 'comptable');
    assert.equal(patch.role_before_admin_etab, null);
  });

  it('fallback agent_admin si pas de rôle mémorisé', () => {
    const patch = demotePatchFromAdminEtab({ role: 'admin_etablissement' });
    assert.equal(patch.role, 'agent_admin');
  });

  it('mémorise le rôle avant promotion', () => {
    const patch = promotePatchToAdminEtab({ role: 'comptable' });
    assert.equal(patch.role, 'admin_etablissement');
    assert.equal(patch.role_before_admin_etab, 'comptable');
  });

  it('ne remplace pas role_before si déjà admin étab.', () => {
    const patch = promotePatchToAdminEtab({
      role: 'admin_etablissement',
      role_before_admin_etab: 'comptable',
    });
    assert.equal(patch.role, 'admin_etablissement');
    assert.equal(patch.role_before_admin_etab, undefined);
  });
});
