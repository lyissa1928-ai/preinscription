const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { canChatWith } = require('../utils/chatRules');

const etudiant = { id: 1, role: 'etudiant', etablissement_id: 10 };
const respRole = { id: 2, role: 'responsable', etablissement_id: 10 };
const comptable = { id: 3, role: 'comptable', etablissement_id: 10, fonctions: [] };
const agent = { id: 5, role: 'agent_admin', etablissement_id: 10 };
const etudiant2 = { id: 6, role: 'etudiant', etablissement_id: 10 };

describe('chatRules.canChatWith — même établissement', () => {
  it('étudiant ↔ responsable : autorisé', () => {
    assert.equal(canChatWith(etudiant, respRole), true);
  });

  it('étudiant ↔ comptable / agent (personnel) : autorisé', () => {
    assert.equal(canChatWith(etudiant, comptable), true);
    assert.equal(canChatWith(comptable, etudiant), true);
    assert.equal(canChatWith(etudiant, agent), true);
  });

  it('étudiants entre eux : interdit', () => {
    assert.equal(canChatWith(etudiant, etudiant2), false);
  });

  it('autre établissement : interdit', () => {
    const autre = { ...comptable, etablissement_id: 20 };
    assert.equal(canChatWith(etudiant, autre), false);
  });

  it('staff ↔ staff inchangé', () => {
    assert.equal(canChatWith(comptable, respRole), true);
    assert.equal(canChatWith(agent, comptable), true);
  });
});
