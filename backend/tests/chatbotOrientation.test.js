/**
 * Tests qualité chatbot orientation (RAG ancré catalogue).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { detectIntent, INTENTS } = require('../services/chatbot/intent');
const { searchFormations } = require('../services/chatbot/searchFormations');
const { handleChatbotMessage } = require('../services/chatbot/orchestrator');

describe('chatbot intent', () => {
  it('détecte informatique malgré faute', () => {
    const a = detectIntent('kel formation en informatique avez vous');
    assert.equal(a.intent, INTENTS.LIST_FORMATIONS);
    assert.ok(a.domains.some((d) => d.id === 'informatique'));
  });

  it('détecte recommandation projet pro', () => {
    const a = detectIntent('Je veux travailler dans la cybersécurité');
    assert.equal(a.intent, INTENTS.RECOMMEND);
  });

  it('détecte hors sujet', () => {
    const a = detectIntent('Quelle est la capitale du Japon ?');
    assert.equal(a.intent, INTENTS.OFF_TOPIC);
  });
});

describe('chatbot search RAG', () => {
  it('trouve licence informatique (ESCOA etab 2)', () => {
    const r = searchFormations({ query: 'informatique', etablissementId: 2, limit: 5 });
    assert.ok(r.results.length >= 1);
    assert.ok(r.results.every((f) => f.etablissement_id === 2));
    assert.ok(r.results.some((f) => /informatique/i.test(f.titre)));
  });

  it('ne mélange pas etab 1 et etab 2 si scoped', () => {
    const r = searchFormations({ query: 'informatique', etablissementId: 1, limit: 5 });
    assert.ok(r.results.every((f) => f.etablissement_id === 1));
    assert.ok(!r.results.some((f) => /informatique/i.test(f.titre)) || r.results.length === 0);
  });

  it('astronautique → pas de faux positif inventé', () => {
    const r = searchFormations({ query: 'licence astronautique', etablissementId: 2, limit: 5 });
    assert.ok(!r.results.some((f) => /astronaut/i.test(f.titre)));
  });
});

describe('chatbot orchestrator e2e', () => {
  it('répond formations informatique', async () => {
    const res = await handleChatbotMessage({
      message: 'Quelles sont vos formations en informatique ?',
      sessionId: 'test-info-1',
      etablissementId: 2,
    });
    assert.equal(res.ok, true);
    assert.ok(res.formations.length >= 1);
    assert.ok(res.formations.every((f) => f.etablissement_id === 2));
    assert.match(res.reply, /informatique/i);
    assert.equal(res.meta.invented, false);
  });

  it('refuse d inventer astronautique', async () => {
    const res = await handleChatbotMessage({
      message: 'Avez-vous une licence en astronautique ?',
      sessionId: 'test-astro-1',
      etablissementId: 2,
    });
    assert.equal(res.ok, true);
    assert.equal(res.formations.length, 0);
    assert.ok(res.meta.no_match || /ne (trouve|dispose)/i.test(res.reply));
  });

  it('hors sujet capitale', async () => {
    const res = await handleChatbotMessage({
      message: 'Quelle est la capitale du Japon ?',
      sessionId: 'test-off-1',
      etablissementId: 2,
    });
    assert.equal(res.intent, INTENTS.OFF_TOPIC);
    assert.ok(!/Tokyo/i.test(res.reply));
  });

  it('contexte suivi durée', async () => {
    const s = 'test-ctx-duree';
    const first = await handleChatbotMessage({
      message: 'Je cherche une formation en informatique',
      sessionId: s,
      etablissementId: 2,
    });
    assert.ok(first.formations.length >= 1);
    const second = await handleChatbotMessage({
      message: 'Et combien de temps dure cette formation ?',
      sessionId: s,
      etablissementId: 2,
    });
    assert.equal(second.ok, true);
    assert.ok(second.formations.length >= 1);
    assert.match(second.reply, /durée|ans|mois/i);
  });

  it('cybersécurité : pas de formation inventée', async () => {
    const res = await handleChatbotMessage({
      message: 'Je veux faire de la cybersécurité. Quelle formation ?',
      sessionId: 'test-cyber-1',
      etablissementId: 2,
    });
    assert.equal(res.ok, true);
    assert.ok(!res.formations.some((f) => /cyber/i.test(f.titre)));
    // Peut proposer informatique proche ou no_match — jamais inventer cyber
    if (res.formations.length) {
      assert.ok(res.formations.every((f) => f.etablissement_id === 2));
      assert.match(res.reply, /ne dispose pas|catalogue|informatique|proche/i);
    }
  });

  it('débouchés marqués orientation générale', async () => {
    const s = 'test-careers-1';
    await handleChatbotMessage({
      message: 'formations informatique',
      sessionId: s,
      etablissementId: 2,
    });
    const res = await handleChatbotMessage({
      message: 'Quels sont les débouchés de cette formation ?',
      sessionId: s,
      etablissementId: 2,
    });
    assert.equal(res.ok, true);
    assert.match(res.reply, /catalogue|base|description|Non renseign/i);
    assert.ok(!/garantit/i.test(res.reply));
    assert.ok(!/responsable pédagogique/i.test(res.reply));
  });
});
