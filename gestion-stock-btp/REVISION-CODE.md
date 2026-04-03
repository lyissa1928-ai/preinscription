# Révision globale du code – Gestion stock BTP (ESEBAT)

**Date :** Mars 2025  
**Périmètre :** Application Laravel `gestion-stock-btp` (demandes de matériel, stock, référentiel, budgets, stock personnel).

---

## 1. Corrections appliquées pendant la révision

### 1.1 `PersonalStockController::storeDistribution`
- **Problème :** La recherche du stock restant utilisait `firstWhere('item_id', $itemId)`. Pour les articles sans `item_id` (désignation libre), plusieurs lignes peuvent avoir `item_id` null, ce qui renvoyait la première au lieu de la bonne.
- **Correction :** Recherche par `(item_id, designation)` : si `item_id` est renseigné, on matche par `item_id` seul ; sinon on matche par `item_id` null et `designation` égale. Ainsi, les utilisations sont bien déduites du bon article (catalogue ou désignation libre).

### 1.2 `MaterialRequestController::generateRequestNumber`
- **Problème :** Utilisation de `MaterialRequest::max(DB::raw("CAST(SUBSTR(request_number, -5) AS INTEGER)"))` sur toutes les demandes. Risques : (1) syntaxe SQL dépendante du SGBD (SUBSTR -5) ; (2) le numéro de séquence dépassait le mois (ex. 99999 puis 100000).
- **Correction :** Numéro limité au mois courant : filtre `WHERE request_number LIKE 'REQ-YYYYMM-%'`, récupération du dernier numéro, extraction du suffixe numérique et incrément. Code portable (pas de SUBSTR/CAST spécifique) et séquence correcte par mois.

---

## 2. Points vérifiés et conformes

### 2.1 Autorisations et politiques
- **MaterialRequestPolicy :** `view`, `update`, `delete`, `submit`, `approve`, `reject`, `treat`, `storeStorage` cohérents avec les rôles (staff, point_focal, director, super_admin).
- **Stock / Référentiel :** `StockReferentielController` restreint « Mon stock » au staff et affiche toutes les cartes pour point_focal/director/super_admin.
- **Réception :** `PersonalStockController::recordReceiptForm` et `storeReceipt` réservés au point focal / directeur.
- **Finance :** Menu Finances : point focal ne voit que « Budgets » ; director/super_admin voient en plus Tableau de bord budgétaire et Allocations.

### 2.2 Données et modèles
- **RequestItem :** `quantity_available`, `quantity_used`, `quantity_received` utilisés correctement ; relation `item.category` chargée pour le formulaire Stocker.
- **UserStockMovement :** Clé de synthèse `(item_id, designation)` cohérente entre reçus et distribués ; `remainingByUserItem` correct.
- **Item :** `image_path` géré ; upload dans `DesignationController` (store/update) avec suppression de l’ancienne image en édition.

### 2.3 Formulaires et validation
- **storeStorage :** Validation dynamique par `request_item_id` ; contrainte quantité reçue = disponible + utilisée ; mouvements TYPE_RECEIVED et mise à jour des `request_items` et du stock global.
- **storeDistribution :** Validation `item_id` nullable, `designation` nullable, `quantity` min 1 ; vérification du stock restant avant création du mouvement.
- **Designation (création/édition) :** Validation `image` (image|mimes|max:2048) ; `image_path` optionnel (texte URL) ; `enctype="multipart/form-data"` sur les vues.

### 2.4 Vues
- **Stocker (store-storage) :** Colonnes Catégorie, Matériel, quantités ; pas de prix (conforme au besoin staff).
- **Mon stock (personal-stock/index) :** Tableau avec colonne « Enregistrer une utilisation » (quantité + bouton) ; pas d’affichage de prix.
- **Catalogue (referentiel) :** Onglet catalogue sans quantité ni prix ; colonnes Image, Nom du matériel, Catégorie, Statut.
- **Référentiel :** Paramètres de filtre cohérents (`search`, `category`).

### 2.5 Sécurité
- CSRF : formulaires avec `@csrf`.
- Autorisation : `$this->authorize()` ou vérification de rôle là où c’est pertinent.
- Validation des entrées : règles Laravel sur les contrôleurs concernés.
- Pas d’affichage de prix pour le staff (pages accessibles au staff sans prix).

---

## 3. Recommandations et points d’attention

### 3.1 Base de données
- **generateRequestNumber :** Le nouveau code évite le raw SQL dépendant du SGBD. Si vous utilisez PostgreSQL, les requêtes utilisées (LIKE, orderByDesc, value) sont compatibles.
- **User.php :** Présence de `orderByRaw('CAST(SUBSTRING(matricule, 4) AS UNSIGNED)')` — spécifique MySQL. À adapter si passage en PostgreSQL (ex. `SUBSTRING(matricule FROM 4)` et cast en entier).

### 3.2 Stock / stockage
- **storeStorage :** Lors d’un ré-enregistrement, les anciens mouvements liés à la demande sont supprimés puis recréés. Cohérent avec la règle métier.
- **Stock global (Item.stock_quantity) :** Décrémenté de l’ancien `quantity_available` puis incrémenté du nouveau dans `storeStorage`. À garder en tête si d’autres flux modifient le même stock.

### 3.3 Vues et UX
- **designations/create.blade.php :** Une ligne de texte d’aide en double (« Optionnel. URL ou chemin vers l’image… ») est encore présente à cause d’un caractère typographique. Suppression manuelle possible pour alléger le formulaire.
- **Lien de stock :** Exécuter `php artisan storage:link` si ce n’est pas fait, pour que les images uploadées (désignations) soient accessibles via `/storage/items/...`.

### 3.4 Évolutions possibles
- **RequestItem :** Le champ `getDisplayLabelAttribute()` renvoie `__('Non renseigné')` quand il n’y a ni designation ni item ; à confirmer selon la politique de traduction.
- **Notifications :** Les messages (AppNotification, etc.) utilisent `request_number` ; cohérent avec le nouveau format REQ-YYYYMM-XXXXX.
- **Tests :** Ajouter ou compléter des tests unitaires / feature sur `generateRequestNumber`, `storeDistribution` (cas item_id null + designation), et `storeStorage` (contrainte reçu = disponible + utilisé).

---

## 4. Résumé

| Zone              | État        | Commentaire |
|-------------------|------------|-------------|
| Contrôleurs       | Corrigé / OK | 2 corrections (storeDistribution, generateRequestNumber). |
| Modèles / Policies| OK         | Cohérents avec les rôles et le métier. |
| Vues (Stocker, Mon stock, Catalogue) | OK | Conformes aux spécifications (pas de prix staff, catégorie, utilisation). |
| Validation / Sécu | OK         | CSRF, autorisation, validation présents. |
| Référentiel / Designations | OK | Catalogue sans qté/prix ; image upload + URL. |

La révision a permis de corriger deux bugs (matching stock personnel, numéro de demande par mois) et de vérifier la cohérence du code avec les règles métier et la sécurité. Le projet est en bon état pour la suite des développements.
