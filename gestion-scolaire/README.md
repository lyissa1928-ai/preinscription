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

## Développement local (checklist)

À faire sur votre machine **avant** de pousser sur Git ou de déployer :

1. **Variables** : `cp .env.example .env` et `cp backend/.env.example backend/.env` (adapter `JWT_SECRET` en local si besoin).
2. **Dépendances** : à la racine `gestion-scolaire`, `npm install` puis `cd backend && npm install` et `cd ../frontend && npm install` (ou équivalent monorepo).
3. **Base** : `npm run migrate` puis optionnel `npm run seed` pour les comptes de test.
4. **Lancer** : `npm run dev` → API [http://localhost:3000](http://localhost:3000), front [http://localhost:3001](http://localhost:3001).
5. **Vérifier** : `GET http://localhost:3000/health`, connexion Swagger `http://localhost:3000/api/docs`, parcours critique (login + une page métier).

En cas d’erreur Prisma : `cd backend && npx prisma generate` puis relancer les migrations.

## GitHub (remote et migration du dépôt)

**Nouveau dépôt**

```bash
cd gestion-scolaire
git init
git add .
git commit -m "Initial import"
git branch -M main
git remote add origin https://github.com/VOTRE_ORG/VOTRE_REPO.git
git push -u origin main
```

**Dépôt déjà cloné ailleurs** : ajouter le remote `origin` pointant vers la bonne URL GitHub, puis `git fetch origin` et `git pull origin main` (ou fusionner selon votre stratégie). Évitez de committer `.env`, `backend/.env`, fichiers SQLite de dev si vous ne voulez pas les versionner (voir `.gitignore`).

## Mise à jour sur le serveur (après migration GitHub)

Ordre conseillé sur la machine de production (adapter les chemins utilisateur) :

```bash
cd /chemin/vers/gestion-scolaire
git pull origin main
npm install
cd backend && npm install && npx prisma migrate deploy && cd ../frontend && npm install && cd ..
npm run build
# Redémarrer le process Node (ex. PM2) et recharger le front si servi séparément
```

Pour le détail (Apache, PM2, PostgreSQL, SSL), voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Rôle « Service pédagogique » (directeur)

- Droits **fédérateurs** : vue sur l’ensemble des campus / établissements (RBAC).
- À la **création** d’un compte directeur, le backend rattache ce profil comme **responsable pédagogique** sur les campus qui n’avaient pas encore de responsable (les campus déjà pourvus conservent leur responsable).

## Production

En production, définir **JWT_SECRET** dans `backend/.env` (min. 32 caractères). Sans cela, le backend refusera de démarrer. Voir `backend/.env.example`.

## Déploiement

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet (Apache2, PM2, PostgreSQL, SSL).
