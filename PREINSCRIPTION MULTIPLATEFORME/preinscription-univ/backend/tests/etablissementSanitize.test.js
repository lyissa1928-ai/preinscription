const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { stripEtabSensitiveFields, etabForRole } = require('../utils/etablissementSanitize');

const etab = {
  id: 1,
  nom: 'ESEBAT',
  email_contact: 'x@esebat.com',
  ninea: '41591422V2',
  rc: 'SN-DKR2010',
  compte_bancaire: 'SN094-0100...',
  banque: 'ECOBANK',
  iban: 'SN00...',
  swift: 'ECOCSNDAXXX',
};

describe('etablissementSanitize.stripEtabSensitiveFields', () => {
  it('retire les champs bancaires', () => {
    const out = stripEtabSensitiveFields(etab);
    assert.equal(out.compte_bancaire, undefined);
    assert.equal(out.banque, undefined);
    assert.equal(out.iban, undefined);
    assert.equal(out.swift, undefined);
  });

  it('conserve les champs non sensibles', () => {
    const out = stripEtabSensitiveFields(etab);
    assert.equal(out.nom, 'ESEBAT');
    assert.equal(out.email_contact, 'x@esebat.com');
    assert.equal(out.ninea, '41591422V2');
  });

  it('ne mute pas la source', () => {
    stripEtabSensitiveFields(etab);
    assert.equal(etab.compte_bancaire, 'SN094-0100...');
  });
});

describe('etablissementSanitize.etabForRole', () => {
  it('admin : garde les champs bancaires', () => {
    assert.equal(etabForRole(etab, 'admin').compte_bancaire, 'SN094-0100...');
  });
  it('non-admin : masque les champs bancaires', () => {
    assert.equal(etabForRole(etab, 'etudiant').compte_bancaire, undefined);
    assert.equal(etabForRole(etab, 'responsable').iban, undefined);
  });
});
