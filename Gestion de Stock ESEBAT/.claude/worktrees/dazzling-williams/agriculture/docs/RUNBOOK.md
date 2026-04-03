# Runbook - Agriculture Intelligente

## Démarrage local

```bash
# 1. Variables d'environnement
cp .env.example .env
# Éditer .env si besoin

# 2. Docker (Postgres + Redis)
docker compose up -d

# 3. Dépendances
pnpm install

# 4. Migrations
pnpm db:migrate

# 5. Seed régions
pnpm db:seed

# 6. Lancer dev
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Swagger: http://localhost:4000/docs

## Déploiement staging (Debian)

```bash
./deploy/scripts/deploy.sh
```

Prérequis: Docker, Docker Compose, .env configuré.

## Backup DB

```bash
./deploy/scripts/backup_db.sh [dossier_destination]
```

## Cron jobs (Alertes Sprint 4)

Le cron d'évaluation des alertes tourne automatiquement toutes les 30 minutes (configurable via `ALERTS_EVALUATION_MINUTES`).

Pour tester manuellement :

```bash
# Via curl (authentifié)
curl -X POST http://localhost:4000/admin/alerts/run-now \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```

Ou via Swagger : `POST /admin/alerts/run-now` (nécessite rôle ADMIN).

## Admin Panel (Sprint 5)

L'interface admin est accessible à http://localhost:3000/admin (connexion ADMIN requise).

Pages disponibles :
- /admin - Vue d'ensemble
- /admin/users - Gestion utilisateurs et rôles
- /admin/regions - Référentiel régions
- /admin/crops - Catalogue cultures
- /admin/crop-requirements - Exigences agronomiques (reco)
- /admin/alert-rules - Règles et seuils alertes
- /admin/audit-logs - Historique des actions admin

Un farmer ou non-ADMIN qui accède à /admin est redirigé vers /dashboard.

## Commandes utiles

- `pnpm dev` - Lance web + api
- `pnpm build` - Build tout
- `pnpm db:migrate` - Migrations
- `pnpm db:seed` - Seed régions + règles alertes
- `pnpm docker:up` / `pnpm docker:down` - Docker Compose
