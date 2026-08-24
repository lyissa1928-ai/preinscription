/**
 * Tests agent d’accueil scolarité.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { detectIntent, INTENTS } = require('../services/chatbot/intent');
const { handleChatbotMessage } = require('../services/chatbot/orchestrator');
const { saveConfig, getEffectiveConfig } = require('../services/chatbot/configStore');

describe('accueil intent', () => {
  it('détecte proforma', () => {
    assert.equal(detectIntent('Je voudrais une facture proforma').intent, INTENTS.PROFORMA);
  });

  it('détecte responsable formation', () => {
    assert.equal(
      detectIntent('Qui est le responsable de cette formation ?', { lastFormationIds: [10] }).intent,
      INTENTS.CONTACT_RESPONSABLE,
    );
  });

  it('détecte dirigeant établissement', () => {
    assert.equal(detectIntent('Qui dirige cet établissement ?').intent, INTENTS.CONTACT_ETAB);
  });

  it('détecte sélection ordinale', () => {
    const a = detectIntent('La deuxième m’intéresse', { lastFormationIds: [1, 2, 3] });
    assert.equal(a.intent, INTENTS.SELECT_ORDINAL);
    assert.equal(a.ordinalIndex, 1);
  });
});

describe('accueil scénarios', () => {
  it('formations catalogue', async () => {
    const res = await handleChatbotMessage({
      message: 'Quelles formations proposez-vous ?',
      sessionId: 'acc-f1',
      etablissementId: 2,
    });
    assert.equal(res.ok, true);
    assert.ok(res.formations.length >= 1);
  });

  it('cybersécurité sans invention', async () => {
    const res = await handleChatbotMessage({
      message: 'Je veux travailler dans la cybersécurité. Que me conseillez-vous ?',
      sessionId: 'acc-cyber',
      etablissementId: 2,
    });
    assert.ok(!res.formations.some((f) => /cyber/i.test(f.titre)));
  });

  it('proforma sans imposer de compte', async () => {
    const res = await handleChatbotMessage({
      message: 'Je ne suis pas encore étudiant, je peux quand même avoir une proforma ?',
      sessionId: 'acc-prof',
      etablissementId: 2,
    });
    assert.equal(res.intent, INTENTS.PROFORMA);
    assert.match(res.reply, /pas besoin|sans compte|n’avez \*\*pas besoin\*\*|pas.*compte/i);
    assert.ok(res.actions.some((a) => a.id === 'creer_proforma'));
  });

  it('hors périmètre salaire futur', async () => {
    const res = await handleChatbotMessage({
      message: 'Quel est le salaire moyen d’un ingénieur dans 20 ans ?',
      sessionId: 'acc-off',
      etablissementId: 2,
    });
    assert.equal(res.intent, INTENTS.OFF_TOPIC);
  });

  it('contact responsable après contexte', async () => {
    const s = 'acc-resp';
    await handleChatbotMessage({
      message: 'formations informatique',
      sessionId: s,
      etablissementId: 2,
    });
    const res = await handleChatbotMessage({
      message: 'Qui est le responsable de cette formation ?',
      sessionId: s,
      etablissementId: 2,
    });
    assert.equal(res.intent, INTENTS.CONTACT_RESPONSABLE);
    assert.ok(res.reply.length > 20);
    assert.ok(!/responsable pédagogique/i.test(res.reply));
  });

  it('sélection 2e formation', async () => {
    const s = 'acc-ord';
    const first = await handleChatbotMessage({
      message: 'Je cherche une formation en informatique',
      sessionId: s,
      etablissementId: 2,
    });
    assert.ok(first.formations.length >= 2);
    const second = await handleChatbotMessage({
      message: 'La deuxième m’intéresse',
      sessionId: s,
      etablissementId: 2,
    });
    assert.equal(second.intent, INTENTS.SELECT_ORDINAL);
    assert.equal(second.formations[0]?.id, first.formations[1]?.id);
  });

  it('config désactivation', () => {
    saveConfig({ enabled: false }, null);
    assert.equal(getEffectiveConfig(null).enabled, false);
    saveConfig({ enabled: true }, null);
    assert.equal(getEffectiveConfig(null).enabled, true);
  });
});
