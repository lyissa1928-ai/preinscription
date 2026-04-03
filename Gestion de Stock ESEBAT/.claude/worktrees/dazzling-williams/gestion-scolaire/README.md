# Gestion Scolaire

Application de gestion pour établissement d'enseignement supérieur (Next.js + NestJS + Prisma + PostgreSQL).

## Prérequis

- Node.js 18+
- Docker (pour PostgreSQL) ou PostgreSQL installé localement
- npm

## Installation

### 1. Démarrer la base de données

```bash
docker-compose up -d
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
# Éditer .env si nécessaire
cp backend/.env.example backend/.env
```

### 3. Installer les dépendances

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 4. Migrer la base de données

```bash
npm run migrate
```

### 5. Lancer l'application

```bash
# Développement (backend sur :3000, frontend sur :3001)
npm run dev

# Ou séparément :
# Terminal 1 : npm run dev:backend
# Terminal 2 : npm run dev:frontend
```

## Structure

```
gestion-scolaire/
├── backend/       # NestJS API (port 3000)
├── frontend/      # Next.js (port 3001)
├── docker-compose.yml
└── README.md
```

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance backend + frontend en mode développement |
| `npm run build` | Build production |
| `npm run start` | Lance en mode production |
| `npm run migrate` | Migrations Prisma (dev) |
| `npm run migrate:deploy` | Migrations Prisma (production) |
| `npm run db:studio` | Ouvre Prisma Studio |

## API

- Health check : `GET http://localhost:3000/health`
