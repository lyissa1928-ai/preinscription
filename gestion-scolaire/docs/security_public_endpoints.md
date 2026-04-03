# Sécurisation des endpoints publics (Vigile / Badge)

## Contexte

Les endpoints **POST /vigile/check-in** et **GET /badge/verify** sont utilisés par des bornes ou kiosques (sans connexion utilisateur). Ils ne doivent pas rester ouverts à tout le monde : ils sont protégés par un **token device** et tracés dans l’audit.

---

## 1. Mécanisme : X-DEVICE-TOKEN

- **Header HTTP obligatoire :** `X-DEVICE-TOKEN: <token_en_clair>`
- Le serveur **ne stocke jamais** le token en clair : uniquement le **hash SHA-256** dans la table `device_tokens`.
- À chaque requête, le serveur hashe la valeur reçue et vérifie qu’un enregistrement actif existe avec ce `token_hash`.

---

## 2. Table `device_tokens`

| Colonne      | Type    | Description                          |
|-------------|---------|--------------------------------------|
| id          | String  | PK (cuid)                            |
| name        | String  | Libellé (ex. "Borne entrée Bât A")   |
| token_hash  | String  | SHA-256 du token, UNIQUE              |
| is_active   | Boolean | Désactiver sans supprimer             |
| created_at  | DateTime | Création                             |

- **Création d’un token :** générer une valeur aléatoire forte (ex. 32 octets en hex), calculer le hash, insérer une ligne avec ce hash et un `name` explicite.
- **Rotation :** créer un nouveau token, mettre à jour la borne, puis mettre `is_active = false` sur l’ancien.

---

## 3. Gestion des tokens

### Création (exemple en Node)

```ts
const crypto = require('crypto');
const plain = crypto.randomBytes(32).toString('hex'); // à communiquer une seule fois à l’opérateur
const hash = crypto.createHash('sha256').update(plain, 'utf8').digest('hex');
// INSERT INTO device_tokens (id, name, token_hash, is_active) VALUES (cuid(), 'Borne A', hash, true);
```

### Désactivation

- Mettre `is_active = false` pour le `token_hash` concerné. Les appels avec l’ancien token renverront **403**.

### Environnement de dev / tests

- Le **seed** crée un token de dev si la variable **DEVICE_TOKEN_PLAIN** est définie, sinon utilise `dev-token-vigile-badge-12345`.
- En tests e2e, utiliser le header :  
  `X-DEVICE-TOKEN: dev-token-vigile-badge-12345`  
  (après avoir exécuté le seed sur la base de test).

---

## 4. Rate limit (recommandation)

- **Actuellement :** aucun rate limit côté app. À ajouter en production (ex. **@nestjs/throttler** ou limite au reverse proxy).
- **Recommandation :** par IP ou par token, ex. 60 requêtes/minute pour /vigile/check-in et /badge/verify, puis 429 (Too Many Requests).

---

## 5. Audit

- Chaque appel à **POST /vigile/check-in** est enregistré dans **AuditLog** :
  - `action` : `VIGILE_CHECKIN`
  - `entityType` : `CheckIn`
  - `entityId` : matricule saisi
  - `newValue` : `AUTORISE` ou `REFUSE`
  - `ip` : adresse IP de la requête (si disponible)
  - `userId` : null (acteur = device)
- Chaque appel à **GET /badge/verify** est enregistré :
  - `action` : `BADGE_VERIFY`
  - `entityType` : `Badge`
  - `newValue` : `VALID`, `INVALID` ou `EMPTY_QR`
  - `ip` : si disponible

---

## 6. Résumé des réponses HTTP

| Situation                    | Code  |
|-----------------------------|-------|
| Header X-DEVICE-TOKEN absent | 403   |
| Token invalide ou inactif    | 403   |
| Token valide                 | 200/201 + corps métier |

---

## 7. Fichiers concernés

- **Guard :** `backend/src/device-token/device-token.guard.ts`
- **Service :** `backend/src/device-token/device-token.service.ts`
- **Module :** `backend/src/device-token/device-token.module.ts`
- **Contrôleurs :** `backend/src/vigile/vigile.controller.ts`, `backend/src/users/badge.controller.ts`
- **Migration :** `backend/prisma/migrations/20260228200000_add_device_token/migration.sql`
