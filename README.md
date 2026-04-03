# Préinscription universitaire

Application **Express** (API) + **React / Vite** (interface) pour la préinscription multi-établissements.

## Présentation

Cette application sert à **digitaliser le parcours de préinscription** pour un ou plusieurs établissements (écoles, centres de formation, instituts). Les candidats consultent les filières et formations proposées, déposent un **dossier en ligne** (pièces justificatives) et suivent l’avancement de leur inscription. Côté administration, les **responsables** et l’**équipe** gèrent les dossiers, les validations, la facturation liée aux préinscriptions et les comptes utilisateurs, le tout depuis une interface web sécurisée (authentification par rôles). L’objectif est de **réduire le papier**, d’**uniformiser les procédures** entre sites et d’offrir un **point d’accès unique** (ex. portail type *UniPortail*) pour les futurs étudiants et le personnel.

## Prérequis

- Node.js 18+
- npm

## Installation

À la racine du dossier `preinscription-univ` :

```bash
npm run install:all
```

Ou manuellement :

```bash
npm install
cd backend && npm install && cd ../frontend && npm install
```

## Configuration

- **Backend** : copier `backend/.env.example` vers `backend/.env` et renseigner les variables (JWT, captcha, etc.).
- **Frontend** : copier `frontend/.env.example` vers `frontend/.env` si besoin (`VITE_*`).

## Démarrage (développement)

Toujours depuis la racine `preinscription-univ` :

```bash
npm run dev
```

- API : http://localhost:5000  
- Front : http://127.0.0.1:5173 (proxy `/api` → backend)

## Build production (frontend)

```bash
npm run build
```

## Structure

- `backend/` — API Node.js (lowdb, JWT, multer, etc.)
- `frontend/` — SPA React + Vite + Tailwind

## Données de démonstration (GitHub)

Le fichier **`backend/database/preinscription.json`** est **versionné dans le dépôt** : il contient un exemple de catalogue (**établissements**, **filières**, **formations**, comptes de test, etc.) pour que tout développeur qui clone le projet ait une base utilisable immédiatement.

Les sauvegardes automatiques (`backend/database/backups/`) restent **hors Git** (voir `.gitignore`). Détail : [backend/database/README.md](backend/database/README.md).

## Licence

Projet interne / usage selon politique de l’établissement.
