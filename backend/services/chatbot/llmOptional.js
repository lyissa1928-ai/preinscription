/**
 * Polissage LLM optionnel — UNIQUEMENT si OPENAI_API_KEY / CHATBOT_OPENAI_API_KEY.
 * Le modèle ne reçoit que les faits déjà récupérés ; consigne anti-hallucination stricte.
 */
async function maybePolishWithLlm({ userMessage, payload, facts }) {
  const key = String(process.env.CHATBOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  if (!key || process.env.CHATBOT_LLM_ENABLED === '0') {
    return payload;
  }

  const model = process.env.CHATBOT_OPENAI_MODEL || 'gpt-4o-mini';
  const system = [
    'Tu es un assistant d’orientation académique.',
    'Tu dois UNIQUEMENT reformuler les FAITS JSON fournis.',
    'Interdiction absolue d’inventer une formation, un tarif, une condition ou un établissement absent des faits.',
    'Si une info manque dans les faits, dis clairement que tu ne l’as pas.',
    'Les débouchés listés comme orientation_generale doivent rester présentés comme des perspectives, pas des garanties.',
    'Réponds en français, clair et structuré (markdown léger).',
  ].join(' ');

  const body = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: JSON.stringify({
          question: userMessage,
          reponse_ancree: payload.reply,
          faits: {
            formations: (facts.formations || []).map((f) => ({
              id: f.id,
              titre: f.titre,
              niveau: f.niveau,
              niveau_requis: f.niveau_requis,
              duree: f.duree,
              etablissement: f.etablissement_nom,
              prix: f.prix_label,
              description: f.description,
            })),
            etablissement: facts.etab,
            conditions: facts.conditions,
            intent: facts.intent,
          },
        }),
      },
    ],
  };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), Number(process.env.CHATBOT_LLM_TIMEOUT_MS || 8000));
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.warn('[chatbot] LLM HTTP', res.status);
      return payload;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text || String(text).trim().length < 20) return payload;

    return {
      ...payload,
      reply: String(text).trim(),
      meta: { ...(payload.meta || {}), llm_polished: true },
    };
  } catch (e) {
    console.warn('[chatbot] LLM skip:', e.message);
    return payload;
  }
}

module.exports = { maybePolishWithLlm };
