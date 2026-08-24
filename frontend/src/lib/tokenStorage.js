/**
 * Abstraction stockage session (localStorage aujourd’hui).
 * Migration future possible vers cookies HttpOnly sans toucher tout le front.
 *
 * @see docs/TOKEN_STORAGE_MIGRATION.md
 */

const KEYS = {
  access: 'token',
  refresh: 'refresh_token',
  user: 'user',
};

const memoryFallback = {
  access: null,
  refresh: null,
  user: null,
};

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    if (key === KEYS.access) return memoryFallback.access;
    if (key === KEYS.refresh) return memoryFallback.refresh;
    if (key === KEYS.user) return memoryFallback.user;
    return null;
  }
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    if (key === KEYS.access) memoryFallback.access = value;
    if (key === KEYS.refresh) memoryFallback.refresh = value;
    if (key === KEYS.user) value;
  }
}

export function getAccessToken() {
  return read(KEYS.access);
}

export function getRefreshToken() {
  return read(KEYS.refresh);
}

export function getStoredUserJson() {
  return read(KEYS.user);
}

export function setAccessToken(token) {
  write(KEYS.access, token);
}

export function setRefreshToken(token) {
  write(KEYS.refresh, token);
}

export function setStoredUserJson(json) {
  write(KEYS.user, json);
}

export function setSession({ accessToken, refreshToken, user }) {
  if (accessToken != null) setAccessToken(accessToken);
  if (refreshToken != null) setRefreshToken(refreshToken);
  if (user != null) {
    setStoredUserJson(typeof user === 'string' ? user : JSON.stringify(user));
  }
}

export function clearSession() {
  write(KEYS.access, null);
  write(KEYS.refresh, null);
  write(KEYS.user, null);
}

export const TOKEN_STORAGE_KEYS = KEYS;
