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

## Migrations de schéma (continuité sans perte)

Au démarrage du serveur, `utils/schemaMigrations.js` applique les migrations manquantes :

1. Lecture de `_schemaVersion` dans `preinscription.json`
2. **Backup** automatique (`pre-migrate-vX-to-vY-…`) avant toute migration
3. Exécution idempotente des versions `v1`, `v2`, … jusqu’à la version cible
4. Journal dans `_migrations` (id, date, résumé)

| Version | Contenu |
|--------|---------|
| v1 | Formations : `frais_bibliotheque`, `frais_epi`, `duree_mois` (dérivé du texte si besoin), forfait `prix` recalculé, `frais_supplementaires` normalisés — **aucune suppression** |
| v2 | `nombre_photos_preinscription`, `actif` par défaut |

Les champs historiques (`ville`, `places`, `autres_frais`, etc.) sont **conservés**. Pour ajouter une migration : créer une entrée dans `MIGRATIONS` avec `version` incrémentée et une fonction `up(db)` additive uniquement.

## Sauvegarde et restauration par rôle

| Rôle | Export | Restauration | Contenu principal |
|------|--------|--------------|-------------------|
| **Admin plateforme** | `GET /api/admin/backup/export` (page Maintenance / Profil) | Manuelle sur serveur (remplacer `preinscription.json` après backup) | Base complète |
| **Admin établissement** | `GET /api/etablissements/:id/donnees/export` (page Équipe) | `POST …/donnees/restore` — fusion par identifiant, backup auto avant | Fiche étab., filières, formations, conditions, staff (sans MDP), dossiers, factures |
| **Étudiant** | `GET /api/auth/mes-donnees/export` (Mon profil) | Profil uniquement (nom, contact) | Dossiers, documents (métadonnées), factures |
| **Staff** (resp., agent, etc.) | `GET /api/auth/mes-donnees/export` | Profil uniquement | Identité du compte |

**Non exporté** : mots de passe, tokens, fichiers uploadés (PDF/images — copie séparée du dossier `uploads/` en production).

**Mises à jour sans perte** : au démarrage, `schemaMigrations.js` + backup `pre-migrate-*` ; au déploiement prod, `deploy/redeploy-prod-complet.sh` crée aussi une sauvegarde. Le fichier prod `preinscription.json` est protégé (`skip-worktree`) pour ne pas être écrasé par un `git pull`.
