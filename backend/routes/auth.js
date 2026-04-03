const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { normalizeMatricule, normalizeTelephoneForUniqueness, telephoneTaken } = require('../utils/userIdentity');
const { generateNextMatriculeForEtablissement } = require('../utils/matriculeGenerator');
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { rateLimit, getClientIp } = require('../utils/rateLimit');
const { logSecurityEvent } = require('../utils/securityEvent');
const {
  antiBotConfig,
  verifyTurnstileToken,
  verifyRecaptchaTokenWithDetails,
  verifyRecaptchaEnterpriseWithDetails,
  recaptchaEnterpriseConfigured,
  recaptchaSecret,
  inscriptionCaptchaEnforced,
} = require('../utils/antiBot');
const { JWT_SECRET, signPayload } = require('../utils/jwtHelpers');
const { revokeToken, isTokenRevoked } = require('../utils/tokenRevocation');
const { isLoginLocked, recordLoginFailure, clearLoginLockout } = require('../utils/loginLockout');
const {
  refreshAccountLockState,
  isAccountLockedNow,
  retryAfterSec,
  recordAccountLoginFailure,
  clearAccountLockOnSuccess,
} = require('../utils/accountLock');
const {
  trimStr,
  normalizeEmail,
  isValidEmailFormat,
  validatePasswordPolicy,
  validateNomPrenom,
} = require('../utils/inscriptionValidation');
const inscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Trop de tentatives d’inscription. Réessayez dans quelques minutes.',
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
  keyGenerator: (req) => `login:${getClientIp(req)}:${String(req.body?.email || '').trim().toLowerCase()}`,
});
const resetPwdLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives de réinitialisation. Réessayez plus tard.',
  keyGenerator: (req) => `reset:${getClientIp(req)}:${normalizeMatricule(req.body?.matricule) || ''}`,
});

function buildPublicUserPayload(user, req) {
  const etab = user.etablissement_id
    ? db.get('etablissements').find({ id: user.etablissement_id }).value()
    : null;
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    matricule: user.matricule || null,
    etablissement_id: user.etablissement_id || null,
    etablissement_nom: etab?.nom || null,
    etablissement_couleur: etab?.couleur_primaire || null,
    etablissement_logo: publicAssetUrl(req, etab?.logo_url) || null,
    must_change_password: user.must_change_password === true,
  };
}

// POST /api/auth/inscription
router.post('/inscription', inscriptionLimiter, async (req, res) => {
  const botHoneypot = String(req.body?.website || '').trim();
  if (botHoneypot) {
    logSecurityEvent(req, 'bot_honeypot_triggered', { endpoint: '/api/auth/inscription' }, 'warning');
    return res.status(400).json({ message: 'Requête invalide.' });
  }

  const captchaStrict = inscriptionCaptchaEnforced();
  const { secret, minFillMs } = antiBotConfig();
  const startedAtRaw = Number(req.body?.bot_started_at || 0);
  // En dev (AUTH_INSCRIPTION_BYPASS_CAPTCHA=1), pas de délai minimal ni captcha — le honeypot et le rate limit restent actifs.
  const filledTooFast =
    captchaStrict &&
    (!Number.isFinite(startedAtRaw) || startedAtRaw <= 0 || (Date.now() - startedAtRaw) < minFillMs);
  if (filledTooFast) {
    logSecurityEvent(req, 'bot_too_fast_submission', {
      endpoint: '/api/auth/inscription',
      min_fill_ms: minFillMs,
      elapsed_ms: Number.isFinite(startedAtRaw) ? Date.now() - startedAtRaw : null,
    }, 'warning');
    return res.status(400).json({ message: 'Soumission trop rapide. Veuillez réessayer.' });
  }
  if (captchaStrict) {
    const useEnterprise = recaptchaEnterpriseConfigured();
    const recSecret = recaptchaSecret();
    if (useEnterprise || recSecret) {
      const recToken = String(req.body?.recaptcha_token || '').trim();
      if (!recToken) {
        logSecurityEvent(req, 'recaptcha_missing_token', { endpoint: '/api/auth/inscription' }, 'warning');
        return res.status(400).json({ message: 'Veuillez valider le reCAPTCHA avant de créer votre compte.' });
      }
      const recResult = useEnterprise
        ? await verifyRecaptchaEnterpriseWithDetails(recToken)
        : await verifyRecaptchaTokenWithDetails(recToken, getClientIp(req), recSecret);
      if (!recResult.ok) {
        logSecurityEvent(req, 'recaptcha_verification_failed', {
          endpoint: '/api/auth/inscription',
          recaptcha_mode: useEnterprise ? 'enterprise' : 'legacy',
          recaptcha_error_codes: recResult.errorCodes || [],
        }, 'warning');
        return res.status(400).json({ message: 'reCAPTCHA invalide ou expiré. Cochez à nouveau la case et réessayez.' });
      }
    } else if (secret) {
      const token = String(req.body?.bot_token || '').trim();
      if (!token) {
        logSecurityEvent(req, 'bot_missing_captcha_token', { endpoint: '/api/auth/inscription' }, 'warning');
        return res.status(400).json({ message: 'Veuillez valider la vérification anti-bot (captcha) avant de créer votre compte.' });
      }
      const ok = await verifyTurnstileToken(token, getClientIp(req), secret);
      if (!ok) {
        logSecurityEvent(req, 'bot_captcha_verification_failed', { endpoint: '/api/auth/inscription' }, 'warning');
        return res.status(400).json({ message: 'Vérification anti-bot invalide ou expirée. Réessayez.' });
      }
    } else {
      logSecurityEvent(req, 'inscription_captcha_not_configured', { endpoint: '/api/auth/inscription' }, 'error');
      return res.status(503).json({
        message: 'Inscription temporairement indisponible (reCAPTCHA ou Turnstile non configuré sur le serveur).',
      });
    }
  }

  const {
    nom: nomRaw,
    prenom: prenomRaw,
    email: emailRaw,
    mot_de_passe,
    mot_de_passe_confirmation,
    etablissement_id,
    date_naissance,
    telephone: telephoneRaw,
    adresse,
  } = req.body;

  const vn = validateNomPrenom(nomRaw, prenomRaw);
  if (!vn.ok) {
    return res.status(400).json({ message: vn.message, code: 'VALIDATION_NOM_PRENOM' });
  }

  const emailNorm = normalizeEmail(emailRaw);
  if (!emailNorm) {
    return res.status(400).json({ message: 'L’adresse e-mail est obligatoire.', code: 'EMAIL_REQUIRED' });
  }
  if (!isValidEmailFormat(emailNorm)) {
    return res.status(400).json({ message: 'Le format de l’adresse e-mail est invalide.', code: 'EMAIL_INVALID' });
  }

  if (etablissement_id === undefined || etablissement_id === null || String(etablissement_id).trim() === '') {
    return res.status(400).json({ message: 'Veuillez sélectionner un établissement.', code: 'ETABLISSEMENT_REQUIRED' });
  }

  if (mot_de_passe == null || mot_de_passe === '') {
    return res.status(400).json({ message: 'Le mot de passe est obligatoire.', code: 'PASSWORD_REQUIRED' });
  }
  if (mot_de_passe !== mot_de_passe_confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.', code: 'PASSWORD_MISMATCH' });
  }
  const vp = validatePasswordPolicy(mot_de_passe);
  if (!vp.ok) {
    return res.status(400).json({ message: vp.message, code: 'PASSWORD_POLICY' });
  }

  const telTrim = trimStr(telephoneRaw);
  if (!telTrim) {
    return res.status(400).json({ message: 'Le numéro de téléphone est obligatoire.', code: 'TELEPHONE_REQUIRED' });
  }
  const telNorm = normalizeTelephoneForUniqueness(telTrim);
  if (telNorm.length < 8) {
    return res.status(400).json({
      message: 'Le numéro de téléphone est invalide ou trop court (au moins 8 chiffres, espaces et indicatif ignorés pour le contrôle).',
      code: 'TELEPHONE_INVALID',
    });
  }

  const etabId = parseInt(String(etablissement_id), 10);
  const etab = db.get('etablissements').find({ id: etabId }).value();
  if (!etab || etab.actif === false) {
    return res.status(400).json({ message: 'Établissement invalide ou inactif.', code: 'ETABLISSEMENT_INVALID' });
  }
  const gen = generateNextMatriculeForEtablissement(etabId);
  if (gen.error) return res.status(400).json({ message: gen.error, code: 'MATRICULE_GENERATION' });
  const matNorm = normalizeMatricule(gen.matricule);

  const existing = db.get('utilisateurs').find({ email: emailNorm }).value();
  if (existing) {
    return res.status(409).json({
      message: 'Cette adresse e-mail est déjà utilisée pour un compte.',
      code: 'EMAIL_ALREADY_USED',
    });
  }

  if (telephoneTaken(telNorm, null)) {
    return res.status(409).json({
      message: 'Ce numéro de téléphone est déjà associé à un compte.',
      code: 'PHONE_ALREADY_USED',
    });
  }

  const hash = bcrypt.hashSync(mot_de_passe, 10);
  const id = db.nextId('utilisateurs');
  const user = {
    id,
    nom: vn.nom,
    prenom: vn.prenom,
    email: emailNorm,
    matricule: matNorm,
    date_naissance: date_naissance ? trimStr(date_naissance) : null,
    telephone: telTrim,
    adresse: adresse != null ? trimStr(adresse) : '',
    mot_de_passe: hash,
    role: 'etudiant',
    etablissement_id: etabId,
    must_change_password: false,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    created_at: new Date().toISOString(),
  };
  db.get('utilisateurs').push(user).write();

  const { token } = signPayload({
    id,
    email: emailNorm,
    role: 'etudiant',
    nom: user.nom,
    prenom: user.prenom,
  });
  res.status(201).json({
    message: 'Compte créé avec succès',
    token,
    utilisateur: buildPublicUserPayload(user, req),
  });
});

// POST /api/auth/connexion
router.post('/connexion', loginLimiter, (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  const emailNorm = String(email).trim().toLowerCase();

  const lock = isLoginLocked(req, emailNorm);
  if (lock.locked) {
    res.setHeader('Retry-After', String(lock.retryAfterSec));
    logSecurityEvent(req, 'auth_login_lockout', { email: emailNorm }, 'warning');
    return res.status(429).json({ message: 'Trop de tentatives. Réessayez plus tard.' });
  }

  const userRaw = db.get('utilisateurs').find({ email: emailNorm }).value();
  const user = userRaw ? refreshAccountLockState(userRaw) : null;

  if (user && isAccountLockedNow(user)) {
    const sec = retryAfterSec(user);
    res.setHeader('Retry-After', String(sec));
    logSecurityEvent(req, 'auth_account_locked', { email: emailNorm, user_id: user.id }, 'warning');
    return res.status(403).json({
      code: 'ACCOUNT_LOCKED',
      message:
        'Compte temporairement bloqué après plusieurs tentatives de connexion infructueuses. Réessayez plus tard ou contactez un administrateur.',
      retry_after_sec: sec,
    });
  }

  if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
    recordLoginFailure(req, emailNorm);
    if (user) {
      const r = recordAccountLoginFailure(user.id);
      if (r.locked) {
        logSecurityEvent(req, 'auth_account_locked_after_failures', {
          email: emailNorm,
          user_id: user.id,
          attempts: r.attempts,
        }, 'warning');
      }
    }
    logSecurityEvent(req, 'auth_login_failed', { email: emailNorm }, 'warning');
    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  }
  if (user.actif === false) {
    logSecurityEvent(req, 'auth_login_disabled_account', { email: emailNorm, user_id: user.id }, 'warning');
    return res.status(403).json({ message: 'Ce compte a été désactivé. Contactez l\'administrateur.' });
  }

  clearLoginLockout(req, emailNorm);
  clearAccountLockOnSuccess(user.id);

  const { token } = signPayload({
    id: user.id,
    email: user.email,
    role: user.role,
    nom: user.nom,
    prenom: user.prenom,
    etablissement_id: user.etablissement_id || null,
  });
  res.json({
    message: 'Connexion réussie',
    token,
    utilisateur: buildPublicUserPayload(user, req),
  });
});

// POST /api/auth/deconnexion — révoque le JWT courant (jti), best-effort
router.post('/deconnexion', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.jti && decoded.exp) {
        revokeToken(decoded.jti, decoded.exp * 1000);
      }
    } catch { /* ignore */ }
  }
  res.json({ message: 'Déconnexion enregistrée.' });
});

// POST /api/auth/changer-mot-de-passe-obligatoire — première connexion (compte créé par admin)
router.post('/changer-mot-de-passe-obligatoire', authMiddleware, (req, res) => {
  const {
    matricule,
    ancien_mot_de_passe,
    nouveau_mot_de_passe,
    confirmation,
  } = req.body;
  if (!matricule || !ancien_mot_de_passe || !nouveau_mot_de_passe || !confirmation) {
    return res.status(400).json({
      message: 'Matricule, mot de passe actuel, nouveau mot de passe et confirmation requis.',
    });
  }
  if (nouveau_mot_de_passe !== confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }
  if (nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }
  if (nouveau_mot_de_passe === ancien_mot_de_passe) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit être différent de l’ancien.' });
  }

  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!user || user.must_change_password !== true) {
    return res.status(400).json({ message: 'Aucun changement de mot de passe obligatoire en attente.' });
  }

  const m = normalizeMatricule(matricule);
  if (!m || normalizeMatricule(user.matricule) !== m) {
    logSecurityEvent(req, 'auth_force_password_matricule_mismatch', { user_id: user.id }, 'warning');
    return res.status(400).json({ message: 'Matricule incorrect.' });
  }
  if (!bcrypt.compareSync(ancien_mot_de_passe, user.mot_de_passe)) {
    logSecurityEvent(req, 'auth_force_password_wrong_current', { user_id: user.id }, 'warning');
    return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
  }

  const hash = bcrypt.hashSync(nouveau_mot_de_passe, 10);
  db.get('utilisateurs').find({ id: user.id }).assign({
    mot_de_passe: hash,
    must_change_password: false,
    password_changed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).write();
  clearAccountLockOnSuccess(user.id);

  const updated = db.get('utilisateurs').find({ id: user.id }).value();
  const { token } = signPayload({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    nom: updated.nom,
    prenom: updated.prenom,
    etablissement_id: updated.etablissement_id || null,
  });
  res.json({
    message: 'Mot de passe mis à jour. Vous pouvez continuer.',
    token,
    utilisateur: buildPublicUserPayload(updated, req),
  });
});

// GET /api/auth/me — Rafraîchir les données utilisateur depuis la DB
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ message: 'Session révoquée. Reconnectez-vous.' });
    }
    const user = db.get('utilisateurs').find({ id: decoded.id }).value();
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (user.actif === false) return res.status(403).json({ message: 'Compte désactivé' });

    const etab = user.etablissement_id
      ? db.get('etablissements').find({ id: user.etablissement_id }).value()
      : null;

    const { mot_de_passe, ...safe } = user;
    res.json({
      ...safe,
      must_change_password: user.must_change_password === true,
      etablissement_nom: etab?.nom || null,
      etablissement_couleur: etab?.couleur_primaire || null,
      etablissement_logo: publicAssetUrl(req, etab?.logo_url) || null,
    });
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
});

// POST /api/auth/reinitialiser-mot-de-passe-matricule — public, étudiants uniquement
router.post('/reinitialiser-mot-de-passe-matricule', resetPwdLimiter, (req, res) => {
  const { matricule, nouveau_mot_de_passe, confirmation } = req.body;
  if (!matricule || !nouveau_mot_de_passe || !confirmation) {
    return res.status(400).json({ message: 'Matricule, nouveau mot de passe et confirmation requis.' });
  }
  if (nouveau_mot_de_passe !== confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }
  if (nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const m = normalizeMatricule(matricule);
  if (!m || m.length < 4) {
    return res.status(400).json({ message: 'Matricule invalide.' });
  }

  const user = db.get('utilisateurs').value().find(
    (u) => normalizeMatricule(u.matricule) === m
  );
  if (!user || user.role !== 'etudiant') {
    logSecurityEvent(req, 'auth_reset_matricule_not_found', { matricule: m }, 'warning');
    return res.status(404).json({ message: 'Aucun compte étudiant trouvé avec ce matricule.' });
  }
  if (user.actif === false) {
    logSecurityEvent(req, 'auth_reset_matricule_disabled_account', { user_id: user.id, matricule: m }, 'warning');
    return res.status(403).json({ message: 'Ce compte a été désactivé.' });
  }

  const hash = bcrypt.hashSync(nouveau_mot_de_passe, 10);
  db.get('utilisateurs').find({ id: user.id }).assign({
    mot_de_passe: hash,
    must_change_password: false,
    password_changed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).write();

  res.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter avec votre adresse email.' });
});

module.exports = router;
