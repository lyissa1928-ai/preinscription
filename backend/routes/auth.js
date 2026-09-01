const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { normalizeMatricule, normalizeTelephoneForUniqueness, telephoneTaken } = require('../utils/userIdentity');
const { getFonctions } = require('../utils/userFonctions');
const { generateNextMatriculeForEtablissement } = require('../utils/matriculeGenerator');
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { rateLimit, getClientIp } = require('../utils/rateLimit');
const { logSecurityEvent } = require('../utils/securityEvent');
const {
  antiBotConfig,
  verifyRecaptchaTokenWithDetails,
  verifyRecaptchaEnterpriseWithDetails,
  recaptchaEnterpriseConfigured,
  recaptchaSecret,
  inscriptionCaptchaEnforced,
} = require('../utils/antiBot');
const { verifyAccessToken } = require('../utils/jwtHelpers');
const { revokeToken, isTokenRevoked } = require('../utils/tokenRevocation');
const { issueAuthSession } = require('../utils/authSession');
const { signAccessToken, accessExpiresInSeconds } = require('../utils/jwtHelpers');
const {
  validateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
} = require('../database/authSessionStore');
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
const {
  sendMail,
  emailVerificationEnabled,
  passwordResetEmailEnabled,
  publicAppUrl,
  isSmtpConfigured,
} = require('../utils/mail');

function newSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Compte utilisable à la connexion (e-mail confirmé ou pas de flux vérif actif). */
function isLoginEmailVerified(user) {
  if (!emailVerificationEnabled()) return true;
  if (user.email_verified_at) return true;
  if (!user.email_verify_token) return true;
  return false;
}
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
const forgotEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Trop de demandes. Réessayez dans une heure.',
  keyGenerator: (req) =>
    `forgot-email:${getClientIp(req)}:${String(req.body?.email || '').trim().toLowerCase()}`,
});
const resendVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de renvois. Réessayez dans quelques minutes.',
  keyGenerator: (req) =>
    `resend-verify:${getClientIp(req)}:${String(req.body?.email || '').trim().toLowerCase()}`,
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Trop de demandes de renouvellement de session.',
  keyGenerator: (req) => `refresh:${getClientIp(req)}`,
});
const resetEmailApplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives. Réessayez plus tard.',
  keyGenerator: (req) => `reset-email-apply:${getClientIp(req)}`,
});
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Trop de tentatives. Réessayez plus tard.',
  keyGenerator: (req) => `verify-email:${getClientIp(req)}`,
});

function buildAuthTokensResponse(user, req) {
  const session = issueAuthSession({
    id: user.id,
    email: user.email,
    role: user.role,
    nom: user.nom,
    prenom: user.prenom,
    etablissement_id: user.etablissement_id || null,
  });
  return {
    token: session.token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
    utilisateur: buildPublicUserPayload(user, req),
  };
}

/** Données établissement non sensibles pour le contexte utilisateur connecté */
function buildPublicEtablissementPayload(etab, req) {
  if (!etab) return null;
  return {
    id: etab.id,
    nom: etab.nom,
    type: etab.type || null,
    adresse: etab.adresse || '',
    telephone: etab.telephone || '',
    email_contact: etab.email_contact || '',
    site_web: etab.site_web || '',
    couleur_primaire: etab.couleur_primaire || null,
    couleur_secondaire: etab.couleur_secondaire || null,
    logo_url: publicAssetUrl(req, etab.logo_url) || null,
  };
}

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
    // Fonctions supplémentaires (ex. responsable d'établissement désigné) —
    // le frontend s'en sert pour ouvrir les zones correspondantes.
    fonctions: getFonctions(user),
    matricule: user.matricule || null,
    etablissement_id: user.etablissement_id || null,
    etablissement_nom: etab?.nom || null,
    etablissement_couleur: etab?.couleur_primaire || null,
    etablissement_logo: publicAssetUrl(req, etab?.logo_url) || null,
    etablissement: buildPublicEtablissementPayload(etab, req),
    must_change_password: user.must_change_password === true,
  };
}

/** Profil complet pour GET /api/auth/me (hors secrets) */
function buildMeResponse(user, req) {
  const base = buildPublicUserPayload(user, req);
  return {
    ...base,
    telephone: user.telephone != null ? String(user.telephone) : '',
    adresse: user.adresse != null ? String(user.adresse) : '',
    date_naissance: user.date_naissance ?? null,
    email_verified_at: user.email_verified_at || null,
    actif: user.actif !== false,
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
  const { minFillMs } = antiBotConfig();
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
    } else {
      logSecurityEvent(req, 'inscription_captcha_not_configured', { endpoint: '/api/auth/inscription' }, 'error');
      return res.status(503).json({
        message: 'Inscription temporairement indisponible (reCAPTCHA non configuré sur le serveur).',
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
  const needVerify = emailVerificationEnabled();
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
    email_verified_at: needVerify ? null : new Date().toISOString(),
    email_verify_token: needVerify ? newSecureToken() : null,
    email_verify_expires: needVerify ? Date.now() + 48 * 60 * 60 * 1000 : null,
  };
  db.get('utilisateurs').push(user).write();

  if (needVerify && user.email_verify_token) {
    const url = `${publicAppUrl()}/verifier-email?token=${encodeURIComponent(user.email_verify_token)}`;
    const ok = await sendMail({
      to: emailNorm,
      subject: 'Confirmez votre adresse e-mail — UniPortail',
      text:
        `Bonjour ${user.prenom},\n\n` +
        `Pour activer votre compte, ouvrez ce lien dans votre navigateur :\n${url}\n\n` +
        `Le lien expire dans 48 heures.\n\n` +
        `Si vous n’avez pas créé de compte, ignorez ce message.`,
      html:
        `<p>Bonjour ${escapeHtml(user.prenom)},</p>` +
        `<p>Pour <strong>activer votre compte</strong>, cliquez sur le bouton ci-dessous :</p>` +
        `<p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;">Confirmer mon e-mail</a></p>` +
        `<p style="font-size:12px;color:#64748b;">Ou copiez ce lien :<br/>${escapeHtml(url)}</p>` +
        `<p style="font-size:12px;color:#64748b;">Le lien expire dans 48 h.</p>`,
    });
    if (!ok) {
      logSecurityEvent(req, 'email_verification_send_failed', { user_id: id, email: emailNorm }, 'error');
      return res.status(503).json({
        message:
          'Compte créé mais l’e-mail de confirmation n’a pas pu être envoyé. Contactez le support ou réessayez plus tard (renvoi depuis la page de connexion).',
        code: 'EMAIL_SEND_FAILED',
      });
    }
    return res.status(201).json({
      message: 'Compte créé. Consultez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.',
      requires_email_verification: true,
    });
  }

  res.status(201).json({
    message: 'Compte créé avec succès',
    ...buildAuthTokensResponse(user, req),
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
  if (!isLoginEmailVerified(user)) {
    logSecurityEvent(req, 'auth_login_email_unverified', { email: emailNorm, user_id: user.id }, 'warning');
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      message:
        'Votre adresse e-mail n’est pas encore confirmée. Ouvrez le lien reçu à l’inscription ou demandez un nouvel e-mail depuis la page de connexion.',
    });
  }
  if (user.actif === false) {
    logSecurityEvent(req, 'auth_login_disabled_account', { email: emailNorm, user_id: user.id }, 'warning');
    return res.status(403).json({ message: 'Ce compte a été désactivé. Contactez l\'administrateur.' });
  }

  clearLoginLockout(req, emailNorm);
  clearAccountLockOnSuccess(user.id);

  res.json({
    message: 'Connexion réussie',
    ...buildAuthTokensResponse(user, req),
  });
});

// POST /api/auth/refresh — renouvellement access token (refresh token rotatif)
router.post('/refresh', refreshLimiter, (req, res) => {
  const raw = String(req.body?.refresh_token || '').trim();
  if (!raw) {
    return res.status(400).json({ message: 'refresh_token requis.' });
  }
  const row = validateRefreshToken(raw);
  if (!row) {
    logSecurityEvent(req, 'auth_refresh_invalid', {}, 'warning');
    return res.status(401).json({ message: 'Session expirée. Reconnectez-vous.', code: 'REFRESH_INVALID' });
  }
  const user = db.get('utilisateurs').find({ id: row.user_id }).value();
  if (!user || user.actif === false) {
    revokeRefreshToken(raw);
    return res.status(401).json({ message: 'Compte introuvable ou désactivé.' });
  }
  if (!isLoginEmailVerified(user)) {
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Adresse e-mail non confirmée.',
    });
  }
  const { token } = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    nom: user.nom,
    prenom: user.prenom,
    etablissement_id: user.etablissement_id || null,
  });
  const { refreshToken } = rotateRefreshToken(raw, user.id);
  res.json({
    message: 'Session renouvelée',
    token,
    refresh_token: refreshToken,
    expires_in: accessExpiresInSeconds(),
    token_type: 'Bearer',
    utilisateur: buildPublicUserPayload(user, req),
  });
});

// POST /api/auth/deconnexion — révoque le JWT courant (jti), best-effort
router.post('/deconnexion', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      if (decoded.jti && decoded.exp) {
        revokeToken(decoded.jti, decoded.exp * 1000);
      }
    } catch { /* ignore */ }
  }
  const refreshRaw = String(req.body?.refresh_token || '').trim();
  if (refreshRaw) revokeRefreshToken(refreshRaw);
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
  {
    const vp = validatePasswordPolicy(nouveau_mot_de_passe);
    if (!vp.ok) {
      return res.status(400).json({ message: vp.message, code: 'PASSWORD_POLICY' });
    }
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
  revokeAllRefreshTokensForUser(updated.id);
  res.json({
    message: 'Mot de passe mis à jour. Vous pouvez continuer.',
    ...buildAuthTokensResponse(updated, req),
  });
});

// GET /api/auth/me — Rafraîchir les données utilisateur depuis la DB
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ message: 'Session révoquée. Reconnectez-vous.' });
    }
    const user = db.get('utilisateurs').find({ id: decoded.id }).value();
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (user.actif === false) return res.status(403).json({ message: 'Compte désactivé' });

    res.json(buildMeResponse(user, req));
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
});

// POST /api/auth/reinitialiser-mot-de-passe-matricule — public, étudiants uniquement.
// Durci : ne change plus le mot de passe directement (la seule connaissance du
// matricule permettait la prise de compte). Envoie un lien de réinitialisation
// à l'adresse e-mail associée au compte (même flux que mot-de-passe-oublie-email).
router.post('/reinitialiser-mot-de-passe-matricule', resetPwdLimiter, async (req, res) => {
  const generic = {
    message:
      'Si un compte étudiant existe avec ce matricule, un e-mail de réinitialisation vient d’être envoyé à l’adresse associée au compte.',
  };

  const m = normalizeMatricule(req.body?.matricule);
  if (!m || m.length < 4) {
    return res.status(400).json({ message: 'Matricule invalide.' });
  }
  if (!passwordResetEmailEnabled()) {
    return res.status(503).json({
      code: 'EMAIL_RESET_DISABLED',
      message:
        'La réinitialisation en ligne est momentanément indisponible. Contactez la scolarité de votre établissement.',
    });
  }

  const user = (db.get('utilisateurs').value() || []).find(
    (u) => normalizeMatricule(u.matricule) === m
  );
  if (!user || user.role !== 'etudiant' || user.actif === false || !user.email) {
    logSecurityEvent(req, 'auth_reset_matricule_not_found', { matricule: m }, 'warning');
    return res.json(generic);
  }

  const tok = newSecureToken();
  db.get('utilisateurs').find({ id: user.id }).assign({
    password_reset_token: tok,
    password_reset_expires: Date.now() + 60 * 60 * 1000,
    updated_at: new Date().toISOString(),
  }).write();

  const url = `${publicAppUrl()}/reinitialiser-mot-de-passe-email?token=${encodeURIComponent(tok)}`;
  await sendMail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe — UniPortail',
    text:
      `Bonjour ${user.prenom},\n\n` +
      `Une réinitialisation de mot de passe a été demandée avec votre matricule (${user.matricule}).\n` +
      `Pour choisir un nouveau mot de passe, ouvrez ce lien (valide 1 h) :\n${url}\n\n` +
      `Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.`,
    html:
      `<p>Bonjour ${escapeHtml(user.prenom)},</p>` +
      `<p>Une réinitialisation de mot de passe a été demandée avec votre matricule (${escapeHtml(user.matricule)}).</p>` +
      `<p><a href="${url}">Choisir un nouveau mot de passe</a> (lien valide 1 h)</p>` +
      `<p style="font-size:12px;color:#64748b;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>`,
  });

  logSecurityEvent(req, 'auth_reset_matricule_email_sent', { user_id: user.id }, 'info');
  res.json(generic);
});

// POST /api/auth/verifier-email — lien reçu par e-mail
router.post('/verifier-email', verifyEmailLimiter, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ message: 'Lien invalide (token manquant).' });

  const user = (db.get('utilisateurs').value() || []).find((u) => u.email_verify_token === token);
  if (!user) {
    return res.status(400).json({ message: 'Lien invalide ou déjà utilisé.' });
  }
  if (user.email_verify_expires && Date.now() > user.email_verify_expires) {
    return res.status(400).json({
      code: 'VERIFY_EXPIRED',
      message: 'Ce lien a expiré. Demandez un nouvel e-mail de confirmation depuis la page de connexion.',
    });
  }

  db.get('utilisateurs').find({ id: user.id }).assign({
    email_verified_at: new Date().toISOString(),
    email_verify_token: null,
    email_verify_expires: null,
    updated_at: new Date().toISOString(),
  }).write();

  const updated = db.get('utilisateurs').find({ id: user.id }).value();
  clearAccountLockOnSuccess(user.id);
  res.json({
    message: 'Adresse e-mail confirmée. Vous êtes connecté.',
    ...buildAuthTokensResponse(updated, req),
  });
});

// POST /api/auth/renvoyer-email-verification
router.post('/renvoyer-email-verification', resendVerifyLimiter, async (req, res) => {
  const emailNorm = normalizeEmail(String(req.body?.email || ''));
  if (!emailNorm) {
    return res.status(400).json({ message: 'Adresse e-mail requise.' });
  }
  const user = db.get('utilisateurs').find({ email: emailNorm }).value();
  if (!user || user.role !== 'etudiant') {
    return res.json({
      message: 'Si un compte existe avec cette adresse et qu’une confirmation est nécessaire, un e-mail vient d’être envoyé.',
    });
  }
  if (user.email_verified_at || !user.email_verify_token) {
    return res.json({
      message: 'Si un compte existe avec cette adresse et qu’une confirmation est nécessaire, un e-mail vient d’être envoyé.',
    });
  }

  const tok = newSecureToken();
  const exp = Date.now() + 48 * 60 * 60 * 1000;
  db.get('utilisateurs').find({ id: user.id }).assign({
    email_verify_token: tok,
    email_verify_expires: exp,
    updated_at: new Date().toISOString(),
  }).write();

  const url = `${publicAppUrl()}/verifier-email?token=${encodeURIComponent(tok)}`;
  await sendMail({
    to: emailNorm,
    subject: 'Confirmez votre adresse e-mail — UniPortail',
    text:
      `Bonjour ${user.prenom},\n\nPour activer votre compte :\n${url}\n\nLe lien expire dans 48 heures.`,
    html:
      `<p>Bonjour ${escapeHtml(user.prenom)},</p>` +
      `<p><a href="${url}">Confirmer mon e-mail</a></p>` +
      `<p style="font-size:12px;color:#64748b;">Expire dans 48 h.</p>`,
  });

  res.json({
    message: 'Si un compte existe avec cette adresse et qu’une confirmation est nécessaire, un e-mail vient d’être envoyé.',
  });
});

// POST /api/auth/mot-de-passe-oublie-email — envoi lien (étudiants)
router.post('/mot-de-passe-oublie-email', forgotEmailLimiter, async (req, res) => {
  const emailNorm = normalizeEmail(String(req.body?.email || ''));
  const generic = {
    message:
      'Si un compte étudiant existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé.',
  };
  if (!passwordResetEmailEnabled() || !emailNorm) {
    return res.json(generic);
  }

  const user = db.get('utilisateurs').find({ email: emailNorm }).value();
  if (!user || user.role !== 'etudiant' || user.actif === false) {
    return res.json(generic);
  }

  const tok = newSecureToken();
  db.get('utilisateurs').find({ id: user.id }).assign({
    password_reset_token: tok,
    password_reset_expires: Date.now() + 60 * 60 * 1000,
    updated_at: new Date().toISOString(),
  }).write();

  const url = `${publicAppUrl()}/reinitialiser-mot-de-passe-email?token=${encodeURIComponent(tok)}`;
  await sendMail({
    to: emailNorm,
    subject: 'Réinitialisation de votre mot de passe — UniPortail',
    text:
      `Bonjour ${user.prenom},\n\n` +
      `Pour choisir un nouveau mot de passe, ouvrez ce lien (valide 1 h) :\n${url}\n\n` +
      `Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.`,
    html:
      `<p>Bonjour ${escapeHtml(user.prenom)},</p>` +
      `<p><a href="${url}">Choisir un nouveau mot de passe</a> (lien valide 1 h)</p>` +
      `<p style="font-size:12px;color:#64748b;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>`,
  });

  res.json(generic);
});

// POST /api/auth/reinitialiser-mot-de-passe-email
router.post('/reinitialiser-mot-de-passe-email', resetEmailApplyLimiter, (req, res) => {
  const token = String(req.body?.token || '').trim();
  const { nouveau_mot_de_passe, confirmation } = req.body;
  if (!token || !nouveau_mot_de_passe || !confirmation) {
    return res.status(400).json({ message: 'Token, nouveau mot de passe et confirmation requis.' });
  }
  if (nouveau_mot_de_passe !== confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }
  const vp = validatePasswordPolicy(nouveau_mot_de_passe);
  if (!vp.ok) {
    return res.status(400).json({ message: vp.message, code: 'PASSWORD_POLICY' });
  }

  const user = (db.get('utilisateurs').value() || []).find((u) => u.password_reset_token === token);
  if (!user || user.role !== 'etudiant') {
    logSecurityEvent(req, 'auth_reset_email_bad_token', {}, 'warning');
    return res.status(400).json({ message: 'Lien invalide ou expiré.' });
  }
  if (!user.password_reset_expires || Date.now() > user.password_reset_expires) {
    return res.status(400).json({ message: 'Lien expiré. Demandez une nouvelle réinitialisation.' });
  }

  const hash = bcrypt.hashSync(nouveau_mot_de_passe, 10);
  db.get('utilisateurs').find({ id: user.id }).assign({
    mot_de_passe: hash,
    password_reset_token: null,
    password_reset_expires: null,
    must_change_password: false,
    password_changed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).write();

  const updated = db.get('utilisateurs').find({ id: user.id }).value();
  clearAccountLockOnSuccess(user.id);
  revokeAllRefreshTokensForUser(updated.id);
  res.json({
    message: 'Mot de passe mis à jour. Vous êtes connecté.',
    ...buildAuthTokensResponse(updated, req),
  });
});

// GET /api/auth/options-public — pour le front (affichage liens)
router.get('/options-public', (req, res) => {
  res.json({
    email_verification_enabled: emailVerificationEnabled(),
    password_reset_email_enabled: passwordResetEmailEnabled(),
    smtp_configured: isSmtpConfigured(),
  });
});

// POST /api/auth/verifier-email — lien reçu par e-mail
router.post('/verifier-email', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ message: 'Lien invalide (token manquant).' });

  const user = (db.get('utilisateurs').value() || []).find((u) => u.email_verify_token === token);
  if (!user) {
    return res.status(400).json({ message: 'Lien invalide ou déjà utilisé.' });
  }
  if (user.email_verify_expires && Date.now() > user.email_verify_expires) {
    return res.status(400).json({
      code: 'VERIFY_EXPIRED',
      message: 'Ce lien a expiré. Demandez un nouvel e-mail de confirmation depuis la page de connexion.',
    });
  }

  db.get('utilisateurs').find({ id: user.id }).assign({
    email_verified_at: new Date().toISOString(),
    email_verify_token: null,
    email_verify_expires: null,
    updated_at: new Date().toISOString(),
  }).write();

  const updated = db.get('utilisateurs').find({ id: user.id }).value();
  clearAccountLockOnSuccess(user.id);
  const { token: jwt } = signPayload({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    nom: updated.nom,
    prenom: updated.prenom,
    etablissement_id: updated.etablissement_id || null,
  });
  res.json({
    message: 'Adresse e-mail confirmée. Vous êtes connecté.',
    token: jwt,
    utilisateur: buildPublicUserPayload(updated, req),
  });
});

// POST /api/auth/renvoyer-email-verification
router.post('/renvoyer-email-verification', resendVerifyLimiter, async (req, res) => {
  const emailNorm = normalizeEmail(String(req.body?.email || ''));
  if (!emailNorm) {
    return res.status(400).json({ message: 'Adresse e-mail requise.' });
  }
  const user = db.get('utilisateurs').find({ email: emailNorm }).value();
  if (!user || user.role !== 'etudiant') {
    return res.json({
      message: 'Si un compte existe avec cette adresse et qu’une confirmation est nécessaire, un e-mail vient d’être envoyé.',
    });
  }
  if (user.email_verified_at || !user.email_verify_token) {
    return res.json({
      message: 'Si un compte existe avec cette adresse et qu’une confirmation est nécessaire, un e-mail vient d’être envoyé.',
    });
  }

  const tok = newSecureToken();
  const exp = Date.now() + 48 * 60 * 60 * 1000;
  db.get('utilisateurs').find({ id: user.id }).assign({
    email_verify_token: tok,
    email_verify_expires: exp,
    updated_at: new Date().toISOString(),
  }).write();

  const url = `${publicAppUrl()}/verifier-email?token=${encodeURIComponent(tok)}`;
  await sendMail({
    to: emailNorm,
    subject: 'Confirmez votre adresse e-mail — UniPortail',
    text:
      `Bonjour ${user.prenom},\n\nPour activer votre compte :\n${url}\n\nLe lien expire dans 48 heures.`,
    html:
      `<p>Bonjour ${escapeHtml(user.prenom)},</p>` +
      `<p><a href="${url}">Confirmer mon e-mail</a></p>` +
      `<p style="font-size:12px;color:#64748b;">Expire dans 48 h.</p>`,
  });

  res.json({
    message: 'Si un compte existe avec cette adresse et qu’une confirmation est nécessaire, un e-mail vient d’être envoyé.',
  });
});

// POST /api/auth/mot-de-passe-oublie-email — envoi lien (étudiants)
router.post('/mot-de-passe-oublie-email', forgotEmailLimiter, async (req, res) => {
  const emailNorm = normalizeEmail(String(req.body?.email || ''));
  const generic = {
    message:
      'Si un compte étudiant existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé.',
  };
  if (!passwordResetEmailEnabled() || !emailNorm) {
    return res.json(generic);
  }

  const user = db.get('utilisateurs').find({ email: emailNorm }).value();
  if (!user || user.role !== 'etudiant' || user.actif === false) {
    return res.json(generic);
  }

  const tok = newSecureToken();
  db.get('utilisateurs').find({ id: user.id }).assign({
    password_reset_token: tok,
    password_reset_expires: Date.now() + 60 * 60 * 1000,
    updated_at: new Date().toISOString(),
  }).write();

  const url = `${publicAppUrl()}/reinitialiser-mot-de-passe-email?token=${encodeURIComponent(tok)}`;
  await sendMail({
    to: emailNorm,
    subject: 'Réinitialisation de votre mot de passe — UniPortail',
    text:
      `Bonjour ${user.prenom},\n\n` +
      `Pour choisir un nouveau mot de passe, ouvrez ce lien (valide 1 h) :\n${url}\n\n` +
      `Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.`,
    html:
      `<p>Bonjour ${escapeHtml(user.prenom)},</p>` +
      `<p><a href="${url}">Choisir un nouveau mot de passe</a> (lien valide 1 h)</p>` +
      `<p style="font-size:12px;color:#64748b;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>`,
  });

  res.json(generic);
});

// POST /api/auth/reinitialiser-mot-de-passe-email
router.post('/reinitialiser-mot-de-passe-email', (req, res) => {
  const token = String(req.body?.token || '').trim();
  const { nouveau_mot_de_passe, confirmation } = req.body;
  if (!token || !nouveau_mot_de_passe || !confirmation) {
    return res.status(400).json({ message: 'Token, nouveau mot de passe et confirmation requis.' });
  }
  if (nouveau_mot_de_passe !== confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }
  const vp = validatePasswordPolicy(nouveau_mot_de_passe);
  if (!vp.ok) {
    return res.status(400).json({ message: vp.message, code: 'PASSWORD_POLICY' });
  }

  const user = (db.get('utilisateurs').value() || []).find((u) => u.password_reset_token === token);
  if (!user || user.role !== 'etudiant') {
    logSecurityEvent(req, 'auth_reset_email_bad_token', {}, 'warning');
    return res.status(400).json({ message: 'Lien invalide ou expiré.' });
  }
  if (!user.password_reset_expires || Date.now() > user.password_reset_expires) {
    return res.status(400).json({ message: 'Lien expiré. Demandez une nouvelle réinitialisation.' });
  }

  const hash = bcrypt.hashSync(nouveau_mot_de_passe, 10);
  db.get('utilisateurs').find({ id: user.id }).assign({
    mot_de_passe: hash,
    password_reset_token: null,
    password_reset_expires: null,
    must_change_password: false,
    password_changed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).write();

  const updated = db.get('utilisateurs').find({ id: user.id }).value();
  clearAccountLockOnSuccess(user.id);
  const { token: jwt } = signPayload({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    nom: updated.nom,
    prenom: updated.prenom,
    etablissement_id: updated.etablissement_id || null,
  });
  res.json({
    message: 'Mot de passe mis à jour. Vous êtes connecté.',
    token: jwt,
    utilisateur: buildPublicUserPayload(updated, req),
  });
});

// GET /api/auth/options-public — pour le front (affichage liens)
router.get('/options-public', (req, res) => {
  res.json({
    email_verification_enabled: emailVerificationEnabled(),
    password_reset_email_enabled: passwordResetEmailEnabled(),
    smtp_configured: isSmtpConfigured(),
  });
});

function phonesMatch(a, b) {
  const na = normalizeTelephoneForUniqueness(a);
  const nb = normalizeTelephoneForUniqueness(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const sa = na.slice(-9);
  const sb = nb.slice(-9);
  return sa.length >= 8 && sa === sb;
}

// POST /api/auth/reinitialiser-mot-de-passe-staff — public, personnel (hors étudiants)
// Matricule + téléphone → mot de passe temporaire (changement obligatoire à la connexion).
router.post('/reinitialiser-mot-de-passe-staff', resetPwdLimiter, (req, res) => {
  const { generateTempPassword } = require('../utils/accountLock');
  const m = normalizeMatricule(req.body?.matricule);
  const tel = String(req.body?.telephone || '').trim();
  if (!m || m.length < 4) {
    return res.status(400).json({ message: 'Matricule invalide.' });
  }
  if (!tel || normalizeTelephoneForUniqueness(tel).length < 8) {
    return res.status(400).json({ message: 'Numéro de téléphone invalide.' });
  }

  const user = (db.get('utilisateurs').value() || []).find(
    (u) => normalizeMatricule(u.matricule) === m,
  );
  const failGeneric = () => {
    logSecurityEvent(req, 'auth_reset_staff_failed', { matricule: m }, 'warning');
    return res.status(400).json({
      message: 'Matricule ou téléphone incorrect, ou compte non éligible.',
    });
  };

  if (!user || user.role === 'etudiant' || user.actif === false) return failGeneric();
  if (!phonesMatch(user.telephone, tel)) return failGeneric();

  const plain = generateTempPassword(12);
  const hash = bcrypt.hashSync(plain, 10);
  db.get('utilisateurs').find({ id: user.id }).assign({
    mot_de_passe: hash,
    must_change_password: true,
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
    password_reset_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).write();

  logSecurityEvent(req, 'auth_reset_staff_ok', { user_id: user.id, role: user.role }, 'warning');
  return res.json({
    message:
      'Mot de passe temporaire généré. Connectez-vous puis changez-le immédiatement. Conservez-le en lieu sûr.',
    mot_de_passe_temporaire: plain,
    email: user.email,
  });
});

// PUT /api/auth/profil — infos personnelles (tous rôles authentifiés)
router.put('/profil', authMiddleware, (req, res) => {
  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

  const prenom = trimStr(req.body?.prenom);
  const nom = trimStr(req.body?.nom);
  const telephone = trimStr(req.body?.telephone);
  const adresse = trimStr(req.body?.adresse);
  const date_naissance = req.body?.date_naissance != null ? String(req.body.date_naissance).trim() || null : undefined;

  if (!prenom || !nom) {
    return res.status(400).json({ message: 'Prénom et nom sont obligatoires.' });
  }
  if (telephone && normalizeTelephoneForUniqueness(telephone).length < 8) {
    return res.status(400).json({ message: 'Téléphone invalide.' });
  }
  if (telephone && telephoneTaken(normalizeTelephoneForUniqueness(telephone), user.id)) {
    return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé.' });
  }

  const patch = {
    prenom,
    nom,
    telephone: telephone || '',
    adresse: adresse || '',
    updated_at: new Date().toISOString(),
  };
  if (date_naissance !== undefined) patch.date_naissance = date_naissance;

  db.get('utilisateurs').find({ id: user.id }).assign(patch).write();
  const updated = db.get('utilisateurs').find({ id: user.id }).value();
  return res.json({
    message: 'Profil mis à jour.',
    utilisateur: buildMeResponse(updated, req),
  });
});

// PUT /api/auth/mot-de-passe — changer le mot de passe (connecté)
router.put('/mot-de-passe', authMiddleware, (req, res) => {
  const ancien = String(req.body?.ancien_mot_de_passe || '');
  const nouveau = String(req.body?.nouveau_mot_de_passe || '');
  const confirmation = String(req.body?.confirmation || '');
  if (!ancien || !nouveau || !confirmation) {
    return res.status(400).json({ message: 'Ancien mot de passe, nouveau et confirmation requis.' });
  }
  if (nouveau !== confirmation) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }
  const vp = validatePasswordPolicy(nouveau);
  if (!vp.ok) return res.status(400).json({ message: vp.message, code: 'PASSWORD_POLICY' });

  const user = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (!bcrypt.compareSync(ancien, user.mot_de_passe)) {
    return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
  }
  if (nouveau === ancien) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit être différent.' });
  }

  db.get('utilisateurs').find({ id: user.id }).assign({
    mot_de_passe: bcrypt.hashSync(nouveau, 10),
    must_change_password: false,
    updated_at: new Date().toISOString(),
  }).write();
  revokeAllRefreshTokensForUser(user.id);
  return res.json({ message: 'Mot de passe mis à jour. Reconnectez-vous sur les autres appareils si besoin.' });
});

const {
  exportForUser,
  getBackupEndpointsForUser,
  getManifestForRole,
  restoreUserProfileData,
} = require('../utils/userDataExport');
const { logAudit } = require('../utils/auditLog');
const {
  buildUserDataZip,
  sendZipDownload,
  handleBackupUpload,
  isRestoreConfirmed,
  parseUploadedBackupZip,
} = require('../utils/backupZip');

// GET /api/auth/mes-donnees/manifest — périmètre export/restauration selon le rôle
router.get('/mes-donnees/manifest', authMiddleware, (req, res) => {
  return res.json(getBackupEndpointsForUser(req.user));
});

// GET /api/auth/mes-donnees/export — archive ZIP
router.get('/mes-donnees/export', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(400).json({
      message: 'Utilisez Maintenance ou GET /api/admin/backup/export pour une sauvegarde complète.',
    });
  }
  const data = exportForUser(req.user);
  if (!data) return res.status(404).json({ message: 'Rien à exporter.' });
  const manifest = getManifestForRole(req.user.role);
  const { buffer, filename } = buildUserDataZip(data, {
    included: manifest.included,
    excluded: manifest.excluded,
  });
  logAudit(req, 'export_donnees_utilisateur', 'utilisateur', req.user.id, {
    export_type: data._exportType,
    scope: req.user.role,
    format: 'zip',
    filename,
  });
  return sendZipDownload(res, buffer, filename);
});

// POST /api/auth/mes-donnees/restore — restauration depuis ZIP
router.post('/mes-donnees/restore', authMiddleware, handleBackupUpload('backup'), (req, res) => {
  if (req.user.role === 'admin' || req.user.role === 'admin_etablissement') {
    return res.status(400).json({
      message: 'Utilisez la restauration établissement (page Équipe) ou plateforme (Maintenance).',
    });
  }
  if (!isRestoreConfirmed(req.body)) {
    return res.status(400).json({ message: 'Confirmation requise (confirm=true).' });
  }
  try {
    const parsed = parseUploadedBackupZip(req.file.buffer);
    if (parsed.kind !== 'donnees') {
      return res.status(400).json({ message: 'ZIP utilisateur attendu (donnees.json).' });
    }
    const result = restoreUserProfileData(req.user, parsed.payload);
    logAudit(req, 'restauration_profil_utilisateur', 'utilisateur', req.user.id, {
      pre_backup: result.preBackup,
      format: 'zip',
    });
    return res.json({ message: result.message, pre_backup: result.preBackup });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
});

module.exports = router;
