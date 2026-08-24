# Migration future — stockage des tokens

## État actuel (Phase 4 P1)

- **Access token** (JWT court, ex. 15 min) : `localStorage` via `src/lib/tokenStorage.js` (`token`).
- **Refresh token** (rotatif, ex. 7 j) : `localStorage` (`refresh_token`).
- **Utilisateur** : `localStorage` (`user`) — données publiques uniquement.
- Renouvellement silencieux : `src/lib/setupAuthInterceptors.js` → `POST /api/auth/refresh`.

## Risque XSS

Tout script injecté dans le front peut lire `localStorage`. DOMPurify est appliqué sur le HTML conditions d’admission / proforma. Quill ne doit pas accepter de HTML arbitraire non filtré côté sauvegarde.

## Cible recommandée (ultérieur)

1. Access token en **cookie HttpOnly + Secure + SameSite=Strict** (ou Lax si sous-domaines).
2. Refresh token en cookie **HttpOnly** séparé ou rotation côté serveur uniquement.
3. Le front n’appelle plus `getAccessToken()` pour axios : `credentials: 'include'`.
4. Adapter `tokenStorage.js` pour déléguer au cookie (une seule couche à modifier).

## Compatibilité

Les routes API existantes (`Authorization: Bearer`) restent supportées pendant la transition.
