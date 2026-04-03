# Analyse réelle du code – Gestion du stock (matériels reçus et utilisation)

Document généré par inspection directe du code. Aucune logique inventée.

---

## 1. Structure actuelle du stockage

Le projet gère **deux niveaux de stock** distincts :

| Niveau | Représentation | Rôle |
|--------|----------------|------|
| **Stock central (référentiel)** | Table `items`, champ `stock_quantity` | Stock au niveau « point focal / entrepôt » ; utilisé pour les alertes rupture, le catalogue, et la cohérence avec les demandes. |
| **Stock local staff** | Table `user_stock_movements` (mouvements uniquement, pas de champ « stock actuel ») | Stock détenu par chaque utilisateur (staff) : reçus (livraisons) et sorties (distributions). Le « stock restant » est **calculé** : SUM(reçu) − SUM(distribué) par (user_id, item_id/designation). |

Les quantités « reçues / disponibles / utilisées » au niveau d’une **demande** sont stockées dans `request_items` (champs `quantity_received`, `quantity_available`, `quantity_used`).

---

## 2. Tables utilisées pour le stock

### 2.1 Table `items`

- **Fichier migration** : `database/migrations/2026_03_10_140500_create_items_table.php`
- **Champ quantité** : `stock_quantity` (integer, default 0) — stock central.
- **Autres champs pertinents** : `category_id`, `name`, `code`, `unit`, `unit_cost`, `reorder_threshold`, `reorder_quantity`, `description`, `is_active`, `deleted_at` (soft deletes).

### 2.2 Table `user_stock_movements`

- **Fichier migration** : `database/migrations/2026_03_07_150000_create_user_stock_movements_table.php`  
- **Migration complémentaire** : `2026_03_20_100000_add_recipient_to_user_stock_movements.php` (champ `recipient`).
- **Colonnes** :
  - `user_id` (utilisateur concerné),
  - `item_id` (nullable, article catalogue),
  - `designation` (nullable, désignation libre si pas d’item),
  - `quantity` (integer, toujours positif),
  - `type` : `'received'` (reçu/livré) ou `'distributed'` (sortie),
  - `reference_type` / `reference_id` (ex. MaterialRequest pour traçabilité),
  - `distributed_to_user_id` (nullable),
  - `recipient` (string 500, destinataire réel de la sortie),
  - `notes`, `timestamps`.
- **Pas de champ « stock actuel »** : le stock staff est dérivé des mouvements.

### 2.3 Table `request_items`

- **Migrations** :  
  - `2026_03_10_140800_create_request_items_table.php` (lignes de demande),  
  - `2026_03_18_100000_add_quantity_available_used_to_request_items.php`,  
  - `2026_03_15_100001_add_designation_to_request_items.php`,  
  - `2026_03_15_100002_make_request_items_item_id_nullable.php`,  
  - `2026_03_16_100000_add_is_unlisted_material_to_request_items.php`.
- **Champs liés au stock / réception** :
  - `quantity_received` (défaut 0),
  - `quantity_available` (quantité stockée / disponible après réception),
  - `quantity_used` (quantité déjà utilisée),
  - `item_id` (nullable pour désignation libre),
  - `designation`, `is_unlisted_material`, `requested_quantity`, `status`, etc.

### 2.4 Table `material_requests`

- **Migration** : `2026_03_10_140700_create_material_requests_table.php` (et évolutions).
- Pas de champ de quantité ; les quantités sont dans `request_items`. Statuts utilisés pour le flux : `draft`, `submitted`, `approved`, `delivered`, `received`, etc.

---

## 3. Modèles concernés

| Modèle | Fichier | Rôle |
|--------|---------|------|
| **Item** | `app/Models/Item.php` | Stock central : `stock_quantity`, `getAvailableStock()` (stock − quantités en attente sur demandes), `isLowStock()`, accesseurs `unit_of_measure`, `unit_price`. |
| **UserStockMovement** | `app/Models/UserStockMovement.php` | Mouvements de stock staff : `TYPE_RECEIVED`, `TYPE_DISTRIBUTED` ; méthode statique `remainingByUserItem($userId)` qui calcule par (item_id, designation) : quantity_received, quantity_distributed, quantity_remaining (SUM(reçu) − SUM(distribué)). |
| **RequestItem** | `app/Models/RequestItem.php` | Ligne de demande : `quantity_received`, `quantity_available`, `quantity_used`, `getDisplayLabelAttribute()`, `item_id` nullable, `designation`. |
| **MaterialRequest** | `app/Models/MaterialRequest.php` | En-tête de demande ; relations `requestItems`, `requester`, `campus`, etc. |

---

## 4. Flux de gestion du stock (demande → réception → stockage → utilisation)

### 4.1 Demande de matériel (staff)

- **Création** : `MaterialRequestController::create` / `store`.  
- **Données** : `material_requests` + `request_items` (requested_quantity, item_id ou designation).  
- **Pas encore de mouvement de stock** à ce stade.

### 4.2 Validation de la demande (point focal)

- **Service** : `App\Services\RequestApprovalService::approveRequest()` (appelé depuis `MaterialRequestController::approve`).
- **Code concerné** (lignes 216–234) : dans une transaction, après `$request->approve($approverUser)` :
  - Pour chaque `RequestItem` avec `item_id` et `requested_quantity > 0` :
    - `Item::where('id', $requestItem->item_id)->decrement('stock_quantity', $requestItem->requested_quantity)`.
- **Effet** : le **stock central** (`items.stock_quantity`) est **décrémenté** de la quantité demandée à la validation.

### 4.3 Livraison (point focal)

- **Contrôleur** : `MaterialRequestController::setDelivered()` (bouton « Clôturer / Livrée »).
- **Code** : `$materialRequest->setDelivered()` — changement de statut uniquement (pas de modification de `items` ni de `user_stock_movements`).
- **Effet** : la demande passe en statut livré ; **aucune écriture de quantité** à ce moment.

### 4.4 Enregistrement du stockage (staff ou lecture point focal)

- **Contrôleur** : `MaterialRequestController::storeStorageForm` (GET) et `storeStorage` (POST).
- **Vue** : `resources/views/material-requests/store-storage.blade.php` (formulaire par ligne : quantity_received, quantity_available, quantity_used ; contrainte reçu = disponible + utilisée).
- **Méthode principale** : `MaterialRequestController::storeStorage()` (lignes 500–568).

**Traitement dans `storeStorage()` :**

1. **Autorisation** : `authorize('storeStorage', $materialRequest)` — seul le **demandeur** peut enregistrer (policy : `MaterialRequestPolicy::storeStorage`).
2. **Validation** : pour chaque `request_item`, champs `quantity_received`, `quantity_available`, `quantity_used` (entiers 0–99999) ; contrôle en PHP : `received === available + used` pour chaque ligne.
3. **Suppression des anciens mouvements** liés à la demande :  
   `UserStockMovement::where('reference_type', MaterialRequest::class)->where('reference_id', $materialRequest->id)->delete()`.
4. Pour chaque `RequestItem` :
   - Mise à jour de la ligne : `quantity_received`, `quantity_available`, `quantity_used`.
   - **Stock central** (uniquement si `item_id` présent) :
     - `Item::where('id', $requestItem->item_id)->decrement('stock_quantity', $oldAvailable)` ;
     - `Item::where('id', $requestItem->item_id)->increment('stock_quantity', $available)`.
   - **Stock staff** : si `available > 0`, création d’un `UserStockMovement` :
     - `type` = `TYPE_RECEIVED`,
     - `user_id` = demandeur (`requester_user_id`),
     - `item_id`, `designation`, `quantity` = available,
     - `reference_type` = MaterialRequest::class, `reference_id` = id de la demande,
     - `notes` = « Livraison – … ».

**Résumé** : Les matériels « reçus » sont enregistrés dans **request_items** (quantités détaillées) et, pour la part « à stocker » (available), dans **user_stock_movements** (type reçu). Le stock central `items.stock_quantity` est ajusté par (− oldAvailable + available).

### 4.5 Sortie de matériel (staff, « Mon stock »)

- **Contrôleur** : `PersonalStockController::storeDistribution()`.
- **Routes** : POST `mon-stock/distribution` (nom de route : `personal-stock.store-distribution`).
- **Vue** : formulaire dans `resources/views/personal-stock/index.blade.php` (tableau synthèse + modal « Enregistrer une sortie »).

**Traitement dans `storeDistribution()` :**

1. **Validation** : `item_id` (nullable), `designation` (nullable), `quantity` (requis, 1–99999), **`recipient` (requis, max 500)**.
2. **Vérification de cohérence** :  
   - Synthèse par (item_id, designation) via `UserStockMovement::remainingByUserItem($user->id)`.  
   - Si `quantity` > `quantity_remaining` pour la ligne concernée → erreur de validation (pas de sortie supérieure au stock).
3. **Création** d’un enregistrement `UserStockMovement` :
   - `type` = `TYPE_DISTRIBUTED`,
   - `user_id` = utilisateur connecté,
   - `item_id`, `designation`, `quantity`, `recipient`, `notes`, `distributed_to_user_id` (optionnel).

**Décrémentation du stock** : il n’y a **pas** de champ « stock actuel » en base pour le staff. La décrémentation est **implicite** : le solde restant est recalculé par `remainingByUserItem()` (SUM(reçu) − SUM(distribué)). Donc une nouvelle ligne « distributed » réduit ce solde.

### 4.6 Réception directe (point focal, hors demande)

- **Contrôleur** : `PersonalStockController::recordReceiptForm` (GET) et `storeReceipt` (POST).
- **Vue** : `resources/views/personal-stock/record-receipt.blade.php`.
- **Effet** : mise à jour du **stock central** uniquement :
  - Si l’article n’existe pas dans la catégorie : création d’un `Item` puis `stock_quantity` = quantité.
  - Sinon : `Item::where('id', $item->id)->increment('stock_quantity', $quantity)`.
- **Aucun** enregistrement dans `user_stock_movements` ; ce flux ne alimente **pas** le stock staff.

---

## 5. Méthodes backend impliquées (résumé)

| Fichier | Méthode | Rôle |
|---------|---------|------|
| **RequestApprovalService** | `approveRequest()` | Décrémente `Item.stock_quantity` de chaque `requested_quantity` à la validation de la demande. |
| **MaterialRequestController** | `storeStorageForm()` | Affiche le formulaire de stockage (lecture seule pour point focal si policy `viewStorage` sans `storeStorage`). |
| **MaterialRequestController** | `storeStorage()` | Met à jour `request_items` (reçu/disponible/utilisé), ajuste `Item.stock_quantity` (oldAvailable/available), crée `UserStockMovement` TYPE_RECEIVED pour la part « disponible ». |
| **PersonalStockController** | `index()` | Synthèse stock staff via `UserStockMovement::remainingByUserItem()`, historique des mouvements avec solde après mouvement (calculé en PHP). |
| **PersonalStockController** | `storeDistribution()` | Vérifie stock restant (remainingByUserItem), crée `UserStockMovement` TYPE_DISTRIBUTED ; pas de mise à jour de `items.stock_quantity`. |
| **PersonalStockController** | `storeReceipt()` | Incrémente ou crée `Item.stock_quantity` (réception point focal hors demande). |
| **UserStockMovement** | `remainingByUserItem($userId)` | Calcule par (item_id, designation) : quantity_received, quantity_distributed, quantity_remaining (agrégation des mouvements). |

**StockService** (`app/Services/StockService.php`) : gère `Item` (low stock, available stock, updateStock, incrementStock, decrementStock) et les **actifs** (assets). Il **n’est pas utilisé** pour les mouvements staff (`user_stock_movements`) ni pour le flux demande → stockage → sortie.

---

## 6. Composants frontend (vues) impliqués

| Vue | Chemin | Rôle |
|-----|--------|------|
| **Mon stock** | `resources/views/personal-stock/index.blade.php` | Synthèse par article (reçu, sorti, restant), historique des mouvements avec « Solde après mouvement », formulaire et modal pour enregistrer une sortie (destinataire obligatoire). |
| **Stocker (demande)** | `resources/views/material-requests/store-storage.blade.php` | Formulaire par ligne : quantité reçue, à stocker, déjà utilisée ; mode édition (demandeur) ou lecture seule (point focal). |
| **Enregistrer une réception** | `resources/views/personal-stock/record-receipt.blade.php` | Formulaire point focal : catégorie, article, quantité reçue ; alimente uniquement `items.stock_quantity`. |
| **Fiche demande** | `resources/views/material-requests/show.blade.php` | Liens « Stocker » (demandeur) ou « Voir le stockage » (point focal) selon policy. |

Pas d’API dédiée au stock dans les routes inspectées ; tout passe par les contrôleurs web (Blade).

---

## 7. Incohérences et points d’attention

### 7.1 Sémantique du stock central dans `storeStorage`

- À la **validation** de la demande, `Item.stock_quantity` est **décrémenté** de `requested_quantity` (RequestApprovalService).
- Dans **storeStorage**, pour chaque ligne avec `item_id` :  
  `decrement(stock_quantity, oldAvailable)` puis `increment(stock_quantity, available)`.
- À la **première** saisie de stockage (oldAvailable = 0), le central est donc **incrémenté** de `available`.  
  Interprétation possible : la validation « réserve » la quantité en diminuant le central ; l’enregistrement du stockage « rend » au central la part que le staff garde en stock (available), la part « utilisée » restant sortie du central. À confirmer métier ; la double opération (approbation + stockage) peut prêter à confusion.

### 7.2 Deux flux d’alimentation du stock central

- **Demande validée** : décrémentation à l’approbation, puis ajustement dans storeStorage (central − oldAvailable + available).
- **Réception directe** (record-receipt) : incrémentation directe de `items.stock_quantity`, sans lien avec une demande ni avec le stock staff.

Les deux flux modifient le même champ `items.stock_quantity` ; il n’y a pas de distinction en base entre « stock réservé aux demandes » et « stock entrant par réception directe ».

### 7.3 Stock staff : pas de champ « stock actuel »

- Le stock staff est **uniquement** dérivé des mouvements (`user_stock_movements`).  
- Aucune table ne stocke un « solde actuel » par (user, item) ; tout passe par `remainingByUserItem()`.  
- Conséquences : cohérent pour l’historique et la traçabilité ; en cas de très gros volume de mouvements, les agrégations pourraient être à optimiser (index, cache, etc.).

### 7.4 Traçabilité demande ↔ stock staff

- Les entrées de type « reçu » issues d’une demande ont `reference_type` = MaterialRequest et `reference_id` = id de la demande.
- Les sorties (distributions) n’ont pas de `reference_type`/`reference_id` renseignés dans le code actuel (uniquement `recipient` et éventuellement `distributed_to_user_id`).  
  Donc le lien « cette sortie provient de quelle livraison / demande » n’est pas enregistré.

### 7.5 Matériel non répertorié (sans item_id)

- Dans **storeStorage**, si `requestItem->item_id` est null, les lignes `Item::decrement` / `increment` ne sont pas exécutées (pas de mise à jour du stock central).
- Un `UserStockMovement` TYPE_RECEIVED peut être créé avec `item_id` null et `designation` renseignée.  
  Cohérent avec le fait que le stock central ne gère que les articles du référentiel.

### 7.6 Contrôle des incohérences

- **Sortie > stock staff** : empêchée dans `storeDistribution()` en comparant `quantity` au `quantity_remaining` calculé par `remainingByUserItem()`.
- **Modification manuelle de `items.stock_quantity`** : possible en base ; aucun observer ou hook du code analysé ne l’interdit (StockService propose une mise à jour avec log, mais n’est pas utilisé dans le flux demande / stockage).
- **Ré-enregistrement du stockage** : dans storeStorage, les anciens `UserStockMovement` liés à la demande sont supprimés puis recréés ; la contrainte reçu = disponible + utilisée est validée côté contrôleur.

---

## 8. Synthèse flux (demande → réception → stockage → utilisation)

1. **Demande** : création `material_requests` + `request_items` (requested_quantity).
2. **Validation (point focal)** : `Item.stock_quantity` décrémenté de chaque requested_quantity (RequestApprovalService).
3. **Livraison** : statut demande → delivered (aucune écriture stock).
4. **Stockage (staff)** : formulaire store-storage → mise à jour `request_items` (quantity_received, quantity_available, quantity_used) ; ajustement `Item.stock_quantity` (− oldAvailable + available) ; création `UserStockMovement` TYPE_RECEIVED pour la part « available » (reference = MaterialRequest).
5. **Utilisation (staff)** : formulaire « Enregistrer une sortie » sur Mon stock → vérification du solde (remainingByUserItem) → création `UserStockMovement` TYPE_DISTRIBUTED (recipient obligatoire). Le « stock restant » staff est recalculé à chaque fois à partir des mouvements.

Ce document reflète l’état du code tel qu’inspecté (migrations, modèles, contrôleurs, services, vues et routes concernés).
