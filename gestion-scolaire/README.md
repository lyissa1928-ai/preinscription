# Gestion Scolaire

Application de gestion pour établissement d'enseignement supérieur (Next.js + NestJS + Prisma + SQLite/PostgreSQL).

## Prérequis

- Node.js 18+
- Docker (optionnel, pour PostgreSQL en production)
- npm

## Installation

### 1. Configurer les variables d'environnement

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Par défaut, **SQLite** est utilisé (aucun Docker requis). Pour PostgreSQL, décommenter la ligne dans `.env` et lancer `docker-compose up -d`.

### 2. Installer les dépendances

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Migrer la base de données

```bash
npm run migrate
```

### 4. Lancer l'application

Depuis le dossier `gestion-scolaire` :

```bash
npm run dev
```

Backend : http://localhost:3000 | Frontend : http://localhost:3001

**Chemins utiles :**
- Depuis `projet IA` : `cd gestion-scolaire` puis `npm run dev`
- Depuis `gestion-scolaire` : `npm run dev` directement
- Pour Prisma depuis la racine : `cd backend` puis `npx prisma migrate dev`

## Structure

```
gestion-scolaire/
├── backend/       # NestJS API (port 3000)
├── frontend/      # Next.js (port 3001)
├── docker-compose.yml
├── docs/
│   └── DEPLOYMENT.md   # Guide de déploiement
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
| `npm run seed` | Peuplement BDD (comptes de test) |

## Campus et emplois du temps

- **Campus** : chaque site (campus) regroupe des **salles**. Les salles sont rattachées à un campus (optionnel).
- **Emploi du temps par campus** : l’emploi du temps d’un campus correspond aux cours ayant lieu dans les salles de ce campus. On peut filtrer les cours et les vues par campus (API : `?campusId=`, interface Scolarité / Pédagogie).
- **Qui crée les emplois du temps ?** En pratique, la création et la modification des emplois du temps sont assurées par le rôle **Scolarité** (et éventuellement **Service Pédagogique** / Admin). Les enseignants consultent leur emploi du temps ; ils ne le créent pas.

## API

- **Documentation Swagger** : http://localhost:3000/api/docs
- **Health check** : `GET http://localhost:3000/health` (status, database)
- **Login** : `POST http://localhost:3000/auth/login` (body: `{ email, password }`)
- **Profil** : `GET /auth/me`, `PATCH /users/me` (body: `{ firstName?, lastName? }`)

## Comptes de test

Après `npm run seed`, utilisez ces comptes (mot de passe : **password123**) :

| Email | Rôle |
|-------|------|
| lyissa1928@gmail.com | Super Admin (passer123) |
| admin@test.com | Admin |
| scolarite@test.com | Scolarité |
| service_pedagogique@test.com | Service pédagogique |
| dept_head@test.com | Chef de département |
| teacher@test.com | Enseignant |
| student@test.com | Étudiant |
| caissier@test.com, chef_comptable@test.com, daf@test.com | Comptabilité |
| auditor@test.com | Auditeur |

## Tests

```bash
cd backend && npm test           # Tests unitaires
cd backend && npm run test:e2e   # Tests e2e
```

## Production

En production, définir **JWT_SECRET** dans `backend/.env` (min. 32 caractères). Sans cela, le backend refusera de démarrer. Voir `backend/.env.example`.

## Déploiement

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet (Apache2, PM2, PostgreSQL, SSL).
