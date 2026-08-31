const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { creerDossierGuichet, tarifFromFormation } = require('../services/staffGuichetDossierService');
const { resolveCandidatIdentite } = require('../utils/candidatIdentite');
const db = require('../database/db');

describe('identité dossier', () => {
  it('priorise les champs du dossier sur le compte', () => {
    const id = resolveCandidatIdentite(
      { prenom: 'Awa', nom: 'Diop', email: 'awa@test.sn' },
      { prenom: 'Autre', nom: 'X', email: 'x@test.sn' },
    );
    assert.equal(id.prenom, 'Awa');
    assert.equal(id.nom, 'Diop');
  });
});

describe('guichet préinscription', () => {
  it('refuse une formation hors établissement', () => {
    const formation = (db.get('formations').value() || []).find((f) => Number(f.etablissement_id) === 2 && f.actif !== false);
    assert.ok(formation);
    const r = creerDossierGuichet({
      staffUser: { id: 2, role: 'responsable', etablissement_id: 1 },
      body: {
        prenom: 'Test',
        nom: 'Scope',
        telephone: '771112233',
        formation_id: formation.id,
        date_naissance: '2000-01-01',
        lieu_naissance: 'Dakar',
        nationalite: 'Sénégalaise',
        adresse: 'Dakar',
        dernier_diplome: 'Baccalauréat',
        etablissement_origine: 'Lycée',
        annee_obtention: 2020,
        annee_academique: '2025-2026',
      },
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
  });

  it('crée un dossier walk-in avec tarif catalogue et facture', () => {
    const formation = (db.get('formations').value() || []).find((f) => Number(f.etablissement_id) === 1 && f.actif !== false);
    assert.ok(formation);
    const tel = `77${Date.now().toString().slice(-8)}`;
    const r = creerDossierGuichet({
      staffUser: { id: 1, role: 'admin', etablissement_id: null },
      body: {
        prenom: 'Moussa',
        nom: 'Ba',
        telephone: tel,
        email: `moussa.guichet.${Date.now()}@test.sn`,
        formation_id: formation.id,
        date_naissance: '2001-05-05',
        lieu_naissance: 'Saint-Louis',
        nationalite: 'Sénégalaise',
        adresse: 'Dakar',
        dernier_diplome: 'Baccalauréat',
        etablissement_origine: 'Lycée',
        annee_obtention: 2021,
        annee_academique: '2025-2026',
        sexe: 'M',
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.dossier.etudiant_id, null);
    assert.equal(r.dossier.source, 'staff');
    assert.equal(r.dossier.statut, 'accepte');
    assert.ok(r.facture?.numero);
    assert.equal(r.facture.etudiant_snapshot.prenom, 'Moussa');
    const tarif = tarifFromFormation(formation);
    assert.equal(r.facture.montant_ttc, tarif.prix_annuel);
  });

  it('crée une facture proforma guichet avec identité allégée', () => {
    const formation = (db.get('formations').value() || []).find((f) => Number(f.etablissement_id) === 1 && f.actif !== false);
    assert.ok(formation);
    const tel = `77${Date.now().toString().slice(-7)}1`;
    const r = creerDossierGuichet({
      staffUser: { id: 1, role: 'admin', etablissement_id: null },
      body: {
        prenom: 'Awa',
        nom: 'Sow',
        telephone: tel,
        email: `awa.proforma.${Date.now()}@test.sn`,
        formation_id: formation.id,
        type_document: 'proforma',
        type_payeur: 'organisation',
        destinataire: 'Ministère du Travail',
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.facture.type_document, 'proforma');
    assert.equal(r.dossier.type_payeur, 'organisation');
    assert.equal(r.dossier.payeur.org_nom, 'Ministère du Travail');
    assert.equal(r.facture.type_payeur, 'organisation');
  });

  it('ne duplique pas le même candidat / formation', () => {
    const formation = (db.get('formations').value() || []).find((f) => Number(f.etablissement_id) === 1 && f.actif !== false);
    const tel = `76${Date.now().toString().slice(-8)}`;
    const body = {
      prenom: 'Fatou',
      nom: 'Ndiaye',
      telephone: tel,
      formation_id: formation.id,
      date_naissance: '1999-02-02',
      lieu_naissance: 'Thiès',
      nationalite: 'Sénégalaise',
      adresse: 'Thiès',
      dernier_diplome: 'Baccalauréat',
      etablissement_origine: 'Lycée',
      annee_obtention: 2019,
      annee_academique: '2025-2026',
    };
    const a = creerDossierGuichet({ staffUser: { id: 1, role: 'admin' }, body });
    const b = creerDossierGuichet({ staffUser: { id: 1, role: 'admin' }, body });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(b.reused, true);
    assert.equal(b.dossier.id, a.dossier.id);
  });
});

describe('documents officiels', () => {
  const { canIssueOfficialDocs } = require('../utils/canIssueOfficialDocs');
  it('autorise un dossier guichet staff', () => {
    assert.equal(canIssueOfficialDocs({ source: 'staff', statut: 'en_attente' }), true);
  });
  it('autorise un dossier accepté', () => {
    assert.equal(canIssueOfficialDocs({ statut: 'accepte' }), true);
  });
});
