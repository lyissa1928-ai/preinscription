# Base de données locale (lowdb)

Le backend utilise un fichier JSON unique : **`preinscription.json`**.

## Données versionnées sur GitHub

Ce fichier **est inclus dans le dépôt** à des fins de **démonstration et de prise en main** : après un `git clone`, vous disposez déjà d’un jeu cohérent incluant notamment :

- **Établissements** (`etablissements`)
- **Filières** (`filieres`)
- **Formations** (`formations`)
- Utilisateurs de test, dossiers, etc. selon l’état du fichier au dernier commit

Les mots de passe sont stockés **hachés** (bcrypt), jamais en clair.

## Fichiers non versionnés (local uniquement)

- `backups/` — sauvegardes automatiques au démarrage du serveur (voir `.gitignore` à la racine du projet)
- Ne pas committer de dumps personnels contenant des données réelles de production sans accord

## Restaurer / réinitialiser la démo depuis le dépôt

Si votre copie locale a été vidée ou corrompue :

```bash
git checkout main -- backend/database/preinscription.json
```

Ou récupérez la version d’un commit précis depuis l’historique GitHub (fichier `backend/database/preinscription.json`).

## Évolution

En enrichissant le catalogue (nouvelles filières, formations), **commitez** `preinscription.json` si vous souhaitez partager ce jeu de données avec l’équipe sur GitHub.
