const { normalizeText, tokenize } = require('./normalize');
const { detectDomains, detectLevels } = require('./synonyms');

const INTENTS = {
  LIST_FORMATIONS: 'list_formations',
  RECOMMEND: 'recommend',
  DETAILS: 'details',
  ADMISSION: 'admission',
  CAREERS: 'careers',
  FEES: 'fees',
  DURATION: 'duration',
  COMPARE: 'compare',
  CONTACT: 'contact',
  CONTACT_RESPONSABLE: 'contact_responsable',
  CONTACT_ETAB: 'contact_etab',
  PROFORMA: 'proforma',
  INSCRIPTION: 'inscription',
  ETAB_INFO: 'etab_info',
  SELECT_ORDINAL: 'select_ordinal',
  OFF_TOPIC: 'off_topic',
  GREETING: 'greeting',
  UNKNOWN: 'unknown',
};

const ORDINAL_MAP = {
  premiere: 0,
  premier: 0,
  '1ere': 0,
  '1er': 0,
  '1': 0,
  deuxieme: 1,
  second: 1,
  seconde: 1,
  '2eme': 1,
  '2e': 1,
  '2': 1,
  troisieme: 2,
  '3eme': 2,
  '3e': 2,
  '3': 2,
  quatrieme: 3,
  '4eme': 3,
  '4': 3,
  cinquieme: 4,
  '5eme': 4,
  '5': 4,
};

function parseOrdinalIndex(normalizedQuery) {
  const m = normalizedQuery.match(
    /\b(la|le|n°|no|numero)?\s*(premiere|premier|1ere|1er|1|deuxieme|second|seconde|2eme|2e|2|troisieme|3eme|3e|3|quatrieme|4eme|4|cinquieme|5eme|5)\b/,
  );
  if (!m) return null;
  const key = m[2];
  return Object.prototype.hasOwnProperty.call(ORDINAL_MAP, key) ? ORDINAL_MAP[key] : null;
}

function detectIntent(message, session = {}) {
  const raw = String(message || '').trim();
  const q = normalizeText(raw);
  const tokens = tokenize(raw);
  const domains = detectDomains(q);
  const levels = detectLevels(q);
  const ordinalIndex = parseOrdinalIndex(q);

  if (!q) {
    return { intent: INTENTS.UNKNOWN, domains, levels, tokens, confidence: 0, ordinalIndex: null };
  }

  if (
    ordinalIndex != null &&
    session.lastFormationIds?.length &&
    (/\b(interesse|interessee|choisis|prendre|celle|cette|formation)\b/.test(q) ||
      tokens.length <= 6)
  ) {
    return {
      intent: INTENTS.SELECT_ORDINAL,
      domains,
      levels,
      tokens,
      confidence: 0.92,
      ordinalIndex,
    };
  }

  if (
    /\b(salaire|combien gagne|dans 20 ans|crypto|bitcoin|blague|recette)\b/.test(q) ||
    /\b(capitale|president|meteo|weather|foot|ligue)\b/.test(q) ||
    (/\b(japon|france|usa|chine)\b/.test(q) && !/\b(formation|etude|etudier|diplome)\b/.test(q))
  ) {
    return { intent: INTENTS.OFF_TOPIC, domains, levels, tokens, confidence: 0.9, ordinalIndex };
  }

  if (/^(bonjour|bonsoir|salut|hello|hey|coucou|hi|bjr|slt|bon matin)\b/.test(q) && tokens.length <= 4) {
    return { intent: INTENTS.GREETING, domains, levels, tokens, confidence: 0.95, ordinalIndex };
  }

  if (
    /\b(proforma|facture proforma|devis|avoir une facture|obtenir une facture)\b/.test(q) ||
    (/\bfacture\b/.test(q) && /\b(proforma|souhait|voudrais|veux|obtenir)\b/.test(q))
  ) {
    return { intent: INTENTS.PROFORMA, domains, levels, tokens, confidence: 0.93, ordinalIndex };
  }

  if (
    /\b(responsable (de )?(l )?etablissement|dirige (cet |l )?etablissement|directeur|direction|qui dirige)\b/.test(
      q,
    )
  ) {
    return { intent: INTENTS.CONTACT_ETAB, domains, levels, tokens, confidence: 0.9, ordinalIndex };
  }

  if (
    /\b(responsable (de )?(la )?formation|email du responsable|mail du responsable|contacter (le |la )?responsable)\b/.test(
      q,
    ) ||
    (/\bresponsable\b/.test(q) && (/\bformation\b/.test(q) || session.lastFormationIds?.length))
  ) {
    return {
      intent: INTENTS.CONTACT_RESPONSABLE,
      domains,
      levels,
      tokens,
      confidence: 0.9,
      ordinalIndex,
    };
  }

  if (
    /\b(inscri|preinscription|pre-inscription|candidater|dossier de candidature|comment m.?inscrire)\b/.test(
      q,
    )
  ) {
    return { intent: INTENTS.INSCRIPTION, domains, levels, tokens, confidence: 0.9, ordinalIndex };
  }

  if (
    /\b(informations? (sur )?(l )?etablissement|presentation (de )?(l )?etablissement|coordonnees (de )?(l )?etablissement|ou se trouve)\b/.test(
      q,
    )
  ) {
    return { intent: INTENTS.ETAB_INFO, domains, levels, tokens, confidence: 0.88, ordinalIndex };
  }

  if (
    /\b(contact|contacter|scolarite|telephone|email|adresse|joindre|rdv|rendez vous|a qui (dois|m.?adresser))\b/.test(
      q,
    )
  ) {
    return { intent: INTENTS.CONTACT, domains, levels, tokens, confidence: 0.85, ordinalIndex };
  }

  if (/\b(debouche|debouches|metier|metiers|carriere|apres cette formation|que puis je faire)\b/.test(q)) {
    return { intent: INTENTS.CAREERS, domains, levels, tokens, confidence: 0.88, ordinalIndex };
  }

  if (/\b(veux|voudrais|cherche|souhaite).{0,50}\b(travailler|metier)\b/.test(q) && domains.length) {
    return { intent: INTENTS.RECOMMEND, domains, levels, tokens, confidence: 0.87, ordinalIndex };
  }

  if (/\b(condition|admission|admissible|prerequis|niveau requis|documents?|pieces?)\b/.test(q)) {
    return { intent: INTENTS.ADMISSION, domains, levels, tokens, confidence: 0.9, ordinalIndex };
  }

  if (/\b(prix|tarif|tarifs|frais|cout|coût|combien|payer|mensualite)\b/.test(q)) {
    return { intent: INTENTS.FEES, domains, levels, tokens, confidence: 0.9, ordinalIndex };
  }

  if (/\b(duree|dure|combien de temps|combien d annees|mois)\b/.test(q)) {
    return { intent: INTENTS.DURATION, domains, levels, tokens, confidence: 0.9, ordinalIndex };
  }

  if (/\b(differen|comparer|difference|ou bien|plutot)\b/.test(q)) {
    return { intent: INTENTS.COMPARE, domains, levels, tokens, confidence: 0.8, ordinalIndex };
  }

  if (
    /\b(conseil|recommande|choisir|quelle formation|orient|me conseille|dois je|adapter)\b/.test(q) ||
    /\b(veux|voudrais|cherche|souhaite).{0,60}\b(formation|etudier|faire)\b/.test(q)
  ) {
    return { intent: INTENTS.RECOMMEND, domains, levels, tokens, confidence: 0.88, ordinalIndex };
  }

  if (
    /\b(avez vous|existe|proposez|formations?|catalogue|liste|quelles?|disponible)\b/.test(q) ||
    domains.length > 0
  ) {
    return { intent: INTENTS.LIST_FORMATIONS, domains, levels, tokens, confidence: 0.82, ordinalIndex };
  }

  if (session.lastFormationIds?.length && tokens.length <= 8) {
    if (/\b(et|donc|ensuite|plus|detail|details|info|infos)\b/.test(q)) {
      return { intent: INTENTS.DETAILS, domains, levels, tokens, confidence: 0.75, ordinalIndex };
    }
  }

  return {
    intent: domains.length ? INTENTS.LIST_FORMATIONS : INTENTS.UNKNOWN,
    domains,
    levels,
    tokens,
    confidence: domains.length ? 0.6 : 0.3,
    ordinalIndex,
  };
}

module.exports = { INTENTS, detectIntent, parseOrdinalIndex };
