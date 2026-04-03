# Ajouter l’application sur GitHub

## Cas 1 : Tout est déjà dans le dépôt « projet IA »

Votre dépôt Git est dans le dossier **projet IA** (parent) et le remote existe déjà :

- **Remote actuel :** `https://github.com/lyissa1928-ai/projet-IA.git`

Pour envoyer vos derniers changements (y compris `gestion-stock-btp`) sur GitHub :

```powershell
cd "C:\Users\lyiss\Desktop\projet IA"
git add .
git status
git commit -m "Ajout / mise à jour application gestion-stock-btp"
git push -u origin main
```

Un `.gitignore` a été ajouté dans `gestion-stock-btp` pour ne pas pousser `vendor/`, `.env`, `node_modules/`, etc.

---

## Cas 2 : Créer un dépôt GitHub dédié à « gestion-stock-btp »

Si vous voulez un dépôt GitHub **uniquement** pour cette application Laravel :

### 1. Créer le dépôt sur GitHub

1. Allez sur [https://github.com/new](https://github.com/new).
2. Nom du dépôt : par ex. `gestion-stock-btp` ou `esebat-stock`.
3. Ne cochez pas « Add a README » (le projet existe déjà en local).
4. Cliquez sur **Create repository**.

### 2. Initialiser Git dans le dossier de l’app (si besoin)

Si ce dossier n’est pas encore un dépôt Git :

```powershell
cd "C:\Users\lyiss\Desktop\projet IA\gestion-stock-btp"
git init
```

### 3. Lier au dépôt GitHub et pousser

Remplacez `VOTRE_UTILISATEUR` et `NOM_DU_REPO` par vos valeurs (ex. `lyissa1928-ai` et `gestion-stock-btp`) :

```powershell
cd "C:\Users\lyiss\Desktop\projet IA\gestion-stock-btp"
git remote add origin https://github.com/VOTRE_UTILISATEUR/NOM_DU_REPO.git
git add .
git status
git commit -m "Premier envoi : application ESEBAT gestion stock BTP"
git branch -M main
git push -u origin main
```

### 4. Fichiers exclus du dépôt

Grâce au `.gitignore` dans `gestion-stock-btp`, ne seront **pas** envoyés sur GitHub :

- `/vendor/` (dépendances Composer)
- `.env` (mots de passe, clés)
- `node_modules/`
- Fichiers de cache et logs

Après un clone, il faudra :

- `composer install`
- `cp .env.example .env` puis configurer `.env`
- `php artisan key:generate`
- `npm install` si vous utilisez le frontend compilé
