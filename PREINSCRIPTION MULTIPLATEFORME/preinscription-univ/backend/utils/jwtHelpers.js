const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { parseDurationMs } = require('./durationMs');

function resolveJwtSecret() {
  const raw = process.env.JWT_SECRET;
  const trimmed = raw != null ? String(raw).trim() : '';
  if (trimmed) return trimmed;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error(
      'JWT_SECRET doit être défini et non vide en production (variable d’environnement).'
    );
  }
  console.warn(
    '⚠️ [dev] JWT_SECRET absent — secret par défaut utilisé (uniquement pour le développement local).'
  );
  return 'preinscription_secret_key_2024';
}

const JWT_SECRET = resolveJwtSecret();

/** Durée access token : JWT_ACCESS_EXPIRES_IN prioritaire, sinon JWT_EXPIRES_IN (rétrocompat), défaut 15m. */
const JWT_ACCESS_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';

const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/** @deprecated alias — utiliser JWT_ACCESS_EXPIRES_IN */
const JWT_EXPIRES_IN = JWT_ACCESS_EXPIRES_IN;

function accessExpiresInSeconds() {
  return Math.max(60, Math.floor(parseDurationMs(JWT_ACCESS_EXPIRES_IN, 15 * 60_000) / 1000));
}

function signAccessToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign(
    { ...payload, jti, typ: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN },
  );
  return { token, jti };
}

/** Rétrocompat : signPayload = access token */
function signPayload(payload) {
  return signAccessToken(payload);
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  accessExpiresInSeconds,
  signPayload,
  signAccessToken,
  verifyAccessToken,
};
