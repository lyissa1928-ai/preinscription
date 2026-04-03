/**
 * Gestion de session sécurisée
 * - Persistance JWT (localStorage)
 * - Vérification validité ticket
 * - Déconnexion propre (effacement total des données sensibles)
 */

export const SESSION_KEYS = ['token', 'user'] as const;
export const SESSION_EXPIRED_KEY = 'sessionExpired';

/**
 * Efface toutes les données sensibles de la session.
 * Appelé lors d'une déconnexion manuelle ou automatique (idle timeout).
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);

  // Nettoyer tout autre cache potentiellement lié à la session
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('auth_') || key.startsWith('session_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Vérifie si une session valide existe (token + user présents).
 */
export function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!(token && user);
}

/**
 * Vérifie si le JWT est expiré (décodage côté client, sans vérifier la signature).
 * Retourne false si le token est invalide ou expiré.
 */
export function isTokenNotExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return true;
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

/**
 * Marque la session comme expirée (idle timeout) et efface les données.
 * Utilisé avant redirection vers login pour afficher le message approprié.
 */
export function expireSessionForIdle(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');
  clearSession();
}

/**
 * Indique si la dernière déconnexion était due à l'expiration (idle).
 */
export function wasSessionExpiredByIdle(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_EXPIRED_KEY) === 'true';
}

/**
 * Consomme le flag d'expiration (après affichage du message).
 */
export function consumeSessionExpiredFlag(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);
}
