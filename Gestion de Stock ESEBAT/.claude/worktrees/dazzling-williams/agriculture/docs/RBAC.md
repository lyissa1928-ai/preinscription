# RBAC - Rôles et permissions

## Rôles

| Rôle | Niveau | Description |
|------|--------|-------------|
| ADMIN | 4 | Administrateur système |
| AGRONOMIST | 3 | Agronome |
| TECHNICIAN | 2 | Technicien terrain |
| FARMER | 1 | Agriculteur |

## Hiérarchie

Un rôle peut accéder aux routes des rôles de niveau inférieur ou égal (via `hasRequiredRole`).

Exemple: ADMIN peut accéder à /admin/*, /farmer/*, etc.

## Routes protégées

- `/admin/*` => ADMIN uniquement (utilisateurs, régions, cultures, exigences, alert-rules, audit-logs)
- `/farmer/*` => FARMER, ADMIN (exploitation, parcelles, alertes, recommandations)
- `/auth/me` => Authentifié (tous rôles)

## Permissions Admin (Sprint 5)

L'ADMIN peut :
- Gérer les utilisateurs (créer, modifier rôle, activer/désactiver)
- Gérer les référentiels : régions, cultures, exigences agronomiques
- Gérer les règles d'alertes (seuils, cooldown)
- Consulter l'audit log
- Forcer l'évaluation des alertes (POST /admin/alerts/run-now)

## Usage

```typescript
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get()
adminOnly() { ... }
```
