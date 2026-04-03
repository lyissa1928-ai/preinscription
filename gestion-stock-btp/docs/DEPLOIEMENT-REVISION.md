# Révision déploiement — Gestion Stock BTP (ESEBAT)

Document de synthèse des changements majeurs effectués pour sécuriser le déploiement et éviter les erreurs en production.

---

## 1. Ordre des migrations (corrections appliquées)

Laravel exécute les migrations par **ordre du nom de fichier**. Plusieurs migrations modifiaient ou créaient des tables avant que les tables référencées n’existent, ce qui provoquait des erreurs au premier `migrate` ou `migrate:fresh`.

### Modifications effectuées

| Problème | Correction |
|----------|------------|
| `create_users_table` (11 mars) alors que `material_requests`, `budgets`, etc. (10 mars) référencent `users` | **create_users_table** déplacé en **2026_03_10_140050** (juste après campuses, avant material_requests). |
| `add_matricule_to_users_table` (7 mars) avant `create_users_table` | Migration déplacée en **2026_03_13_100001** (après création de `users` et de `last_name`). |
| `create_material_request_participants_table` (7 mars) avant `material_requests` et `users` | Migration déplacée en **2026_03_11_150201**. |
| `add_request_type_and_requested_by_to_material_requests` (7 mars) avant `material_requests` / `request_items` | Migration déplacée en **2026_03_11_150202**. |
| `create_user_stock_movements_table` (7 mars) avant `users` et `items` | Migration déplacée en **2026_03_11_150203**. |

### Ordre logique garanti

1. **2026_03_10_140000** – campuses  
2. **2026_03_10_140050** – **users** (création avant toute table qui en dépend)  
3. Puis warehouses, departments, categories, suppliers, items, material_requests, request_items, etc.  
4. Puis tables et colonnes qui dépendent de `users` (participants, request_type, user_stock_movements, add_matricule, etc.).

---

## 2. Bootstrap / cache avant Composer

**Erreur possible :**  
`PackageManifest.php line 179: The .../bootstrap/cache directory must be present and writable`

**Cause :**  
`composer install` déclenche `php artisan package:discover`, qui a besoin d’un répertoire `bootstrap/cache` existant et inscriptible.

**Action à faire avant `composer install` :**
```bash
mkdir -p bootstrap/cache
chmod -R 775 bootstrap/cache
```

Cette étape est documentée dans **install-stock.txt** (section 5).

---

## 3. Première installation : utiliser `migrate:fresh`

- **Première déploiement** (base vide) :  
  `php artisan migrate:fresh --force`  
  pour appliquer toutes les migrations dans le bon ordre sans reste d’un ancien état.

- **Mise à jour** (base déjà en production) :  
  `php artisan migrate --force`  
  pour n’exécuter que les nouvelles migrations.

---

## 4. Documentation mise à jour

- **install-stock.txt** (à la racine du projet) :
  - Création de `bootstrap/cache` avant Composer.
  - Deux cas d’accès (IP avec port / nom de domaine sans port).
  - Première install = `migrate:fresh`, puis `migrate` pour les mises à jour.
  - **Checklist déploiement** (section 12) à suivre dans l’ordre.
  - **Changements majeurs** (section 13) et **Problèmes fréquents** (section 11) à jour.

- **docs/DEPLOIEMENT-REVISION.md** (ce fichier) : synthèse des corrections pour le déploiement.

---

## 5. Checklist rapide avant mise en production

1. Récupérer la dernière version du dépôt (`git pull`).
2. Créer et rendre inscriptible `bootstrap/cache` avant `composer install`.
3. Configurer `.env` (APP_ENV=production, APP_DEBUG=false, APP_URL, DB_*).
4. Première install : `migrate:fresh --force` ; ensuite : `migrate --force`.
5. Exécuter `storage:link`, caches (config, route, view), puis droits (www-data, storage, bootstrap/cache).
6. Suivre la section 12 de **install-stock.txt** pour le détail complet.

---

*Dernière révision : mars 2026 — Projet ESEBAT / gestion-stock-btp*
