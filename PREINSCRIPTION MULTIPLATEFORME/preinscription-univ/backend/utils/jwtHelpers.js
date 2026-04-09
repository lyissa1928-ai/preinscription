const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signPayload(payload) {
  const jti = uuidv4();
  const token = jwt.sign(
    { ...payload, jti },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return { token, jti };
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN, signPayload };
