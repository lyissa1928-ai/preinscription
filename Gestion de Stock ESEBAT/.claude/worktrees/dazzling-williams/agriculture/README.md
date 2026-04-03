# Agriculture Intelligente (Sénégal)

Application web pour l'agriculture intelligente au Sénégal.

## Stack

- **Monorepo** pnpm workspaces
- **Frontend**: Next.js 14, TailwindCSS, React Query, Zod
- **Backend**: NestJS, Prisma, PostgreSQL, Redis
- **Auth**: JWT (access + refresh), RBAC
- **IoT**: Service Node (MQTT prévu)

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **Swagger**: http://localhost:4000/docs

## Commandes

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lance web + api |
| `pnpm dev:web` | Lance uniquement le frontend |
| `pnpm dev:api` | Lance uniquement l'API |
| `pnpm build` | Build shared + web + api |
| `pnpm lint` | Lint tout |
| `pnpm test` | Tests |
| `pnpm db:migrate` | Migrations Prisma |
| `pnpm db:seed` | Seed régions Sénégal |
| `pnpm docker:up` | Démarre Postgres + Redis |

## Sprint 2 - Météo & Climat

- Météo via OpenWeather (forecast 5 jours)
- Cache Redis + stockage Postgres
- Fallback DB si provider down (badge "stale")
- Widgets: prévisions 7 jours, historique 30 jours
- **OPENWEATHER_API_KEY** requis : https://openweathermap.org/api

## Sprint 1 - Farmer Core

- Profil exploitation (Farm) : création / mise à jour
- Parcelles CRUD avec soft delete
- Dashboard Farmer v1 (stats, dernières parcelles)
- Multi-tenant : un farmer ne voit que ses données

## Structure

```
apps/
  web/    - Next.js
  api/    - NestJS
  iot/    - Service MQTT
packages/
  shared/ - Types, schémas, enums
deploy/   - Docker staging, nginx
docs/     - Documentation
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [RBAC](docs/RBAC.md)
- [Schéma DB](docs/DB_SCHEMA.md)
- [API](docs/API.md)
- [Runbook](docs/RUNBOOK.md)
