/**
 * Orchestrateur — agent d’accueil scolarité (RAG + contacts + config).
 */
const { detectIntent, INTENTS } = require('./intent');
const {
  searchFormations,
  getFormationById,
  getConditionsAdmission,
  getEtablissementPublic,
  listActiveEtablissements,
  listCatalogSample,
} = require('./searchFormations');
const { ensureSession, touchSession, pushTurn } = require('./sessionMemory');
const { buildReply } = require('./buildReply');
const { logChatbotTurn } = require('./logger');
const { maybePolishWithLlm } = require('./llmOptional');
const { getEffectiveConfig } = require('./configStore');
const { resolvePublicContacts } = require('./contacts');

function resolveEtablissementId({ etablissementId, user, session }) {
  if (etablissementId != null && etablissementId !== '') {
    const n = Number(etablissementId);
    if (Number.isFinite(n)) return n;
  }
  if (session?.etablissementId != null) return Number(session.etablissementId);
  if (user?.etablissement_id != null) return Number(user.etablissement_id);
  return null;
}

async function handleChatbotMessage({
  message,
  sessionId,
  etablissementId,
  user = null,
  ip = null,
}) {
  const text = String(message || '').trim().slice(0, 1000);
  if (!text) {
    return { ok: false, status: 400, message: 'Message vide.' };
  }

  const session = ensureSession(sessionId);
  const eid = resolveEtablissementId({ etablissementId, user, session });
  if (eid != null) touchSession(session, { etablissementId: eid });

  const config = getEffectiveConfig(eid);
  if (config.enabled === false) {
    return {
      ok: false,
      status: 503,
      message: 'L’accueil virtuel est temporairement désactivé. Contactez la scolarité.',
    };
  }

  const etab = eid != null ? getEtablissementPublic(eid) : null;
  const contacts = resolvePublicContacts(eid);
  const analysis = detectIntent(text, session);

  let preferIds = session.lastFormationIds || [];
  const followIntents = [
    INTENTS.CAREERS,
    INTENTS.DURATION,
    INTENTS.FEES,
    INTENTS.DETAILS,
    INTENTS.COMPARE,
    INTENTS.CONTACT_RESPONSABLE,
    INTENTS.SELECT_ORDINAL,
  ];

  let selectedFormation = null;
  if (analysis.intent === INTENTS.SELECT_ORDINAL && preferIds.length) {
    const idx = analysis.ordinalIndex ?? 0;
    const id = preferIds[idx];
    selectedFormation = id != null ? getFormationById(id) : null;
    if (selectedFormation && eid != null && Number(selectedFormation.etablissement_id) !== Number(eid)) {
      selectedFormation = null;
    }
  }

  let search = searchFormations({
    query: text,
    etablissementId: eid,
    preferIds: followIntents.includes(analysis.intent) ? preferIds : [],
    limit: 8,
  });

  // Catalogue général : « Quelles formations proposez-vous ? » sans domaine précis
  if (
    analysis.intent === INTENTS.LIST_FORMATIONS &&
    search.results.length === 0 &&
    !analysis.domains.length
  ) {
    const filler = new Set([
      'quelles', 'quel', 'quelle', 'quels', 'formations', 'formation', 'proposez', 'proposez-vous',
      'avez', 'vous', 'disponible', 'disponibles', 'catalogue', 'liste', 'bonjour', 'bjr',
    ]);
    const contentish = analysis.tokens.filter((t) => t.length >= 5 && !filler.has(t));
    if (contentish.length === 0) {
      search = listCatalogSample({ etablissementId: eid, limit: 6 });
    }
  }

  if (followIntents.includes(analysis.intent) && preferIds.length && search.results.length === 0 && !selectedFormation) {
    const recovered = preferIds.map(getFormationById).filter(Boolean);
    const filtered =
      eid != null ? recovered.filter((f) => Number(f.etablissement_id) === Number(eid)) : recovered;
    search = {
      ...search,
      results: filtered,
      multiEtablissement: new Set(filtered.map((f) => f.etablissement_id)).size > 1,
    };
  }

  if (
    followIntents.includes(analysis.intent) &&
    preferIds.length &&
    search.results.length > 1 &&
    !analysis.domains.length &&
    analysis.intent !== INTENTS.SELECT_ORDINAL
  ) {
    const preferred = search.results.filter((r) => preferIds.includes(r.id));
    if (preferred.length) search = { ...search, results: preferred };
  }

  // Pour contact responsable après sélection, prioriser la formation contextuelle
  if (
    analysis.intent === INTENTS.CONTACT_RESPONSABLE &&
    preferIds.length &&
    !analysis.domains.length
  ) {
    const first = getFormationById(preferIds[0]);
    if (first) search = { ...search, results: [first, ...search.results.filter((r) => r.id !== first.id)] };
  }

  const conditions =
    analysis.intent === INTENTS.ADMISSION && eid != null ? getConditionsAdmission(eid) : [];

  let payload = buildReply({
    intent: analysis.intent,
    search,
    conditions,
    etab,
    session,
    contacts,
    config,
    selectedFormation,
    unresolvedDomain: analysis.domains[0]?.id?.replace(/_/g, ' ') || null,
  });

  payload = await maybePolishWithLlm({
    userMessage: text,
    payload,
    facts: {
      formations: payload.formations,
      etab,
      conditions,
      contacts: payload.contacts,
      intent: analysis.intent,
    },
  });

  pushTurn(session, 'user', text);
  pushTurn(session, 'assistant', payload.reply);

  const nextFormationIds = (payload.formations || []).map((f) => f.id);
  touchSession(session, {
    lastFormationIds: nextFormationIds.length ? nextFormationIds : session.lastFormationIds,
    lastDomainIds: (analysis.domains || []).map((d) => d.id),
    lastIntent: analysis.intent,
  });

  logChatbotTurn({
    sessionId: session.id,
    etablissementId: eid,
    userId: user?.id || null,
    role: user?.role || 'anonyme',
    message: text,
    intent: analysis.intent,
    formationIds: nextFormationIds,
    noMatch: !!payload.meta?.no_match,
    offTopic: analysis.intent === INTENTS.OFF_TOPIC,
    ip,
  });

  return {
    ok: true,
    session_id: session.id,
    etablissement: etab,
    etablissements_disponibles: eid == null ? listActiveEtablissements() : undefined,
    assistant_name: config.assistant_name,
    intent: analysis.intent,
    reply: payload.reply,
    formations: payload.formations || [],
    actions: payload.actions || [],
    follow_ups: payload.followUps || [],
    contacts: payload.contacts || [],
    careers: payload.careers || null,
    meta: {
      ...(payload.meta || {}),
      confidence: analysis.confidence,
      llm_polished: !!payload.meta?.llm_polished,
    },
  };
}

module.exports = { handleChatbotMessage, resolveEtablissementId };
