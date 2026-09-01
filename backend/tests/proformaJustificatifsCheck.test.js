const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { demandeProformaJustificatifsComplets } = require('../utils/proformaJustificatifsCheck')

describe('demandeProformaJustificatifsComplets', () => {
  it('retourne false si demande absente', () => {
    assert.equal(demandeProformaJustificatifsComplets(null), false)
  })

  it('retourne false si justificatifs absents', () => {
    assert.equal(demandeProformaJustificatifsComplets({}), false)
  })

  it('retourne false si une pièce manque', () => {
    assert.equal(
      demandeProformaJustificatifsComplets({
        justificatifs: { diplome: '/a.pdf', releve: '/b.pdf', formation: '' },
      }),
      false
    )
  })

  it('retourne true si les trois chemins sont renseignés (compte candidat)', () => {
    assert.equal(
      demandeProformaJustificatifsComplets({
        justificatifs: {
          diplome: '/uploads/d.pdf',
          releve: '/uploads/r.pdf',
          formation: '/uploads/f.pdf',
        },
      }),
      true
    )
  })

  it('retourne true pour demande sans compte (identité + diplôme)', () => {
    assert.equal(
      demandeProformaJustificatifsComplets({
        source: 'public_distant',
        justificatifs: {
          identite: '/uploads/id.pdf',
          diplome: '/uploads/d.pdf',
        },
      }),
      true
    )
  })
})
