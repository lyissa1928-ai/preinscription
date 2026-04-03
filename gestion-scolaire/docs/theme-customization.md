# Identité & apparence de la plateforme

## Accès

- **Route** : `/dashboard/admin/settings/appearance`
- **Rôles** : **ADMIN** et **SUPER_ADMIN** (upload, modification, enregistrement).

## Contenu configurable

1. **Nom de l’établissement / plateforme** (`appName`)  
   Connexion, barre supérieure, sidebar (titre accessibilité), **titre de l’onglet** du navigateur, fiche d’inscription PDF (prioritaire sur `ESTABLISHMENT_NAME`).

2. **Logos** (fichiers → `uploads/appearance/` côté API)  
   - Logo **navbar**  
   - Logo **page de connexion**

3. **Favicon** (fichier, idem)  
   Appliqué dynamiquement dans le `<head>` avec paramètre de cache pour forcer le rechargement.

4. **Couleurs** (variables CSS sur `document.documentElement`)

Les **images** sont **enregistrées en base dès l’upload** (plus besoin d’attendre pour les médias). Le bouton **« Enregistrer nom & couleurs »** sert au **nom** et aux **couleurs**.

## Technique (pourquoi ça fonctionne)

- **API** : `GET /appearance/settings` (public, sans JWT) — le `ThemeProvider` l’appelle au chargement.
- **Images `/uploads/...`** : le front utilise une URL **relative** `/uploads/...`. Next.js réécrit cette route vers le backend (`next.config` → `rewrites`), donc **même origine** que l’app (pas de dépendance fragile à `NEXT_PUBLIC_API_URL` pour afficher les images).
- **Option** : `NEXT_PUBLIC_THEME_IMAGES_VIA_API=true` pour forcer les URLs `https://api.../uploads/...` (cas particulier).

## Déploiement

- Vérifier que **les rewrites** Next pointent vers la bonne URL d’API (variable d’environnement au build / runtime).
- Le dossier `uploads` du backend doit être **persistant** (volume Docker, etc.) pour ne pas perdre les fichiers.

## Fichiers par défaut (sans base)

Placer dans `frontend/public/` : `logo.png`, `logo-login.png`, `favicon.ico`.
