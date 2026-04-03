# Audit technique — Rapport complet

**Projet :** gestion-stock-btp (ESEBAT – Laravel)  
**Date :** Mars 2025  
**Rôle :** Auditeur technique senior / Architecte logiciel / Correcteur full-stack

---

## 1. ÉTAT DES LIEUX GLOBAL

### Structure analysée

- **Backend (Laravel) :**
  - `app/Http/Controllers` : 20+ contrôleurs (MaterialRequest, RequestItem, Designation, Category, Referentiel, StockReferentiel, Stock, PersonalStock, Budget, BudgetAllocation, AggregatedOrder, Asset, MaintenanceTicket, Campus, User, Dashboard, Analytics, LogistiqueDashboard, Guide, Settings, CampusMonthlyReport, Notification).
  - `app/Models` : MaterialRequest, RequestItem, Item, Category, User, Campus, Budget, BudgetAllocation, AggregatedOrder, UserStockMovement, etc.
  - `app/Policies` : MaterialRequestPolicy, BudgetPolicy, BudgetAllocationPolicy, AssetPolicy, AggregatedOrderPolicy, MaintenanceTicketPolicy.
  - `routes/web.php` : routes groupées (auth), resource et actions dédiées.
  - Pas de frontend séparé (Next.js) : interface Blade dans `resources/views/`.
- **Vues :** `resources/views/` (layouts/app, dashboard, material-requests, request-items, designations, categories, referentiel, stock-referentiel, stock, personal-stock, budgets, budget-allocations, aggregated-orders, assets, maintenance-tickets, campuses, users, analytics, tableau-suivi-logistique, reports, guide, notifications, settings).
- **Modules métier :** Demandes de matériel, Commandes groupées, Stock et référentiel, Budgets et allocations, Actifs, Maintenance, Campus, Utilisateurs, Tableaux de bord, Analyse.

### Zones sensibles identifiées

- **Permissions par rôle :** Staff vs point_focal vs director vs super_admin (menu sidebar, contrôleurs Stock/Referentiel/Designations/Categories).
- **Cohérence routes ↔ contrôleurs ↔ vues :** resource material-requests sans edit/update alors qu’une vue edit existait ; route stock.history sans méthode correspondante.
- **Politiques :** update vs treat pour les notes de traitement (point focal).
- **Données sensibles :** prix (unit_cost, unit_price) visibles uniquement pour point_focal/director/super_admin.

### Niveau de cohérence général

- **Bon :** Policies MaterialRequest, Budget, menus conditionnés par rôle, formulaire Stocker, Mon stock, catalogue sans prix pour le staff.
- **Problèmes :** Accès Stock non restreint côté serveur pour le staff ; formulaire « Modifier la demande » et route update absents ; méthode history manquante ; autorisation des notes de traitement ; vue edit avec champs susceptibles de provoquer des erreurs (item null, date null).

---

## 2. LISTE EXHAUSTIVE DES PROBLÈMES DÉTECTÉS

| # | Type | Description | Fichiers concernés | Impact |
|---|------|-------------|--------------------|--------|
| 1 | **Sécurité / Permissions** | Les routes `stock/*` (dashboard, index, show, lowStockAlert, API) étaient accessibles au staff par URL directe, alors que le métier exige que le staff ne voie que son stock personnel. | `StockController.php` | Le staff pouvait voir le stock global et les données associées. |
| 2 | **Fonctionnalité cassée** | La vue `material-requests/edit.blade.php` et le formulaire postent vers `material-requests.update`, mais les routes `edit` et `update` avaient été exclues du resource. Aucun lien « Modifier la demande » sur la fiche. | `routes/web.php`, `MaterialRequestController.php`, `show.blade.php` | Impossible de modifier une demande en brouillon. |
| 3 | **Route sans méthode** | La route `GET stock/history/{item}` appelle `StockController::history`, méthode inexistante (seul `getHistory` existait). | `routes/web.php`, `StockController.php` | Erreur 500 si quelqu’un appelle cette route. |
| 4 | **Autorisation incohérente** | `updateTreatmentNotes` utilisait `authorize('update', $materialRequest)`. Or la policy `update` n’autorise que les brouillons ; le point focal doit pouvoir ajouter des notes de traitement sur des demandes déjà soumises. | `MaterialRequestController.php` | Le point focal ne pouvait pas enregistrer les notes de traitement après soumission. |
| 5 | **Vue / Données** | Dans `material-requests/edit.blade.php`, affichage de `$item->item->description` et `$item->item->unit_of_measure` sans gestion du cas « article non répertorié » (item_id null). | `edit.blade.php` | Erreur si une ligne est en désignation libre. |
| 6 | **Vue / Attribut HTML** | `flex-grow-1` utilisé comme balise au lieu de `class="flex-grow-1"`. | `edit.blade.php` | Rendu CSS incorrect. |
| 7 | **Vue / Null-safety** | `$materialRequest->needed_by_date->format('Y-m-d')` sans vérification de null. | `edit.blade.php` | Erreur si la date n’est pas renseignée. |

---

## 3. PLAN DE CORRECTION

- **Priorité 1 (sécurité) :** Restreindre l’accès à toutes les actions du `StockController` (dashboard, index, show, lowStockAlert, getStock, getLowStockItems, getAvailableStock, getHistory) aux rôles point_focal, director, super_admin. Ajouter une méthode `history()` qui délègue à `getHistory` avec autorisation.
- **Priorité 2 (fonctionnalité) :** Réactiver les routes `edit` et `update` pour les demandes de matériel ; implémenter `edit()` et `update()` dans `MaterialRequestController` (autorisation via policy, uniquement brouillon) ; ajouter le bouton « Modifier la demande » sur la fiche lorsque statut = brouillon et `canEdit`.
- **Priorité 3 (cohérence) :** Remplacer `authorize('update')` par `authorize('treat')` dans `updateTreatmentNotes`.
- **Priorité 4 (robustesse vues) :** Dans la vue edit, utiliser `display_label` et `item?->unit_of_measure`, corriger l’attribut `class`, et sécuriser l’affichage de la date (optional/null-safe).

---

## 4. MODIFICATIONS APPLIQUÉES

### 4.1 StockController — Restriction d’accès

- **Fichier :** `app/Http/Controllers/StockController.php`
- **Changements :**
  - Dans `dashboard()`, `index()`, `show()`, `lowStockAlert()` : ajout d’un contrôle en début de méthode : si l’utilisateur n’a pas l’un des rôles `point_focal`, `director`, `super_admin`, alors `abort(403, …)`.
  - Dans `getStock()`, `getLowStockItems()`, `getAvailableStock()`, `getHistory()` : même contrôle, avec retour JSON `403` pour les API.
  - Ajout de la méthode `history(Request $request, Item $item)` qui vérifie le rôle puis appelle `getHistory($request, $item->id)` pour que la route `stock.history` fonctionne.

### 4.2 MaterialRequest — Routes et contrôleur edit/update

- **Fichier :** `routes/web.php`
  - Suppression de `->except(['edit', 'update'])` sur le resource `material-requests` pour réactiver les routes `edit` et `update`.
- **Fichier :** `app/Http/Controllers/MaterialRequestController.php`
  - **edit(MaterialRequest $materialRequest) :** autorisation `update`, redirection si statut ≠ brouillon, chargement des campus et de la demande, retour de la vue `material-requests.edit` avec `materialRequest` et `campuses`.
  - **update(MaterialRequest $materialRequest, Request $request) :** autorisation `update`, vérification brouillon, validation `campus_id`, `needed_by_date`, `notes`, mise à jour des champs puis redirection vers la fiche avec message de succès.
- **Fichier :** `resources/views/material-requests/show.blade.php`
  - Ajout du bouton « Modifier la demande » (lien vers `material-requests.edit`) dans le bloc des actions lorsque `status === 'draft'` et `$canEdit`.

### 4.3 Notes de traitement (point focal)

- **Fichier :** `app/Http/Controllers/MaterialRequestController.php`
  - Dans `updateTreatmentNotes()` : remplacement de `$this->authorize('update', $materialRequest)` par `$this->authorize('treat', $materialRequest)`.

### 4.4 Vue edit — Robustesse et affichage

- **Fichier :** `resources/views/material-requests/edit.blade.php`
  - Remplacement de `$item->item->description` par `$item->display_label`, et de `$item->item->unit_of_measure` par `$item->item?->unit_of_measure ?? 'unité(s)'`.
  - Correction de l’attribut : `flex-grow-1` → `class="flex-grow-1"`.
  - Remplacement de `$materialRequest->needed_by_date->format('Y-m-d')` par `$materialRequest->needed_by_date?->format('Y-m-d')`.

---

## 5. VÉRIFICATION FINALE

### Validé

- Staff : ne peut plus accéder à `/stock`, `/stock/dashboard`, etc. ; message 403 explicite.
- Demande en brouillon : « Modifier la demande » visible et fonctionnel (edit + update) ; policy `update` respectée.
- Notes de traitement : le point focal peut les enregistrer pour toute demande qu’il a le droit de traiter (`treat`).
- Vue edit : plus d’erreur sur articles non répertoriés ni sur date manquante ; mise en forme corrigée.
- Route `stock.history` : répond correctement via la nouvelle méthode `history()` avec contrôle de rôle.

### À traiter éventuellement (hors périmètre de cet audit)

- **Doublon d’API :** `GET api/low-stock-items` (nom de route `getLowStockItems`) et `GET stock/api/low-items` (nom `stock.getLowStockItems`) appellent tous deux `StockController::getLowStockItems`. À fusionner ou documenter si les deux usages sont voulus.
- **Référentiel pour le staff :** Accès par URL à `referentiel-materiel` (catalogue sans prix). Soit conserver en lecture seule, soit rediriger le staff vers `stock-referentiel` pour stricte conformité au « seul mon stock ».
- **Tests :** Ajouter des tests fonctionnels ou d’intégration pour edit/update des demandes, accès refusé au stock pour le staff, et notes de traitement.

### Risques résiduels

- Aucun risque critique identifié sur les modifications effectuées. Les changements sont alignés avec les politiques existantes et le comportement attendu par rôle.
