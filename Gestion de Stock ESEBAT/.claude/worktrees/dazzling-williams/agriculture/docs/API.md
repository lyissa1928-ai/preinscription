# API - Agriculture Intelligente

Base URL: `http://localhost:4000` (dev)

## Documentation Swagger

`GET /docs` - Swagger UI

## Auth

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /auth/register | Inscription (email, password, role?) |
| POST | /auth/login | Connexion |
| POST | /auth/refresh | Rafraîchir access token |
| POST | /auth/logout | Invalider refresh token |
| GET | /auth/me | Utilisateur connecté (Bearer) |

## Health

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /health | Statut API |

## Régions (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /regions | Liste des régions |
| GET | /regions/:id | Détail région |

## Farmer Core (FARMER, ADMIN)

### Exploitation (Farm)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /farmer/farm | Profil exploitation (404 si inexistant) |
| POST | /farmer/farm | Créer exploitation |
| PATCH | /farmer/farm | Mettre à jour |

### Parcelles (Parcels)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /farmer/parcels | Liste (page, limit, sort, search) |
| GET | /farmer/parcels/:id | Détail |
| POST | /farmer/parcels | Créer |
| PATCH | /farmer/parcels/:id | Mettre à jour |
| DELETE | /farmer/parcels/:id | Soft delete |

### Dashboard

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /farmer/dashboard | Stats + 5 dernières parcelles |

### Météo (Sprint 2)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /farmer/parcels/:id/weather | Prévision 7 jours (days=1..14) |
| GET | /farmer/parcels/:id/weather/history | Historique (days=7..90) |

**Réponse weather:**
```json
{
  "parcelId": "...",
  "provider": "openweather",
  "stale": false,
  "fromCache": false,
  "refreshedAt": "2025-02-12T...",
  "daily": [
    {
      "date": "2025-02-12",
      "tMin": 18,
      "tMax": 28,
      "tAvg": 23,
      "humidityAvg": 65,
      "rainfallMm": 0,
      "windSpeedAvg": 3.5
    }
  ]
}
```

- `stale: true` = données de secours depuis la DB (provider down)
- `fromCache: true` = données depuis Redis

### Profil sol (Sprint 3)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /farmer/parcels/:id/soil | Profil sol (pH, humidité, salinité) |
| PUT | /farmer/parcels/:id/soil | Mettre à jour profil sol |

**Body PUT:** `{ ph?: number, soilMoisture?: number, salinity?: number }` (0-14, 0-100%, ≥0)

### Recommandations cultures (Sprint 3)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /farmer/parcels/:id/recommendations/run | Lancer recommandation |
| GET | /farmer/parcels/:id/recommendations | Historique par parcelle (page, limit) |
| GET | /farmer/recommendations | Historique toutes parcelles |
| GET | /farmer/recommendations/:id | Détail recommandation |

**Body POST run:** `{ season?: "DRY" | "RAINY", historyDays?: 7..90 }` (optionnel)

**Réponse run:**
```json
{
  "recommendationId": "...",
  "results": [
    {
      "cropId": "...",
      "cropName": "Arachide",
      "score": 75,
      "recommended": true,
      "positiveReasons": ["pH compatible", "..."],
      "negativeReasons": [],
      "missingData": [],
      "explainText": "pH (6.2) compatible..."
    }
  ],
  "season": "RAINY",
  "topCropId": "...",
  "topScore": 75
}
```

### Alertes (Sprint 4 - FARMER, ADMIN)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /farmer/alerts | Liste paginée (page, limit, status?, severity?) |
| GET | /farmer/alerts/summary | Résumé: open, critical, warning, lastTriggeredAt |
| GET | /farmer/alerts/:id | Détail alerte |
| POST | /farmer/alerts/:id/ack | Acquitter |
| POST | /farmer/alerts/:id/resolve | Résoudre |
| POST | /farmer/alerts/:id/mute | Mettre en sourdine (body: { hours }) |

### Admin (ADMIN uniquement)

#### Utilisateurs
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /admin/users | Liste paginée (page, limit, q, role, isActive) |
| GET | /admin/users/:id | Détail utilisateur |
| POST | /admin/users | Créer (email, password, role, isActive?) |
| PATCH | /admin/users/:id | Modifier (role?, isActive?, resetPassword?) |
| POST | /admin/users/:id/disable | Désactiver |
| POST | /admin/users/:id/enable | Activer |

#### Régions
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /admin/regions | Liste paginée (page, limit, q, zone, isActive) |
| GET | /admin/regions/:id | Détail |
| POST | /admin/regions | Créer |
| PATCH | /admin/regions/:id | Modifier |
| POST | /admin/regions/:id/disable | Désactiver |
| POST | /admin/regions/:id/enable | Activer |

#### Cultures
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /admin/crops | Liste paginée (page, limit, q, category, isActive) |
| GET | /admin/crops/:id | Détail |
| POST | /admin/crops | Créer |
| PATCH | /admin/crops/:id | Modifier |
| POST | /admin/crops/:id/disable | Désactiver |
| POST | /admin/crops/:id/enable | Activer |

#### Exigences agronomiques
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /admin/crop-requirements | Liste paginée (page, limit, cropId, regionId, season, isActive) |
| GET | /admin/crop-requirements/:id | Détail |
| POST | /admin/crop-requirements | Créer |
| PATCH | /admin/crop-requirements/:id | Modifier |
| POST | /admin/crop-requirements/:id/disable | Désactiver |
| POST | /admin/crop-requirements/:id/enable | Activer |
| POST | /admin/crop-requirements/:id/new-version | Nouvelle version |

#### Règles alertes
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /admin/alert-rules | Liste paginée (page, limit, type, severity, scope, isActive) |
| GET | /admin/alert-rules/:id | Détail |
| POST | /admin/alert-rules | Créer |
| PATCH | /admin/alert-rules/:id | Modifier |
| POST | /admin/alert-rules/:id/disable | Désactiver |
| POST | /admin/alert-rules/:id/enable | Activer |
| POST | /admin/alerts/run-now | Force évaluation (debug) |

#### Audit
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /admin/audit-logs | Liste paginée (page, limit, actorId, entity, action, from, to) |

## Format erreur

```json
{
  "error": {
     "code": "STRING",
     "message": "STRING",
     "details": null
  }
}
```
