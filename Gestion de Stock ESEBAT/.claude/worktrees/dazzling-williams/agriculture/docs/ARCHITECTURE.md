# Architecture - Agriculture Intelligente

## Vue d'ensemble

Monorepo TypeScript géré par pnpm workspaces.

```
/
├── apps/
│   ├── web/     # Next.js (App Router) - Frontend
│   ├── api/     # NestJS - Backend REST
│   └── iot/     # Service Node - MQTT consumer (à venir)
├── packages/
│   └── shared/  # Types, schémas Zod, constantes partagés
├── deploy/      # Docker staging, nginx, scripts
└── docs/        # Documentation
```

## Stack

- **Package manager**: pnpm
- **Node**: 20 LTS
- **Frontend**: Next.js 14, TailwindCSS, React Query, Zod
- **Backend**: NestJS, Prisma, PostgreSQL, Redis, JWT
- **IoT**: Node TS (MQTT prévu)

## Flux Auth

- Access token JWT (15 min) stocké en mémoire (localStorage)
- Refresh token (7 jours) stocké en localStorage, envoyé au logout/refresh
- Hash Argon2 pour les mots de passe
- Refresh tokens hashés en DB avec jti pour lookup

## RBAC

Rôles: ADMIN, FARMER, AGRONOMIST, TECHNICIAN

- ADMIN: accès complet
- Routes protégées par décorateur @Roles() + RolesGuard
