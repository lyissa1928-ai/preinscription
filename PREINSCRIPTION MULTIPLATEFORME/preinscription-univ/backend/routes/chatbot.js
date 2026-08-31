/**
 * API Accueil virtuel scolarité — public + admin config.
 */
const express = require('express');
const router = express.Router();
const { rateLimit, getClientIp } = require('../utils/rateLimit');
const { verifyAccessToken } = require('../utils/jwtHelpers');
const db = require('../database/db');
const { handleChatbotMessage } = require('../services/chatbot/orchestrator');
const { getChatbotStats, ensureCollections } = require('../services/chatbot/logger');
const { listActiveEtablissements, getEtablissementPublic } = require('../services/chatbot/searchFormations');
const {
  ensureConfigCollection,
  getEffectiveConfig,
  saveConfig,
} = require('../services/chatbot/configStore');
const { resolvePublicContacts } = require('../services/chatbot/contacts');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');

ensureCollections();
ensureConfigCollection();

const chatbotLimiter = rateLimit({
  windowMs: Number(process.env.CHATBOT_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.CHATBOT_RATE_MAX || 30),
  message: 'Trop de messages envoyés. Réessayez dans une minute.',
  keyGenerator: (req) => `chatbot:${getClientIp(req)}`,
});

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]);
    const dbUser = db.get('utilisateurs').find({ id: decoded.id }).value();
    if (dbUser && dbUser.actif !== false) {
      req.user = {
        id: dbUser.id,
        role: dbUser.role,
        etablissement_id: dbUser.etablissement_id || null,
      };
    }
  } catch {
    /* anonyme */
  }
  return next();
}

router.get('/bootstrap', (req, res) => {
  const eid = req.query.etablissement_id != null ? Number(req.query.etablissement_id) : null;
  const etab = Number.isFinite(eid) ? getEtablissementPublic(eid) : null;
  const config = getEffectiveConfig(Number.isFinite(eid) ? eid : null);

  if (config.enabled === false) {
    return res.json({
      enabled: false,
      message: 'L’accueil virtuel est désactivé.',
      etablissements: listActiveEtablissements(),
    });
  }

  const welcome =
    config.welcome_message ||
    (etab
      ? `Bonjour et bienvenue à l’accueil de ${etab.nom}. Je peux vous aider pour les formations, l’admission, les contacts et la facture proforma.`
      : 'Bonjour et bienvenue. Je suis l’accueil virtuel de la scolarité. Comment puis-je vous aider ?');

  res.json({
    enabled: true,
    assistant_name: config.assistant_name || 'Accueil scolarité',
    welcome,
    suggestions: config.suggestions || [],
    etablissement: etab
      ? { ...etab, couleur_primaire: etab.couleur_primaire || getEtablissementPublic(eid)?.couleur_primaire }
      : null,
    etablissements: listActiveEtablissements(),
    contacts: Number.isFinite(eid) ? resolvePublicContacts(eid) : null,
  });
});

router.post('/message', chatbotLimiter, optionalAuth, async (req, res) => {
  try {
    const { message, session_id, etablissement_id } = req.body || {};
    const result = await handleChatbotMessage({
      message,
      sessionId: session_id,
      etablissementId: etablissement_id,
      user: req.user || null,
      ip: getClientIp(req),
    });
    if (!result.ok) return res.status(result.status || 400).json({ message: result.message });
    return res.json(result);
  } catch (e) {
    console.error('[chatbot] message error', e);
    return res.status(500).json({
      message: 'Accueil temporairement indisponible. Réessayez ou contactez la scolarité.',
    });
  }
});

router.get('/admin/stats', authMiddleware, adminOnly, (req, res) => {
  const days = Number(req.query.days || 30);
  const etabId = req.query.etablissement_id != null ? Number(req.query.etablissement_id) : null;
  res.json(getChatbotStats({ days, etablissementId: Number.isFinite(etabId) ? etabId : null }));
});

router.get('/admin/config', authMiddleware, adminOnly, (req, res) => {
  const etabId = req.query.etablissement_id != null ? Number(req.query.etablissement_id) : null;
  res.json({
    config: getEffectiveConfig(Number.isFinite(etabId) ? etabId : null),
    etablissements: listActiveEtablissements(),
  });
});

router.put('/admin/config', authMiddleware, adminOnly, (req, res) => {
  const etabId = req.body?.etablissement_id != null ? Number(req.body.etablissement_id) : null;
  const allowed = [
    'enabled',
    'assistant_name',
    'welcome_message',
    'expose_staff_contacts',
    'contacts',
    'service_routing',
    'suggestions',
    'faqs',
  ];
  const payload = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) payload[k] = req.body[k];
  }
  const saved = saveConfig(payload, Number.isFinite(etabId) ? etabId : null);
  logAudit(req, 'update', 'chatbot_config', saved.id, {
    etablissement_id: saved.etablissement_id,
  });
  res.json({ message: 'Configuration enregistrée.', config: saved });
});

module.exports = router;
