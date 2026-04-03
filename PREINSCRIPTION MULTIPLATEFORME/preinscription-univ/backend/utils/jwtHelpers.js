const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'preinscription_secret_key_2024';
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
