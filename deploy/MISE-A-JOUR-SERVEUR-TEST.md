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

Dans `backend/.env` : `RECAPTCHA_ENTERPRISE_PROJECT_ID`, `RECAPTCHA_ENTERPRISE_API_KEY`, `RECAPTCHA_ENTERPRISE_SITE_KEY` (voir `backend/.env.example`). La clé API doit avoir l'API **reCAPTCHA Enterprise** activée dans Google Cloud. La **clé site** doit être la même que `VITE_RECAPTCHA_SITE_KEY` utilisée au `npm run build`. Vous pouvez laisser vide `RECAPTCHA_SECRET_KEY` si tout passe par Enterprise.

## Déploiement (depuis le dépôt cloné sur le serveur)

**Recommandé en production** — script qui sauvegarde, protège la base, pull, build et redémarre :

```bash
cd /var/www/uniportail
bash deploy/proteger-donnees-prod.sh    # une seule fois
bash deploy/mise-a-jour-prod.sh         # à chaque mise à jour
```

Le script compare le nombre d'utilisateurs, factures, dossiers avant/après le `git pull`. Si la base a été écrasée par le dépôt Git, elle est **restaurée automatiquement** depuis la sauvegarde.

### Déploiement manuel (alternative)

```bash
cd /chemin/vers/uniportail   # adapter : ex. /var/www/uniportail
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

Redémarrer l'API Node (PM2) :

```bash
cd backend
pm2 restart uniportail-api   # ou le nom défini chez vous
pm2 save
```

Recharger nginx si la config a changé :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Migrations de schéma (LowDB)

Au **premier redémarrage** après mise à jour, l’API exécute automatiquement les migrations (`backend/utils/schemaMigrations.js`) :

- backup `preinscription-pre-migration-*.json` dans `UNIPORTAIL_BACKUP_DIR` (défaut `/var/backups/uniportail`)
- champs formations : `frais_bibliotheque`, `frais_epi`, `duree_mois`, recalcul des prix
- journal dans `_migrations` et version `_schemaVersion`

Vérifier après déploiement :

```bash
node -e "const d=require('./backend/database/preinscription.json'); console.log(d._schemaVersion, d._migrations?.slice(-2))"
pm2 logs uniportail-api --lines 30 | grep -i migr
```

## Vérifications post-déploiement

- `curl -sI https://VOTRE-DOMAINE-TEST/` — HTTP 200
- `curl -s https://VOTRE-DOMAINE-TEST/api/health` — JSON `status: OK`
- Admin établissement → Formations : import Excel, grille, modification par lot
- Page d'accueil + connexion + préinscription (parcours rapide)

## Fichiers à ne jamais écraser depuis Git sur la prod/test

- `backend/database/preinscription.json` — **utilisateurs, factures, dossiers** (versionné pour la démo dev, mais **données réelles en prod**)
- `backend/uploads/` — pièces jointes (hors Git)
- `backend/.env` (secrets, JWT, CORS, clés reCAPTCHA)
- `frontend/.env.production` — variables `VITE_*` au build
- `frontend/public/config-site.js` — URL API en prod si modifiée sans rebuild

**Une fois sur le serveur** : `bash deploy/proteger-donnees-prod.sh` marque ces fichiers en `skip-worktree` pour que `git pull` ne les remplace plus.

**À chaque mise à jour** : `bash deploy/mise-a-jour-prod.sh` (sauvegarde + vérif compteurs + build + PM2).

**URL production ESEBAT** : `https://esebat-digitalservices.com/connexion` — UniPortail à la **racine** du domaine.

Bascule initiale (une fois) : `bash deploy/configurer-racine-esebat.sh` — voir `deploy/prod-esebat-uniportail-seul.txt`.

Les anciennes URLs `/uniportail/...` redirigent vers `/...`.

## Rollback rapide

```bash
cd /chemin/vers/uniportail
git checkout main
git reset --hard COMMIT_PRECEDENT   # le hash noté avant pull
npm run build
pm2 restart uniportail-api
```

Restaurer `preinscription.json` depuis la sauvegarde si nécessaire.
