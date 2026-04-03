# Mise à jour sur le serveur de test (staging)

Objectif : déployer la dernière version synchronisée avec GitHub sans casser les données ni les secrets.

## Avant la mise à jour

1. **Sauvegarde** de la base locale (LowDB) sur le serveur de test :
   ```bash
   cp /chemin/vers/uniportail/backend/database/preinscription.json \
      /chemin/vers/backups/preinscription-$(date +%Y%m%d-%H%M).json
   ```
2. Noter les variables actuelles dans `backend/.env` et `frontend/.env` (ou build) — **ne pas** les committer dans Git.

### reCAPTCHA Enterprise (production)

Dans `backend/.env` : `RECAPTCHA_ENTERPRISE_PROJECT_ID`, `RECAPTCHA_ENTERPRISE_API_KEY`, `RECAPTCHA_ENTERPRISE_SITE_KEY` (voir `backend/.env.example`). La clé API doit avoir l’API **reCAPTCHA Enterprise** activée dans Google Cloud. La **clé site** doit être la même que `VITE_RECAPTCHA_SITE_KEY` utilisée au `npm run build`. Vous pouvez laisser vide `RECAPTCHA_SECRET_KEY` si tout passe par Enterprise.

## Déploiement (depuis le dépôt cloné sur le serveur)

```bash
cd /chemin/vers/uniportail   # adapter : ex. home/.../uniportail
git fetch origin
git status
git pull origin main
```

Installer les dépendances si `package.json` a changé :

```bash
npm run install:all
```

Construire le frontend :

```bash
npm run build
```

Redémarrer l’API Node (PM2) :

```bash
cd backend
pm2 restart uniportail-api   # ou le nom défini chez vous
pm2 save
```

Recharger nginx si la config a changé :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Vérifications post-déploiement

- `curl -sI https://VOTRE-DOMAINE-TEST/` — HTTP 200
- `curl -s https://VOTRE-DOMAINE-TEST/api/health` — JSON `status: OK`
- Page d’accueil + connexion + préinscription (parcours rapide)

## Fichiers à ne jamais écraser depuis Git sur la prod/test

- `backend/.env` (secrets, JWT, CORS, clés reCAPTCHA)
- `frontend/.env` en local ; en prod le build est fait **avec** `VITE_*` au moment du `npm run build` (ou variables d’environnement CI injectées au build)

## Rollback rapide

```bash
cd /chemin/vers/uniportail
git checkout main
git reset --hard COMMIT_PRECEDENT   # le hash noté avant pull
npm run build
pm2 restart uniportail-api
```

Restaurer `preinscription.json` depuis la sauvegarde si nécessaire.
