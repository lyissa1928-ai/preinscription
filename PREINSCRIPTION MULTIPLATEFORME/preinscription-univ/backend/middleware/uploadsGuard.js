/**
 * Protection du dossier /uploads (Lot 1 sécurité).
 *
 * Avant : express.static public — toute personne connaissant/devinant une URL
 * pouvait télécharger pièces d'identité, relevés, justificatifs, PJ chat.
 *
 * Règles (voir utils/uploadsAccess.js pour la décision pure, testée) :
 * - `etablissements/` (logos) : public (affiché sur les pages publiques).
 * - Tout le reste : access token requis (header Bearer ou `?token=` pour les
 *   <img>/<a> du front qui ne peuvent pas envoyer de header).
 * - Racine (documents de dossiers étudiants) : étudiant → uniquement ses
 *   propres fichiers ; staff → dossiers de son établissement ; admin → tout.
 * - `proforma-justificatifs/` : staff/admin uniquement.
 * - `chat-attachments/` : tout utilisateur authentifié (participants du chat).
 */
const db = require('../database/db');
const { verifyAccessToken } = require('../utils/jwtHelpers');
const { isTokenRevoked } = require('../utils/tokenRevocation');
const { logSecurityEvent } = require('../utils/securityEvent');
const {
  normalizeUploadPath,
  isPublicUploadPath,
  decideUploadAccess,
} = require('../utils/uploadsAccess');

function findDossierDocByChemin(rel) {
  const doc = (db.get('documents').value() || []).find((d) => String(d.chemin) === rel);
  if (!doc) return { doc: null, dossier: null, etabId: null };
  const dossier = db.get('dossiers').find({ id: doc.dossier_id }).value() || null;
  let etabId = null;
  if (dossier) {
    const formation = db.get('formations').find({ id: dossier.formation_id }).value();
    etabId = formation && formation.etablissement_id != null ? Number(formation.etablissement_id) : null;
  }
  return { doc, dossier, etabId };
}

function uploadsGuard(req, res, next) {
  const norm = normalizeUploadPath(req.path);
  if (!norm.ok) {
    return res.status(400).json({ message: 'Chemin invalide.' });
  }
  const rel = norm.rel;

  if (isPublicUploadPath(rel)) return next();

  const authHeader = req.headers['authorization'];
  const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer || (typeof req.query.token === 'string' ? req.query.token : '');
  if (!token) {
    return res.status(401).json({ message: 'Authentification requise pour accéder à ce fichier.' });
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ message: 'Session invalide ou expirée.' });
  }
  if (decoded.jti && isTokenRevoked(decoded.jti)) {
    return res.status(401).json({ message: 'Session révoquée. Reconnectez-vous.' });
  }
  const user = db.get('utilisateurs').find({ id: decoded.id }).value();
  if (!user || user.actif === false) {
    return res.status(401).json({ message: 'Compte introuvable ou désactivé.' });
  }

  // Résolution du document racine uniquement si nécessaire (pas chat/proforma/public).
  const needsDossierLookup =
    !rel.startsWith('chat-attachments/') &&
    !rel.startsWith('proforma-justificatifs/') &&
    user.role !== 'admin';
  const dossierCtx = needsDossierLookup ? findDossierDocByChemin(rel) : null;

  const decision = decideUploadAccess(rel, user, dossierCtx);
  if (decision.allow) return next();

  if (decision.status === 403) {
    const event = decision.reason === 'cross_etab' ? 'uploads_forbidden_cross_etab' : 'uploads_forbidden';
    logSecurityEvent(req, event, { path: rel, user_id: user.id, role: user.role }, 'warning');
    return res.status(403).json({ message: 'Accès refusé.' });
  }
  if (decision.status === 404) {
    return res.status(404).json({ message: 'Fichier introuvable.' });
  }
  return res.status(decision.status || 403).json({ message: 'Accès refusé.' });
}

module.exports = { uploadsGuard };
