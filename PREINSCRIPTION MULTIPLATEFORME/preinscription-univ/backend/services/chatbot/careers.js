/**
 * Perspectives métiers — clairement marquées comme orientation générale (non officiel).
 */
const { DOMAIN_SYNONYMS } = require('./synonyms');
const { normalizeText } = require('./normalize');

function careersForFormation(formation, domains = []) {
  const blob = normalizeText(
    [formation?.titre, formation?.filiere_nom, formation?.description].filter(Boolean).join(' '),
  );

  const matched = [];
  for (const d of DOMAIN_SYNONYMS) {
    let hit = domains.some((x) => x.id === d.id);
    if (!hit) {
      hit = d.labels.some((l) => blob.includes(normalizeText(l)));
    }
    if (hit && d.careerHints?.length) {
      matched.push({ domainId: d.id, hints: d.careerHints });
    }
  }

  // Fallback générique si rien
  if (!matched.length) {
    return {
      source: 'orientation_generale',
      disclaimer:
        'Ces pistes sont des perspectives d’orientation générales proposées par l’assistant, et non des garanties d’emploi ni une fiche officielle de l’établissement.',
      metiers: [
        'Métiers liés au domaine de la formation (selon spécialisation et expérience)',
        'Poursuite d’études vers un niveau supérieur si le parcours le permet',
      ],
    };
  }

  const metiers = [];
  for (const m of matched) {
    for (const h of m.hints) {
      if (!metiers.includes(h)) metiers.push(h);
    }
  }

  return {
    source: 'orientation_generale',
    disclaimer:
      'Ces débouchés sont des perspectives professionnelles possibles (orientation générale IA), pas une garantie d’emploi ni une information administrative officielle.',
    metiers: metiers.slice(0, 8),
  };
}

module.exports = { careersForFormation };
