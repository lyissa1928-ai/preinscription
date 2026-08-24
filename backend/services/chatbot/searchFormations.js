/**
 * Recherche formations (RAG retrieval) — uniquement catalogue actif, filtré établissement.
 */
const db = require('../../database/db');
const { normalizeText, tokenize } = require('./normalize');
const { detectDomains } = require('./synonyms');

const STOP = new Set([
  'je', 'tu', 'il', 'nous', 'vous', 'les', 'des', 'une', 'un', 'de', 'du', 'la', 'le',
  'et', 'ou', 'en', 'au', 'aux', 'pour', 'par', 'sur', 'avec', 'dans', 'que', 'qui',
  'quoi', 'quel', 'quelle', 'quels', 'quelles', 'avoir', 'avez', 'vous', 'faire',
  'veux', 'voudrais', 'cherche', 'formation', 'formations', 'etude', 'etudes',
  'diplome', 'apres', 'cette', 'mon', 'ma', 'mes', 'votre', 'vos', 'est', 'ce',
  'cela', 'donc', 'très', 'tres', 'bien', 'plus', 'moins', 'comme', 'aussi',
  'avez', 'ont', 'suis', 'etre', 'etre', 'etre',
]);

/** Mots académiques trop génériques pour valider seuls une correspondance. */
const GENERIC_ACADEMIC = new Set([
  'licence', 'master', 'bts', 'dut', 'diplome', 'technicien', 'annee', 'an', 'ans',
  'niveau', 'bac', 'semest', 'semestre', 'cycle', 'filiere', 'programme', 'cours',
  'presentiel', 'ligne', 'fad', 'disponible', 'proposez', 'existe',
]);

function contentTokens(tokens) {
  return tokens.filter((t) => t.length >= 4 && !STOP.has(t) && !GENERIC_ACADEMIC.has(t));
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatMoney(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return null;
  return `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA`;
}

function enrichFormation(f) {
  const etab = db.get('etablissements').find({ id: f.etablissement_id }).value();
  const filiere = f.filiere_id
    ? db.get('filieres').find({ id: f.filiere_id }).value()
    : null;
  return {
    id: f.id,
    titre: f.titre,
    type: f.type,
    type_label: f.type === 'en_ligne' ? 'Formation à distance (FAD)' : 'Présentiel',
    niveau: f.niveau || null,
    niveau_requis: f.niveau_requis || filiere?.filiere_condition_acces || null,
    duree: f.duree || (f.duree_mois ? `${f.duree_mois} mois` : null),
    duree_mois: f.duree_mois || null,
    description: f.description || filiere?.description || null,
    ville: f.ville || null,
    etablissement_id: f.etablissement_id,
    etablissement_nom: etab?.nom || null,
    filiere_nom: filiere?.nom || null,
    prix: f.prix ?? null,
    prix_label: formatMoney(f.prix),
    frais_inscription: f.frais_inscription ?? null,
    frais_inscription_label: formatMoney(f.frais_inscription),
    mensualite: f.mensualite ?? null,
    mensualite_label: formatMoney(f.mensualite),
    _searchBlob: normalizeText(
      [
        f.titre,
        f.description,
        f.niveau,
        f.niveau_requis,
        f.ville,
        filiere?.nom,
        filiere?.description,
        etab?.nom,
      ]
        .filter(Boolean)
        .join(' '),
    ),
  };
}

function scoreFormation(doc, tokens, domains, queryNorm = '') {
  let score = 0;
  const blob = doc._searchBlob;
  const titre = normalizeText(doc.titre);
  const qn = queryNorm || tokens.join(' ');

  if (titre.length >= 6 && qn.includes(titre)) score += 45;
  else if (qn.length >= 8 && titre.includes(qn)) score += 40;

  for (const t of tokens) {
    if (STOP.has(t) || t.length < 3) continue;
    if (titre.includes(t)) score += 8;
    else if (blob.includes(t)) score += 3;
    // préfixe (fautes tronquées)
    else if (titre.split(' ').some((w) => w.startsWith(t) || t.startsWith(w))) score += 4;
  }

  for (const d of domains) {
    for (const label of d.labels) {
      const L = normalizeText(label);
      if (L.length < 3) continue;
      if (titre.includes(L)) score += 10 + (d.score || 0);
      else if (blob.includes(L)) score += 5;
    }
    for (const boost of d.searchBoost || []) {
      const B = normalizeText(boost);
      if (titre.includes(B) || blob.includes(B)) score += 4;
    }
  }

  return score;
}

/**
 * @param {object} opts
 * @param {string} opts.query
 * @param {number|null} opts.etablissementId — filtre strict si fourni
 * @param {number[]} [opts.preferIds] — formations déjà évoquées (boost)
 * @param {number} [opts.limit]
 */
function searchFormations({ query, etablissementId = null, preferIds = [], limit = 8 } = {}) {
  const q = normalizeText(query);
  const tokens = tokenize(query).filter((t) => !STOP.has(t));
  const domains = detectDomains(q);

  let list = (db.get('formations').value() || []).filter((f) => f.actif !== false);
  if (etablissementId != null && Number.isFinite(Number(etablissementId))) {
    const eid = Number(etablissementId);
    list = list.filter((f) => Number(f.etablissement_id) === eid);
  }

  const docs = list.map(enrichFormation);
  const prefer = new Set((preferIds || []).map(Number));

  let ranked = docs
    .map((doc) => {
      let score = scoreFormation(doc, tokens, domains, q);
      if (prefer.has(doc.id)) score += 15;
      return { doc, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Si la requête contient un terme spécifique (ex. astronautique) absent du catalogue,
  // ne pas renvoyer des formations qui n’ont matché que sur « licence / master ».
  const rare = contentTokens(tokens);
  if (rare.length && !domains.length) {
    const withRare = ranked.filter(({ doc }) =>
      rare.some((t) => doc._searchBlob.includes(t) || normalizeText(doc.titre).includes(t)),
    );
    // Aucun document ne contient le terme rare → aucun résultat (anti-hallucination)
    if (withRare.length === 0) {
      ranked = [];
    } else {
      ranked = withRare;
    }
  }

  // Si domaine détecté mais peu de hits, élargir via searchBoost sur titres/filières
  if (ranked.length < 2 && domains.length) {
    const d0 = domains[0];
    const boostTerms = [...(d0.labels || []), ...(d0.searchBoost || [])].map(normalizeText);
    ranked = docs
      .map((doc) => {
        let score = scoreFormation(doc, tokens, domains, q);
        for (const t of boostTerms) {
          if (t.length >= 4 && (doc._searchBlob.includes(t) || normalizeText(doc.titre).includes(t))) {
            score += 6;
          }
        }
        if (prefer.has(doc.id)) score += 15;
        return { doc, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  const results = ranked
    .filter(({ score }) => {
      // Évite les faux positifs faibles (ex. sous-chaîne accidentelle)
      if (domains.length) return score >= 10;
      return score >= 6;
    })
    .slice(0, limit)
    .map(({ doc, score }) => {
      const { _searchBlob, ...safe } = doc;
      return { ...safe, _score: score };
    });

  return {
    results,
    domains,
    tokens,
    totalIndexed: docs.length,
    scopedEtablissementId: etablissementId != null ? Number(etablissementId) : null,
    multiEtablissement: etablissementId == null && new Set(results.map((r) => r.etablissement_id)).size > 1,
  };
}

function getFormationById(id) {
  const f = db.get('formations').find({ id: Number(id) }).value();
  if (!f || f.actif === false) return null;
  const { _searchBlob, ...safe } = enrichFormation(f);
  return safe;
}

function getConditionsAdmission(etablissementId) {
  if (etablissementId == null) return [];
  const eid = Number(etablissementId);
  return (db.get('conditions_admission').value() || [])
    .filter((c) => Number(c.etablissement_id) === eid)
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
    .map((c) => ({
      id: c.id,
      texte: stripHtml(c.texte).slice(0, 1200),
      updated_at: c.updated_at || null,
    }));
}

function getEtablissementPublic(etablissementId) {
  if (etablissementId == null) return null;
  const e = db.get('etablissements').find({ id: Number(etablissementId) }).value();
  if (!e || e.actif === false) return null;
  return {
    id: e.id,
    nom: e.nom,
    type: e.type || null,
    adresse: e.adresse || null,
    telephone: e.telephone || null,
    email_contact: e.email_contact || null,
    site_web: e.site_web || null,
    couleur_primaire: e.couleur_primaire || null,
    couleur_secondaire: e.couleur_secondaire || null,
    logo_url: e.logo_url || null,
  };
}

function listActiveEtablissements() {
  return (db.get('etablissements').value() || [])
    .filter((e) => e.actif !== false)
    .map((e) => ({
      id: e.id,
      nom: e.nom,
      couleur_primaire: e.couleur_primaire || null,
    }));
}

/** Échantillon du catalogue (demande vague : « quelles formations ? ») — sans invention. */
function listCatalogSample({ etablissementId = null, limit = 6 } = {}) {
  let list = (db.get('formations').value() || []).filter((f) => f.actif !== false);
  if (etablissementId != null && Number.isFinite(Number(etablissementId))) {
    const eid = Number(etablissementId);
    list = list.filter((f) => Number(f.etablissement_id) === eid);
  }
  const results = list.slice(0, limit).map((f) => {
    const { _searchBlob, ...safe } = enrichFormation(f);
    return { ...safe, _score: 1 };
  });
  return {
    results,
    domains: [],
    tokens: [],
    totalIndexed: list.length,
    scopedEtablissementId: etablissementId != null ? Number(etablissementId) : null,
    multiEtablissement: etablissementId == null && new Set(results.map((r) => r.etablissement_id)).size > 1,
    catalogSample: true,
  };
}

module.exports = {
  searchFormations,
  getFormationById,
  getConditionsAdmission,
  getEtablissementPublic,
  listActiveEtablissements,
  listCatalogSample,
  stripHtml,
  enrichFormation,
};
