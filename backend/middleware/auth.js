const db = require('../database/db');
const { verifyAccessToken } = require('../utils/jwtHelpers');
const { isTokenRevoked } = require('../utils/tokenRevocation');
const { getFonctions, roleAllows } = require('../utils/userFonctions');

// ─── Middleware d'authentification JWT ───────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
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
      fonctions: getFonctions(dbUser),
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

// Accepte le rôle principal OU une fonction supplémentaire (ex. responsable désigné).
const roleGuard = (...roles) => (req, res, next) => {
  if (!roleAllows(req.user, roles)) {
    return res.status(403).json({ message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}` });
  }
  next();
};

const adminOnly = roleGuard('admin');
const adminOrDirecteur = adminOnly;
const responsableOnly = roleGuard('responsable');
const agentAdminOnly = roleGuard('agent_admin');
const comptableOnly = roleGuard('comptable');
const controleurQualiteOnly = roleGuard('controleur_qualite');

const responsableOrAdmin = roleGuard('responsable', 'admin');

/** Décision pédagogique dossiers (accepter / refuser) : admin + admin étab. + responsable (+ fonction). */
const staffDossierDecision = roleGuard('admin', 'admin_etablissement', 'responsable');

/** Lecture demandes proforma : tout le staff établissement (+ admin plateforme). */
const staffProformaView = roleGuard(
  'admin',
  'admin_etablissement',
  'responsable',
  'agent_admin',
  'comptable',
  'controleur_qualite',
);

/** Décision / création proforma : admin + staff décisionnel établissement. */
const staffProformaDecision = roleGuard(
  'admin',
  'admin_etablissement',
  'responsable',
  'comptable',
  'agent_admin',
);

/** Guichet walk-in : admin + staff établissement facturation / accueil. */
const staffGuichet = roleGuard('admin', 'admin_etablissement', 'responsable', 'agent_admin', 'comptable');

/** Lecture lettre / attestation officielle. */
const staffLettreAttestation = roleGuard(
  'admin',
  'admin_etablissement',
  'responsable',
  'agent_admin',
  'comptable',
  'controleur_qualite'
);

const agentAdminOrAdmin = roleGuard('agent_admin', 'admin');
const comptableOrAdmin = roleGuard('comptable', 'admin');
const directeurOrAdmin = adminOnly;
const controleurQualiteOrAdmin = roleGuard('controleur_qualite', 'admin');
const staffOnly = roleGuard('admin', 'admin_etablissement', 'responsable', 'agent_admin', 'comptable', 'controleur_qualite');

module.exports = {
  authMiddleware,
  adminOnly, adminOrDirecteur, responsableOnly, agentAdminOnly, comptableOnly, controleurQualiteOnly,
  responsableOrAdmin, staffProformaView, staffProformaDecision, staffDossierDecision, staffGuichet, staffLettreAttestation,
  agentAdminOrAdmin, comptableOrAdmin, directeurOrAdmin,
  controleurQualiteOrAdmin,
  staffOnly,
};
