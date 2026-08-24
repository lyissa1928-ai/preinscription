const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sanitizeChatAttachment, CHAT_UPLOAD_DIR } = require('../utils/chatAttachment');

const TMP_NAME = `test-${Date.now()}.pdf`;
const TMP_ABS = path.join(CHAT_UPLOAD_DIR, TMP_NAME);

describe('chatAttachment.sanitizeChatAttachment', () => {
  before(() => {
    fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(TMP_ABS, '%PDF-1.4 test');
  });
  after(() => {
    try { fs.unlinkSync(TMP_ABS); } catch { /* ignore */ }
  });

  it('pas de pièce jointe -> ni attachment ni invalid', () => {
    const r = sanitizeChatAttachment(null);
    assert.equal(r.attachment, null);
    assert.equal(r.invalid, false);
  });

  it('URL hors chat-attachments -> invalide', () => {
    const r = sanitizeChatAttachment({ url: '/uploads/1774287072389-vol.pdf' });
    assert.equal(r.attachment, null);
    assert.equal(r.invalid, true);
  });

  it('URL externe -> invalide', () => {
    const r = sanitizeChatAttachment({ url: 'https://evil.example/x.pdf' });
    assert.equal(r.invalid, true);
  });

  it('traversal dans le nom -> invalide', () => {
    const r = sanitizeChatAttachment({ url: '/uploads/chat-attachments/../../secret.json' });
    assert.equal(r.invalid, true);
  });

  it('fichier inexistant -> invalide', () => {
    const r = sanitizeChatAttachment({ url: '/uploads/chat-attachments/nope-does-not-exist.pdf' });
    assert.equal(r.invalid, true);
  });

  it('fichier réellement présent -> accepté et normalisé', () => {
    const r = sanitizeChatAttachment({
      url: `/uploads/chat-attachments/${TMP_NAME}`,
      name: 'facture.pdf',
      mime: 'application/pdf',
      size: 1234,
    });
    assert.equal(r.invalid, false);
    assert.ok(r.attachment);
    assert.equal(r.attachment.url, `/uploads/chat-attachments/${TMP_NAME}`);
    assert.equal(r.attachment.original_name, 'facture.pdf');
    assert.equal(r.attachment.mime, 'application/pdf');
    assert.equal(r.attachment.size, 1234);
  });
});
