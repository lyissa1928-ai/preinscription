const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('chatRetention config', () => {
  it('expose des limites positives', () => {
    const { chatRetentionConfig } = require('../utils/chatRetention');
    const cfg = chatRetentionConfig();
    assert.ok(cfg.retentionDays > 0);
    assert.ok(cfg.maxPerConversation > 0);
    assert.ok(cfg.maxTotalMessages > 0);
  });
});

describe('getMessagesForConversation pagination', () => {
  it('retourne messages et has_more', () => {
    const chatStore = require('../database/chatStore');
    const key = '__test_pagination__';
    const existing = (chatStore.chatDb.get('messages').value() || []).filter(
      (m) => m.conversation_key !== key,
    );
    const seeded = [];
    for (let i = 0; i < 5; i += 1) {
      seeded.push({
        id: 900000 + i,
        conversation_key: key,
        etablissement_id: 1,
        sender_id: 1,
        body: `t${i}`,
        created_at: new Date(Date.now() - (5 - i) * 1000).toISOString(),
      });
    }
    chatStore.chatDb.set('messages', [...existing, ...seeded]).write();
    const out = chatStore.getMessagesForConversation(key, { limit: 3 });
    assert.strictEqual(out.messages.length, 3);
    assert.strictEqual(out.has_more, true);
    chatStore.chatDb.set('messages', existing).write();
  });
});
