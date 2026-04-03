# Aspect technique : réception des commandes livrées et stockage (point focal)

## Contexte

À la livraison physique par le fournisseur, le **point focal** doit :
1. **Réceptionner** la commande groupée (enregistrer les quantités effectivement reçues).
2. **Stocker** les quantités au niveau des demandes (répartition reçu / disponible / utilisée) pour mettre à jour le stock global et le stock personnel des demandeurs.

---

## 1. Flux actuel (deux étapes)

### Étape A — Réception de la commande groupée

| Élément | Détail |
|--------|--------|
| **Entrée** | Commande groupée (`AggregatedOrder`) en statut `confirmed`. |
| **Écran** | Commandes groupées → ouvrir la commande → **Réceptionner** (ou lien équivalent). |
| **Route** | `GET aggregated-orders/{order}/receive` → `AggregatedOrderController::receiveForm` |
| **Vue** | `aggregated-orders.receive` : formulaire avec une ligne par `AggregatedOrderItem` (description, quantité commandée, quantité reçue à saisir). |
| **Soumission** | `POST aggregated-orders/{order}/receive` → `AggregatedOrderController::receive` |

**Traitement métier (`FederationService::recordOrderReceipt`)** :

- Pour chaque ligne :
  - Mise à jour de `AggregatedOrderItem.quantity_received`.
  - Appel à `RequestItem::recordReceipt($quantity)` → met à jour `RequestItem.quantity_received` et statut `received` ou `partially_received`.
- Mise à jour du statut de la commande :
  - Si tout est reçu : `AggregatedOrder` → `received`.
  - Sinon : `partially_received`.
- **Important** : à ce stade, **aucune** mise à jour de `Item.stock_quantity` ni de `UserStockMovement` (stock personnel). Le message « Stock mis à jour » affiché après réception est trompeur ; seuls les modèles commande / lignes de demande sont mis à jour.

### Étape B — Livraison des demandes puis stockage

Pour que les quantités reçues soient effectivement « stockées » (stock global + stock personnel), il faut traiter chaque **demande de matériel** concernée.

#### B1 — Marquer la demande comme livrée

| Élément | Détail |
|--------|--------|
| **Condition** | Demande dans un des statuts : `approved`, `received`, `aggregated`, `partially_received`. |
| **Action** | Sur la fiche demande : **Clôturer / livrer**. |
| **Route** | `POST material-requests/{id}/delivered` → `MaterialRequestController::setDelivered` |
| **Effet** | `MaterialRequest.status` → `delivered`. |

Aujourd’hui, cette action est **manuelle** : le point focal doit aller sur chaque demande et cliquer « Clôturer / livrer ». Il n’y a pas de passage automatique en `delivered` lorsque la commande groupée est réceptionnée.

#### B2 — Enregistrer le stockage (répartition reçu / disponible / utilisée)

| Élément | Détail |
|--------|--------|
| **Condition** | Demande en statut `delivered` ou `received`. |
| **Écran** | Fiche demande → bouton **Stocker** (visible si `auth()->user()->can('storeStorage', $materialRequest)`). |
| **Routes** | `GET material-requests/{id}/store-storage` (formulaire), `POST material-requests/{id}/store-storage` (enregistrement). |
| **Contrôleur** | `MaterialRequestController::storeStorageForm` / `storeStorage`. |
| **Policy** | `MaterialRequestPolicy::storeStorage` — pour l’instant le **staff** n’a pas le droit ; **point_focal**, **director**, **super_admin** (et demandeur auteur, sauf si désactivé) peuvent stocker. |

**Règle métier (formulaire)** :

- Pour chaque ligne de la demande (`RequestItem`) :  
  **quantité reçue** = **quantité à stocker (disponible)** + **quantité déjà utilisée**.
- Saisie : `quantity_received`, `quantity_available`, `quantity_used` par ligne.

**Traitement (`MaterialRequestController::storeStorage`)** :

1. Validation des trois quantités par ligne (reçu = disponible + utilisée).
2. Suppression des anciens mouvements de stock liés à cette demande :  
   `UserStockMovement` où `reference_type = MaterialRequest` et `reference_id = {id}`.
3. Pour chaque `RequestItem` :
   - Mise à jour de `RequestItem` : `quantity_received`, `quantity_available`, `quantity_used`.
   - **Stock global** :  
     - retrait de l’ancien « disponible » : `Item::decrement('stock_quantity', $oldAvailable)` ;  
     - ajout du nouveau « disponible » : `Item::increment('stock_quantity', $available)`.
   - **Stock personnel du demandeur** : si `quantity_available > 0`, création d’un `UserStockMovement` :
     - `user_id` = demandeur de la demande (`requester_user_id`) ;
     - `item_id` / `designation` ;
     - `quantity` = `quantity_available` ;
     - `type` = `received` ;
     - `reference_type` = `MaterialRequest`, `reference_id` = id de la demande.

Résultat : le **stock global** (`Item.stock_quantity`) et le **stock personnel** (mouvements « reçu » du demandeur) sont cohérents avec les quantités stockées.

---

## 2. Synthèse du flux technique pour le point focal

```
1. Réception commande (aggregated-orders/receive)
   → AggregatedOrderItem.quantity_received, RequestItem.quantity_received + statut
   → AggregatedOrder.status = received | partially_received
   → Pas de mise à jour Item / UserStockMovement

2. Pour chaque demande concernée par la commande :
   a) Marquer la demande comme livrée (material-requests/{id}/delivered)
      → MaterialRequest.status = delivered

   b) Ouvrir « Stocker » (material-requests/{id}/store-storage)
      → Saisir pour chaque ligne : reçu, à stocker (disponible), utilisé
      → Mise à jour RequestItem, Item.stock_quantity, UserStockMovement (stock personnel du demandeur)
```

---

## 3. Points d’attention et évolutions possibles

- **Cohérence du message** : après « Réceptionner » la commande, le message dit « Stock mis à jour » alors que seul le niveau commande / RequestItem est mis à jour. À corriger (message du type « Réception enregistrée ») ou à aligner avec une évolution qui mettrait vraiment à jour le stock à ce moment-là.
- **Automatisation « livrée »** : lorsqu’une commande groupée est entièrement réceptionnée, on pourrait passer automatiquement en `delivered` les demandes dont toutes les lignes sont en `received` (optionnel, selon les règles métier).
- **Stocker depuis la réception** : possibilité d’ajouter, depuis l’écran de réception de la commande, un lien ou un raccourci « Allouer / Stocker pour les demandes » qui ouvre le formulaire de stockage par demande, ou une vue regroupée (avancée).
- **Staff** : la fonctionnalité « Stocker » est actuellement désactivée pour le staff (policy + redirection) ; seul le point focal (ou directeur / super_admin) enregistre le stockage.

---

## 4. Fichiers principaux

| Rôle | Fichier |
|------|--------|
| Réception commande (formulaire + POST) | `App\Http\Controllers\AggregatedOrderController` (`receiveForm`, `receive`) |
| Réception commande (règles métier) | `App\Services\FederationService::recordOrderReceipt` |
| Demande livrée | `App\Http\Controllers\MaterialRequestController::setDelivered`, `App\Models\MaterialRequest::setDelivered` |
| Stockage (formulaire + POST) | `App\Http\Controllers\MaterialRequestController::storeStorageForm`, `storeStorage` |
| Droits stockage | `App\Policies\MaterialRequestPolicy::storeStorage` |
| Stock personnel | `App\Models\UserStockMovement` (type `received`, `reference_type` = `MaterialRequest`) |
| Stock global | `App\Models\Item` (`stock_quantity`), mis à jour dans `MaterialRequestController::storeStorage` |
| Vue réception | `resources/views/aggregated-orders/receive.blade.php` |
| Vue stockage | `resources/views/material-requests/store-storage.blade.php` |

Ce document décrit l’aspect technique actuel de la réception des commandes livrées et du stockage par le point focal ; les évolutions (messages, automatisation livrée, liens depuis la réception) peuvent s’appuyer sur cette base.
