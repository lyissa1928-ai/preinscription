/**
 * Configuration chatbot (global + par établissement) — modifiable sans code.
 */
const db = require('../../database/db');

const DEFAULT_SUGGESTIONS = [
  { id: 'trouver', label: 'Trouver une formation', message: 'Je cherche une formation' },
  { id: 'catalogue', label: 'Voir les formations', message: 'Quelles formations proposez-vous ?' },
  { id: 'admission', label: 'Conditions d’admission', message: 'Quelles sont les conditions d’admission ?' },
  { id: 'debouches', label: 'Débouchés', message: 'Quels sont les débouchés professionnels ?' },
  { id: 'proforma', label: 'Facture proforma', message: 'Je voudrais une facture proforma' },
  { id: 'responsable', label: 'Contacter un responsable', message: 'Je souhaite contacter un responsable' },
  { id: 'etab', label: 'Informations établissement', message: 'Informations sur l’établissement' },
  { id: 'inscription', label: 'Inscription', message: 'Comment m’inscrire ?' },
];

const DEFAULT_ROUTING = [
  { key: 'formation', service: 'pedagogie', label: 'Responsable pédagogique' },
  { key: 'etablissement', service: 'etablissement', label: 'Responsable d’établissement' },
  { key: 'inscription', service: 'scolarite', label: 'Scolarité' },
  { key: 'proforma', service: 'scolarite', label: 'Accueil / facturation' },
  { key: 'paiement', service: 'finance', label: 'Service financier' },
  { key: 'administratif', service: 'scolarite', label: 'Scolarité' },
  { key: 'pedagogie', service: 'pedagogie', label: 'Responsable pédagogique' },
];

function defaultConfig(etablissementId = null) {
  return {
    id: etablissementId == null ? 'global' : `etab-${etablissementId}`,
    etablissement_id: etablissementId,
    enabled: true,
    assistant_name: 'Accueil scolarité',
    welcome_message: etablissementId
      ? null // complété dynamiquement avec le nom etab
      : 'Bonjour et bienvenue. Je suis l’accueil virtuel de la scolarité. Comment puis-je vous aider aujourd’hui ?',
    expose_staff_contacts: false,
    contacts: {
      scolarite: { label: 'Scolarité / Accueil', nom: '', email: '', telephone: '' },
      pedagogie: { label: 'Responsable pédagogique', nom: '', email: '', telephone: '' },
      finance: { label: 'Service financier', nom: '', email: '', telephone: '' },
      etablissement: { label: 'Responsable d’établissement', nom: '', email: '', telephone: '' },
    },
    service_routing: DEFAULT_ROUTING,
    suggestions: DEFAULT_SUGGESTIONS,
    faqs: [],
    updated_at: null,
  };
}

function ensureConfigCollection() {
  if (!db.has('chatbot_config').value()) {
    db.set('chatbot_config', [defaultConfig(null)]).write();
  }
  const list = db.get('chatbot_config').value() || [];
  if (!list.find((c) => c.id === 'global')) {
    db.get('chatbot_config').push(defaultConfig(null)).write();
  }
}

function getRawConfig(etablissementId = null) {
  ensureConfigCollection();
  const id = etablissementId == null ? 'global' : `etab-${Number(etablissementId)}`;
  return db.get('chatbot_config').find({ id }).value() || null;
}

/** Fusion global ← override établissement. */
function getEffectiveConfig(etablissementId = null) {
  ensureConfigCollection();
  const global = { ...defaultConfig(null), ...(getRawConfig(null) || {}) };
  if (etablissementId == null) return global;
  const local = getRawConfig(etablissementId);
  if (!local) return { ...global, etablissement_id: Number(etablissementId), id: `etab-${etablissementId}` };

  return {
    ...global,
    ...local,
    contacts: {
      ...global.contacts,
      ...(local.contacts || {}),
      scolarite: { ...global.contacts?.scolarite, ...local.contacts?.scolarite },
      pedagogie: { ...global.contacts?.pedagogie, ...local.contacts?.pedagogie },
      finance: { ...global.contacts?.finance, ...local.contacts?.finance },
      etablissement: { ...global.contacts?.etablissement, ...local.contacts?.etablissement },
    },
    suggestions: local.suggestions?.length ? local.suggestions : global.suggestions,
    service_routing: local.service_routing?.length ? local.service_routing : global.service_routing,
    faqs: local.faqs?.length ? local.faqs : global.faqs,
  };
}

function saveConfig(payload, etablissementId = null) {
  ensureConfigCollection();
  const id = etablissementId == null ? 'global' : `etab-${Number(etablissementId)}`;
  const base = defaultConfig(etablissementId);
  const existing = getRawConfig(etablissementId) || {};
  const next = {
    ...base,
    ...existing,
    ...payload,
    id,
    etablissement_id: etablissementId == null ? null : Number(etablissementId),
    contacts: {
      ...base.contacts,
      ...existing.contacts,
      ...(payload.contacts || {}),
    },
    updated_at: new Date().toISOString(),
  };
  const found = db.get('chatbot_config').find({ id }).value();
  if (found) db.get('chatbot_config').find({ id }).assign(next).write();
  else db.get('chatbot_config').push(next).write();
  return getEffectiveConfig(etablissementId);
}

module.exports = {
  DEFAULT_SUGGESTIONS,
  DEFAULT_ROUTING,
  defaultConfig,
  ensureConfigCollection,
  getEffectiveConfig,
  getRawConfig,
  saveConfig,
};
