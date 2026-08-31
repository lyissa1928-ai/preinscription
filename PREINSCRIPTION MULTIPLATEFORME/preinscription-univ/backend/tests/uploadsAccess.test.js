const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeUploadPath,
  isPublicUploadPath,
  decideUploadAccess,
} = require('../utils/uploadsAccess');

describe('uploadsAccess.normalizeUploadPath', () => {
  it('normalise un chemin simple', () => {
    assert.deepEqual(normalizeUploadPath('/photo.jpg'), { ok: true, rel: 'photo.jpg' });
  });
  it('rejette le path traversal', () => {
    assert.equal(normalizeUploadPath('/../database/preinscription.json').ok, false);
  });
  it('rejette le traversal encodé', () => {
    assert.equal(normalizeUploadPath('/..%2Fsecret').ok, false);
  });
  it('rejette un chemin vide', () => {
    assert.equal(normalizeUploadPath('/').ok, false);
  });
});

describe('uploadsAccess.isPublicUploadPath', () => {
  it('logos établissements = public', () => {
    assert.equal(isPublicUploadPath('etablissements/logo.png'), true);
  });
  it('document racine != public', () => {
    assert.equal(isPublicUploadPath('1774287072389-x.pdf'), false);
  });
});

describe('uploadsAccess.decideUploadAccess', () => {
  const etudiant = { id: 5, role: 'etudiant', etablissement_id: 10 };
  const staff = { id: 8, role: 'responsable', etablissement_id: 10 };
  const admin = { id: 1, role: 'admin' };

  it('chat-attachments : tout authentifié', () => {
    assert.equal(decideUploadAccess('chat-attachments/x.pdf', etudiant).allow, true);
  });

  it('proforma-justificatifs : étudiant refusé', () => {
    const d = decideUploadAccess('proforma-justificatifs/x.pdf', etudiant);
    assert.equal(d.allow, false);
    assert.equal(d.status, 403);
  });

  it('proforma-justificatifs : staff autorisé', () => {
    assert.equal(decideUploadAccess('proforma-justificatifs/x.pdf', staff).allow, true);
  });

  it('admin accède à tout document racine', () => {
    assert.equal(decideUploadAccess('doc.pdf', admin).allow, true);
  });

  it('document inconnu (pas de dossier) -> 404 pour non-admin', () => {
    const d = decideUploadAccess('doc.pdf', staff, { doc: null, dossier: null, etabId: null });
    assert.equal(d.allow, false);
    assert.equal(d.status, 404);
  });

  it('étudiant : accède à SON dossier', () => {
    const ctx = { doc: {}, dossier: { etudiant_id: 5 }, etabId: 10 };
    assert.equal(decideUploadAccess('doc.pdf', etudiant, ctx).allow, true);
  });

  it('étudiant : refusé sur le dossier d’un autre', () => {
    const ctx = { doc: {}, dossier: { etudiant_id: 999 }, etabId: 10 };
    const d = decideUploadAccess('doc.pdf', etudiant, ctx);
    assert.equal(d.allow, false);
    assert.equal(d.reason, 'not_owner');
  });

  it('staff : accède aux dossiers de SON établissement', () => {
    const ctx = { doc: {}, dossier: { etudiant_id: 5 }, etabId: 10 };
    assert.equal(decideUploadAccess('doc.pdf', staff, ctx).allow, true);
  });

  it('staff : refusé cross-établissement', () => {
    const ctx = { doc: {}, dossier: { etudiant_id: 5 }, etabId: 20 };
    const d = decideUploadAccess('doc.pdf', staff, ctx);
    assert.equal(d.allow, false);
    assert.equal(d.reason, 'cross_etab');
  });

  it('sans utilisateur -> 401', () => {
    const d = decideUploadAccess('doc.pdf', null);
    assert.equal(d.allow, false);
    assert.equal(d.status, 401);
  });
});
