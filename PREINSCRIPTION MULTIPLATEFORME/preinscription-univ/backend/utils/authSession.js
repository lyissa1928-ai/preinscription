/**
 * Émission paire access + refresh pour un utilisateur connecté.
 */
const { signAccessToken, accessExpiresInSeconds } = require('./jwtHelpers');
const { createRefreshToken } = require('../database/authSessionStore');

function issueAuthSession(userPayload) {
  const { token, jti } = signAccessToken(userPayload);
  const { refreshToken, expiresAt } = createRefreshToken(userPayload.id);
  return {
    token,
    jti,
    refresh_token: refreshToken,
    refresh_expires_at: expiresAt,
    expires_in: accessExpiresInSeconds(),
    token_type: 'Bearer',
  };
}

module.exports = { issueAuthSession };
