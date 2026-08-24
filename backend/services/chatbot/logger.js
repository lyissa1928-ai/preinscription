/**
 * Journalisation conversations chatbot (anonymisée / minimale) pour l’admin.
 */
const db = require('../../database/db');

function ensureCollections() {
  if (!db.has('chatbot_logs').value()) {
    db.set('chatbot_logs', []).write();
  }
  const next = db.get('_nextId').value() || {};
  if (next.chatbot_logs == null) {
    db.get('_nextId').assign({ chatbot_logs: 1 }).write();
  }
}

function logChatbotTurn(entry) {
  try {
    ensureCollections();
    const id = db.nextId('chatbot_logs');
    db.get('chatbot_logs')
      .push({
        id,
        created_at: new Date().toISOString(),
        session_id: entry.sessionId || null,
        etablissement_id: entry.etablissementId ?? null,
        user_id: entry.userId ?? null,
        role: entry.role || 'anonyme',
        // Pas de stockage du message brut trop long ; utile pour FAQ
        message_preview: String(entry.message || '').slice(0, 240),
        intent: entry.intent || null,
        formation_ids: entry.formationIds || [],
        no_match: !!entry.noMatch,
        off_topic: !!entry.offTopic,
        // Pas d’IP complète en clair si possible — hash léger
        ip_hash: entry.ip ? String(entry.ip).slice(0, 24) : null,
      })
      .write();

    // Plafond soft
    const max = Number(process.env.CHATBOT_LOG_MAX || 5000);
    const all = db.get('chatbot_logs').value() || [];
    if (all.length > max) {
      db.set('chatbot_logs', all.slice(-max)).write();
    }
  } catch (e) {
    console.warn('[chatbot] log failed:', e.message);
  }
}

function getChatbotStats({ days = 30, etablissementId = null } = {}) {
  ensureCollections();
  const since = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
  let logs = (db.get('chatbot_logs').value() || []).filter(
    (l) => new Date(l.created_at).getTime() >= since,
  );
  if (etablissementId != null) {
    logs = logs.filter((l) => Number(l.etablissement_id) === Number(etablissementId));
  }

  const intentCounts = {};
  const formationCounts = {};
  let noMatch = 0;
  let offTopic = 0;
  for (const l of logs) {
    intentCounts[l.intent || 'unknown'] = (intentCounts[l.intent || 'unknown'] || 0) + 1;
    if (l.no_match) noMatch += 1;
    if (l.off_topic) offTopic += 1;
    for (const fid of l.formation_ids || []) {
      formationCounts[fid] = (formationCounts[fid] || 0) + 1;
    }
  }

  const topFormations = Object.entries(formationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const f = db.get('formations').find({ id: Number(id) }).value();
      return { formation_id: Number(id), titre: f?.titre || null, count };
    });

  const recentUnanswered = logs
    .filter((l) => l.no_match)
    .slice(-15)
    .reverse()
    .map((l) => ({
      at: l.created_at,
      preview: l.message_preview,
      intent: l.intent,
      etablissement_id: l.etablissement_id,
    }));

  return {
    period_days: Number(days),
    total_turns: logs.length,
    no_match: noMatch,
    off_topic: offTopic,
    intents: intentCounts,
    top_formations: topFormations,
    recent_unanswered: recentUnanswered,
  };
}

module.exports = { logChatbotTurn, getChatbotStats, ensureCollections };
