const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests purs sur la logique de décision (sans DB) : on vérifie les garde-fous
 * de validation des champs saisie libre via un double de la validation inline.
 * Les tests d'intégration smoke couvrent le flux avec DB.
 */

function validateSaisieLibre({ prenom, nom, telephone, email }) {
  const p = String(prenom || '').trim();
  const n = String(nom || '').trim();
  const t = String(telephone || '').trim();
  const e = String(email || '').trim().toLowerCase();
  if (!p || !n) return { ok: false, message: 'Nom et prénom obligatoires.' };
  if (!t || t.replace(/\D/g, '').length < 8) {
    return { ok: false, message: 'Téléphone obligatoire (8 chiffres minimum).' };
  }
  if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    return { ok: false, message: 'Email invalide.' };
  }
  return { ok: true, prenom: p, nom: n, telephone: t, email: e };
}

describe('proforma saisie libre (validation)', () => {
  it('accepte une personne sans compte', () => {
    const r = validateSaisieLibre({
      prenom: 'Awa',
      nom: 'Diop',
      telephone: '771234567',
      email: '',
    });
    assert.equal(r.ok, true);
  });

  it('refuse sans téléphone', () => {
    const r = validateSaisieLibre({ prenom: 'Awa', nom: 'Diop', telephone: '' });
    assert.equal(r.ok, false);
  });

  it('refuse email invalide', () => {
    const r = validateSaisieLibre({
      prenom: 'Awa',
      nom: 'Diop',
      telephone: '771234567',
      email: 'pas-un-email',
    });
    assert.equal(r.ok, false);
  });

  it('email optionnel', () => {
    const r = validateSaisieLibre({
      prenom: 'Awa',
      nom: 'Diop',
      telephone: '77 123 45 67',
    });
    assert.equal(r.ok, true);
  });
});
