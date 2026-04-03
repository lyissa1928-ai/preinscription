# Architecture du module Gestion des demandes de matériel

Ce document aligne le **cahier des charges** du module avec l’**implémentation actuelle** du projet (gestion-stock-btp) et indique les écarts à combler.

---

## 1. Entités principales – Correspondance

| Spécification | Implémentation actuelle | Statut |
|---------------|-------------------------|--------|
| **Campus** (idCampus, nomCampus, budgetInitial, budgetDisponible, dateDerniereAllocation, statutBudget) | **Campus** : `id`, `name`, `code`, `address`, etc. Pas de champs budget sur la table. Le budget est géré par la table **Budget** (par campus + année fiscale). | ⚠️ Budget dans une table dédiée, pas sur Campus |
| **Utilisateur** (idUser, nom, prenom, email, role, idCampus, statutCompte) | **User** : `id`, `name`, `email`, `campus_id`, etc. Rôles via Spatie : `staff`, `point_focal`, `director`, `super_admin`. | ✅ Aligné |
| **DésignationMateriel** (référentiel, prix, actif, créé par point focal) | **Item** : catalogue avec `name`, `description`, `unit_cost`, `is_active`, `category_id`. Pas de règle « seul point focal crée/modifie » ni « seul PF + directeur voient le prix ». | ⚠️ À renforcer (règles métier + visibilité prix) |
| **DemandeMateriel** (idDemande, statutDemande, commentairePointFocal, etc.) | **MaterialRequest** : `id`, `campus_id`, `requester_user_id`, `subject`, `justification`, `status`, `treatment_notes`, etc. | ✅ Aligné |
| **LigneDemandeMateriel** (idDesignation nullable, nomMaterielLibre, quantite, prixUnitaire, statutLigne) | **RequestItem** : `item_id` nullable, `designation` (texte libre), `requested_quantity`, `unit_price`, `status` (pending, aggregated, received, rejected). | ✅ Aligné (designation + item_id nullable) |
| **Notification** | **AppNotification** (id, user_id, message, type, read_at, etc.). | ✅ Présent |
| **HistoriqueBudget** (réallocation, motif, date, utilisateur) | Pas de table dédiée. Les montants sont dans **Budget** (total_budget, spent_amount) et **Expense**. | ❌ À ajouter si historisation requise |

---

## 2. Statuts demande / ligne

| Spécification | Implémentation | Action |
|---------------|----------------|--------|
| Demande : BROUILLON, SOUMISE, EN_COURS, PARTIELLEMENT_VALIDEE, VALIDEE, REJETEE, LIVREE | `draft`, `submitted`, `approved`, `aggregated`, `partially_received`, `received`, `cancelled`. Présence de `in_treatment` (migration optionnelle). | Ajouter si besoin : `partially_approved` (PARTIELLEMENT_VALIDEE), `delivered` (LIVREE). |
| Ligne : EN_ATTENTE, VALIDE, REFUSE | `pending`, `aggregated`, `received`, `rejected`. | ✅ Couvert (rejected = REFUSE, approved flow = VALIDE). |

---

## 3. Gestion des matériels non répertoriés

- **Spec** : `nomMaterielLibre`, `idDesignation = NULL`, workflow « point focal crée la désignation, associe le prix, met à jour la ligne ».
- **Code** : `RequestItem` a `designation` (texte) et `item_id` nullable. Le point focal peut saisir `unit_price` à la validation. Pas de table « DésignationMateriel » centralisée créée depuis une ligne libre (on peut continuer avec `designation` + `unit_price` sur la ligne, ou introduire un référentiel Désignation plus tard).

---

## 4. Workflow et validation

- **Création par le staff** : formulaire demande + lignes (item ou désignation libre) → statut `submitted`. ✅
- **Traitement par le point focal** : validation globale de la demande avec prix unitaires par ligne → déduction du budget campus (Budget actif, Expense avec `budget_id` + `material_request_id`). ✅
- **Validation / refus par ligne** : actuellement la validation est globale (toute la demande). La spec prévoit **PARTIELLEMENT_VALIDEE** (certaines lignes validées, d’autres refusées). Pour l’aligner il faudrait :
  - soit un statut demande `partially_approved` et des actions « valider ligne » / « refuser ligne » avec mise à jour du budget par ligne ;
  - soit garder le flux actuel (validation globale) et considérer PARTIELLEMENT_VALIDEE comme une évolution ultérieure.

---

## 5. Gestion du budget

- **Spec** : `budgetDisponible` par campus, vérification `budgetDisponible >= coût` à la validation, décrémentation `budgetDisponible -= coût`.
- **Code** : Budget par **campus + année fiscale** (`Budget.total_budget`, `Budget.spent_amount`). À la validation (point focal), contrôle `canSpend(totalCost)` puis `recordExpenseAgainstBudget()` (création Expense + mise à jour `spent_amount`). Pas de `budgetDisponible` sur la table Campus. ✅ Logique équivalente, modèle différent (table Budget).

---

## 6. Notification budget épuisé

- **Spec** : si `budgetDisponible <= 0`, bloquer les validations et notifier point focal + directeur.
- **Code** : le blocage est en place (message « budget insuffisant »). Les **notifications automatiques** (budget épuisé / seuil) ne sont pas implémentées. À ajouter (observers ou jobs) si requis.

---

## 7. Réallocation budgétaire et historisation

- **Spec** : point focal ou directeur peut augmenter `budgetDisponible` ; table HistoriqueBudget (campus, ancienBudget, nouveauBudget, motif, date, utilisateur).
- **Code** : création / édition de **Budget** (directeur), pas de champ « réallocation » ni table d’historique. Pour être conforme : ajouter une table `budget_allocation_history` (ou `historique_budgets`) et enregistrer chaque modification de `total_budget` (ou chaque « réallocation ») avec motif et utilisateur.

---

## 8. Règles de sécurité (visibilité)

| Règle | Implémentation |
|-------|-----------------|
| Staff ne voit pas les prix | À vérifier dans les vues : masquer `unit_price` et totaux pour le rôle `staff`. |
| Point focal et directeur voient les prix | À garantir sur les écrans demande (détail, liste). |
| Staff : ses demandes uniquement | Filtrage par `requester_user_id` ou `campus_id` (staff scopé campus). |
| Point focal / directeur : tous les campus | Déjà géré par les rôles et les requêtes. |

À faire : revue des vues et policies pour **masquer systématiquement les prix au staff**.

---

## 9. Tableaux de bord

- **Staff** : mes demandes, statut, matériel reçu, stock personnel. ✅ (demandes, stock personnel existants)
- **Point focal** : demandes par campus, validation, budget campus, matériels non référencés. ✅ (demandes, budget restant sur la demande ; « matériels non référencés » = lignes avec `item_id` null ou designation libre)
- **Directeur** : synthèse globale, budget total, dépenses par campus, statistiques. ✅ (tableau de bord budgétaire stratégique, liste budgets)

---

## 10. APIs

- **Spec** : GET/POST designations, GET/POST demandes, GET demandes/{id}, POST valider/refuser, GET budget campus, POST allocation.
- **Code** : routes web (formulaires) pour demandes, budgets, validation. Pas d’API REST dédiée (pas de préfixe `api/` pour ce module). Si besoin d’API : ajouter des contrôleurs API ou des routes dans `api.php` en réutilisant la logique métier existante.

---

## 11. Rapports

- **Spec** : dépenses par campus, matériels demandés/refusés, budget restant ; PDF / Excel ; logo ESEBAT, couleurs.
- **Code** : rapports mensuels par campus, exports. À compléter selon la liste exacte (dépenses par campus, matériels refusés, etc.) et format PDF/Excel avec charte graphique.

---

## 12. Plan d’actions recommandé

1. **Prix masqués au staff** : dans les vues (liste/détail demandes), n’afficher `unit_price` et totaux que pour `point_focal`, `director`, `super_admin`.
2. **PARTIELLEMENT_VALIDEE** (optionnel) : statut demande + validation/refus par ligne + déduction budget par ligne.
3. **DésignationMateriel** (optionnel) : si référentiel central avec règles « PF crée/modifie, PF + directeur voient prix », introduire modèle dédié ou étendre Item + policies.
4. **HistoriqueBudget** : table + enregistrement des réallocations / modifications de budget.
5. **Notifications budget épuisé** : événement + notification vers point focal et directeur quand le solde passe à 0 (ou sous un seuil).
6. **APIs REST** : si besoin, exposer designations, demandes, validation, budget en JSON.

---

*Document généré pour alignement avec le cahier des charges du module Gestion des demandes de matériel.*
