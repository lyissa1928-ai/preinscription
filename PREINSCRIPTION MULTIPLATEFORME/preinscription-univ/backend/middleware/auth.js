const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET } = require('../utils/jwtHelpers');
const { isTokenRevoked } = require('../utils/tokenRevocation');

// ─── Middleware d'authentification JWT ───────────────────────────────────────
// Lit le token, puis enrichit req.user avec les données fraîches de la DB
// (garantit que etablissement_id est toujours à jour, même pour les vieux tokens)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ message: 'Session révoquée. Reconnectez-vous.' });
    }
    const dbUser = db.get('utilisateurs').find({ id: decoded.id }).value();
    if (!dbUser || dbUser.actif === false) {
      return res.status(401).json({ message: 'Compte introuvable ou désactivé' });
    }
    // Rôle et rattachement viennent toujours de la DB (migration rôle, changement côté admin, etc.) —
    // le JWT peut être obsolète et provoquer des 403 alors que /api/auth/me affiche déjà le bon profil.
    req.user = {
      ...decoded,
      role: dbUser.role,
      etablissement_id: dbUser.etablissement_id || null,
    };

    if (dbUser.must_change_password === true) {
      const path = (req.originalUrl || req.url || '').split('?')[0];
      const allowed = ['/api/auth/changer-mot-de-passe-obligatoire', '/api/auth/deconnexion'];
      if (!allowed.includes(path)) {
        return res.status(403).json({
          code: 'MUST_CHANGE_PASSWORD',
          message: 'Vous devez changer votre mot de passe avant de poursuivre.',
        });
      }
    }
    next();
  } catch {
    return res.status(401).json({ message: 'Token expiré ou invalide' });
  }
};

// ─── Factory de garde par rôle(s) ────────────────────────────────────────────
const roleGuard = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}` });
  }
  next();
};

// ─── Gardes prédéfinis ────────────────────────────────────────────────────────
const adminOnly        = roleGuard('admin');
/** Alias historique : accès réservé aux administrateurs. */
const adminOrDirecteur = adminOnly;
const responsableOnly  = roleGuard('responsable');
const agentAdminOnly   = roleGuard('agent_admin');
const comptableOnly    = roleGuard('comptable');
const controleurQualiteOnly = roleGuard('controleur_qualite');

const responsableOrAdmin = roleGuard('responsable', 'admin');
const staffProformaDecision = roleGuard(
  'admin',
  'responsable',
  'agent_admin',
  'comptable',
  'controleur_qualite'
);
const staffLettreAttestation = roleGuard(
  'admin',
  'responsable',
  'agent_admin',
  'comptable',
  'controleur_qualite'
);
const agentAdminOrAdmin  = roleGuard('agent_admin', 'admin');
const comptableOrAdmin   = roleGuard('comptable', 'admin');
const directeurOrAdmin   = adminOnly;
const controleurQualiteOrAdmin = roleGuard('controleur_qualite', 'admin');

const staffOnly = roleGuard('admin', 'responsable', 'agent_admin', 'comptable', 'controleur_qualite');

module.exports = {
  authMiddleware,
  adminOnly, adminOrDirecteur, responsableOnly, agentAdminOnly, comptableOnly, controleurQualiteOnly,
  responsableOrAdmin, staffProformaDecision, staffLettreAttestation, agentAdminOrAdmin, comptableOrAdmin, directeurOrAdmin,
  controleurQualiteOrAdmin,
  staffOnly
};
