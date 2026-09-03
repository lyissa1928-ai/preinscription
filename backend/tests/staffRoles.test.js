const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  canManageEtabMembres,
  canManageTargetMembre,
  rolesCreatablesMembres,
  isAdminEtablissement,
} = require('../utils/staffRoles');

describe('staffRoles — admin_etablissement', () => {
  const etab = { id: 5, responsable_id: 99 };

  it('admin plateforme gère tous les établissements', () => {
    assert.equal(canManageEtabMembres({ role: 'admin' }, 5), true);
    assert.equal(canManageEtabMembres({ role: 'admin' }, 99), true);
  });

  it('admin établissement limité à son établissement', () => {
    const u = { id: 10, role: 'admin_etablissement', etablissement_id: 5 };
    assert.equal(isAdminEtablissement(u), true);
    assert.equal(canManageEtabMembres(u, 5), true);
    assert.equal(canManageEtabMembres(u, 6), false);
  });

  it('responsable ne gère plus les membres', () => {
    const u = { id: 11, role: 'responsable', etablissement_id: 5 };
    assert.equal(canManageEtabMembres(u, 5), false);
  });

  it('rôles créables par admin établissement', () => {
    const u = { id: 10, role: 'admin_etablissement', etablissement_id: 5 };
    const roles = rolesCreatablesMembres(u);
    assert.deepEqual(
      roles.sort(),
      ['agent_admin', 'agent_fad', 'comptable', 'controleur_qualite', 'responsable', 'responsable_fad'].sort(),
    );
    assert.equal(roles.includes('admin_etablissement'), false);
  });

  it('admin étab. ne peut pas gérer un autre admin étab.', () => {
    const actor = { id: 10, role: 'admin_etablissement', etablissement_id: 5 };
    const target = { id: 20, role: 'admin_etablissement', etablissement_id: 5 };
    assert.equal(canManageTargetMembre(actor, target, etab), false);
  });

  it('admin étab. peut gérer un agent', () => {
    const actor = { id: 10, role: 'admin_etablissement', etablissement_id: 5 };
    const target = { id: 30, role: 'agent_admin', etablissement_id: 5 };
    assert.equal(canManageTargetMembre(actor, target, etab), true);
  });
});
