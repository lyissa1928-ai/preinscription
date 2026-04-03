# Audit fonctionnel par profil utilisateur

**Projet :** gestion-stock-btp (ESEBAT Logistique & Budget)  
**Objectif :** Identifier les incohérences, les manques et les éléments mal placés par rôle, et proposer des améliorations pour que chaque profil dispose d’une interface claire et adaptée à ses missions.

---

## 1. Rôles et périmètre

| Rôle          | Description courte                    | Périmètre (campus) | Rôle Spatie |
|---------------|----------------------------------------|--------------------|-------------|
| **Staff**     | Utilisateur terrain (campus)          | Un campus          | `staff`     |
| **Point focal** | Logistique, commandes, validation     | Global (campus_id null) | `point_focal` |
| **Directeur** | Pilotage, budgets, administration     | Global             | `director`  |
| **Super Admin** | Tout sauf allocation de budget       | Global             | `super_admin` |

Un utilisateur est dit *site-scoped* s’il a un `campus_id` (ex. staff). Les rôles point_focal, director et super_admin sont en général sans campus (accès global).

---

## 2. État actuel par profil

### 2.1 Staff (site-scoped, rôle `staff`)

**Actions possibles :**
- Créer, modifier (brouillon), supprimer (brouillon), soumettre ses demandes de matériel.
- Ajouter / modifier / retirer des lignes sur ses demandes (brouillon) ou en tant que participant d’une demande groupée.
- Consulter **Mon stock** (réceptions, synthèse, historique, enregistrer sortie).
- Enregistrer le stockage (quantités reçues / utilisées) sur les demandes dont il est demandeur, une fois livrées/réceptionnées.
- Accéder au **Guide utilisateur** et au **Tableau de bord** (mes demandes, KPIs limités, pas d’alertes globales).
- Recherche globale : demandes (voir ci‑dessous).

**Informations accessibles :**
- Ses demandes et les demandes groupées où il est participant.
- Son stock personnel (Mon stock).
- Uniquement ses propres lignes dans l’activité récente (dashboard).

**Menu (sidebar / mini) :**
- Tableau de bord, Demandes de matériel, Mon stock, Guide, Déconnexion.
- Pas : Commandes, Stock et référentiel, Budgets, Actifs, Maintenance, Analyse, Administration.

**Problèmes identifiés :**

| # | Problème | Détail |
|---|----------|--------|
| 1 | **Recherche vs politique d’accès** | La recherche renvoie toutes les demandes du campus (`campus_id = user->campus_id`), alors que la politique `MaterialRequestPolicy::view` n’autorise que demandeur ou participant. Un staff peut donc voir un résultat de recherche puis avoir **403** en ouvrant la fiche. |
| 2 | **Maintenance : pas d’entrée de menu** | Les staff peuvent être assignés à des tickets (MaintenanceTicketController filtre par `assigned_to_user_id` pour les site-scoped non director/super_admin). Ils peuvent créer un ticket. Mais **aucun lien « Maintenance »** dans la sidebar : ils doivent deviner l’URL ou un lien externe. |
| 3 | **Permission `stock.view_campus` inutilisée dans l’UI** | Le rôle staff a la permission `stock.view_campus`, mais le menu « Stock et référentiel » est réservé au point focal / directeur / admin. Un staff ne peut pas consulter le stock de son campus depuis l’interface (utile pour préparer une demande). |

---

### 2.2 Point focal (global, rôle `point_focal`)

**Actions possibles :**
- Voir toutes les demandes ; valider / rejeter (soumises) ; transmettre au directeur ; mettre en traitement, livré, notes ; valider définitivement (après approbation directeur).
- Créer, confirmer, réceptionner, annuler les commandes groupées (AggregatedOrder).
- Accéder au Stock et référentiel (référentiel, désignations, catégories, stock).
- Consulter les budgets en **lecture seule** (pas de création / approbation / activation).
- Enregistrer les réceptions (Mon stock / enregistrer réception) et voir le stock.
- Tableau de suivi logistique, Rapport mensuel par campus, Statistiques (Analytics).
- Pas : Actifs, Maintenance, Campus, Utilisateurs, Paramètres.

**Informations accessibles :**
- Toutes les demandes, toutes les commandes, stock global, budgets (lecture), analyses et rapports listés ci‑dessus.

**Menu :**
- Tout le menu « Opérations » et « Stock et référentiel », « Finances » (Budgets uniquement, pas Tableau de bord budgétaire ni Allocations), « Analyse » (suivi logistique, rapport mensuel, stats).
- Pas : Inventaire (Actifs, Maintenance), Administration (Campus, Utilisateurs, Paramètres).

**Problèmes identifiés :**

| # | Problème | Détail |
|---|----------|--------|
| 4 | **Actifs / Maintenance absents du menu** | Le point focal gère les commandes et le stock. Selon l’organisation, il peut être pertinent qu’il **consulte** les actifs et les tickets de maintenance (pour suivi logistique). Aujourd’hui, aucun lien dans la sidebar : accès uniquement par URL. À trancher selon le métier : soit ajouter une entrée « Maintenance » (et éventuellement « Actifs ») en lecture / suivi, soit documenter que c’est réservé au directeur. |
| 5 | **Tableau de bord budgétaire / Allocations** | Réservés au directeur et super_admin. Cohérent avec les permissions (point_focal n’a pas budget.create/approve/activate). Pas de changement nécessaire si le métier le confirme. |

---

### 2.3 Directeur (rôle `director`)

**Actions possibles :**
- Tout ce que fait le point focal, plus :
- Approuver / rejeter les demandes transmises par le point focal (pending_director).
- Créer, approuver, activer les budgets ; tableau de bord budgétaire ; allocations ; enregistrer / approuver dépenses.
- Accès complet Actifs (création, transfert, maintenance, mise au rebut) et Maintenance (assignation, travail, résolution, clôture).
- Gestion des campus et des utilisateurs (UserController, CampusController).
- Paramètres (Settings).

**Informations accessibles :**
- Toutes les données métier et d’administration (demandes, commandes, stock, budgets, actifs, maintenance, campus, utilisateurs).

**Menu :**
- Menu complet (Opérations, Stock, Finances, Inventaire, Analyse, Administration, Aide).

**Problèmes identifiés :**

| # | Problème | Détail |
|---|----------|--------|
| 6 | **Chevauchement point focal / directeur** | Sur les commandes, seul le **point_focal** peut confirmer et réceptionner (contrôleurs). Le directeur peut annuler mais pas confirmer/recevoir. C’est cohérent si le directeur ne fait pas les opérations courantes ; à documenter clairement pour éviter les attentes (« en tant que directeur je ne peux pas réceptionner »). |

---

### 2.4 Super Admin (rôle `super_admin`)

**Actions possibles :**
- **Peut tout faire**, sans limite, **sauf allocation de budget** (création d’allocation, enregistrement de dépense sur allocation, approbation, réconciliation). Ces actions restent réservées au **Directeur**.
- Gestion des campus, des utilisateurs (création, modification, désactivation, suppression), paramètres de l’application.
- Consultation des allocations et budgets en lecture (view).

**Informations accessibles :**
- Identique au directeur (vue sur tout, sauf actions d’allocation).

**Menu :**
- Identique au directeur ; le Super Admin ne voit pas / n’a pas accès aux actions d’allocation de budget (policy + permissions).

**Règle métier :**
- Super Admin = tout sauf allocation de budget (réservée au Directeur).

---

## 3. Synthèse des incohérences fonctionnelles

1. **Recherche (staff)** : les résultats de recherche incluent des demandes du campus que le staff n’a pas le droit d’ouvrir (policy) → 403 possible.
2. **Maintenance (staff)** : pas de lien dans le menu alors qu’ils peuvent avoir des tickets assignés et en créer.
3. **Stock campus (staff)** : permission `stock.view_campus` présente mais pas d’entrée de menu pour consulter le stock du campus.
4. **Maintenance / Actifs (point focal)** : pas d’entrée de menu ; à décider selon le besoin métier (lecture / suivi ou non).

---

## 4. Propositions d’amélioration et de corrections

### 4.1 Recherche : aligner les résultats sur la politique d’accès (Staff)

- **Problème :** Un staff voit en recherche des demandes du même campus qu’il n’est pas autorisé à ouvrir (policy = demandeur ou participant uniquement).
- **Modification proposée :** Dans `SearchController::searchMaterialRequests`, pour un utilisateur site-scoped qui n’a pas les rôles point_focal/director/super_admin, filtrer par :
  - `requester_user_id = user->id` OU
  - participant (`whereHas('participants', ...)`)
  - et **ne plus** inclure uniquement `campus_id = user->campus_id`.
- **Raison :** Les résultats de recherche ne doivent proposer que des fiches que l’utilisateur est autorisé à ouvrir, pour éviter 403 et confusion.

---

### 4.2 Menu : ajouter « Maintenance » pour le Staff

- **Problème :** Les staff peuvent être assignés à des tickets et peuvent en créer, mais n’ont aucun lien dans la sidebar.
- **Modification proposée :** Dans `resources/views/layouts/app.blade.php`, ajouter une entrée conditionnelle pour les utilisateurs qui peuvent au moins **voir** des tickets (ex. staff qui ont des tickets assignés, ou tous les staff si on veut qu’ils voient la page « mes tickets » même vide). Proposition : afficher « Maintenance » (ou « Mes tickets de maintenance ») pour tout utilisateur authentifié, avec :
  - Sidebar : lien vers `maintenance-tickets.index` pour les rôles qui ne sont pas director/super_admin (donc staff et point_focal), par exemple dans une section « Opérations » ou « Suivi ».
  - Le contrôleur filtre déjà : staff ne voient que les tickets assignés à eux, point_focal peut voir selon la logique actuelle (non site-scoped => tous ou par filtre).
- **Raison :** Donner aux techniciens (staff) un accès explicite à leurs tickets assignés et à la création de tickets, sans passer par l’URL.

---

### 4.3 Stock campus pour le Staff (optionnel)

- **Problème :** La permission `stock.view_campus` existe pour le staff mais il n’a aucune entrée de menu pour consulter le stock de son campus.
- **Modification proposée (A) – Lecture seule :** Ajouter pour le staff un lien du type « Stock de mon campus » (ou réutiliser la même route `stock-referentiel.index` ou `stock.dashboard`) qui affiche une vue **lecture seule** du stock du campus (liste des articles / quantités), sans boutons d’édition ni accès au référentiel complet. Adapter `StockReferentielController` ou une vue dédiée pour que, pour le rôle staff, seule la partie « consultation stock campus » soit affichée.
- **Modification proposée (B) – Ne pas exposer :** Si le métier considère que le staff n’a pas besoin de voir le stock global du campus (ils passent uniquement par les demandes et « Mon stock »), retirer la permission `stock.view_campus` du rôle staff dans `RolesAndPermissionsSeeder` et documenter ce choix.
- **Raison :** Soit on rend la permission utile (lien + vue lecture seule), soit on supprime la permission pour éviter un écart entre droits et interface.

---

### 4.4 Point focal : accès Maintenance (et éventuellement Actifs) en consultation

- **Problème :** Le point focal n’a pas d’entrée pour Maintenance (ni Actifs) alors qu’il pilote la logistique et les commandes.
- **Modification proposée :** Si le métier le souhaite, afficher pour le point_focal un lien « Maintenance » (et éventuellement « Actifs ») dans la sidebar, en **lecture seule** ou avec des actions limitées (ex. voir les tickets, statuts, sans assignation ni clôture). Adapter le menu comme pour le directeur/super_admin mais en restreignant les actions côté contrôleur (policy) pour point_focal (view only ou view + actions limitées).
- **Raison :** Permettre un suivi logistique des actifs et des maintenances sans donner les droits directeur (assignation, clôture, etc.).

---

### 4.5 Documenter la répartition des actions sur les commandes

- **Problème :** Seul le point_focal peut confirmer et réceptionner les commandes ; le directeur peut annuler mais pas confirmer/recevoir. Ce partage peut surprendre.
- **Modification proposée :** Documenter dans le guide utilisateur ou une fiche « Rôles et responsabilités » que :
  - **Confirmation et réception des commandes** : point focal (ou rôle dédié logistique).
  - **Annulation** : point focal et directeur.
  - **Création** : point focal, directeur, super_admin (selon contrôleurs).
- **Raison :** Clarifier les rôles et éviter les demandes du type « en tant que directeur je veux réceptionner ».

---

### 4.6 Cohérence Policy « view » et listing (Staff)

- **Constat :** `MaterialRequestPolicy::view` pour un staff limite à demandeur ou participant. Il n’existe pas de page « Toutes les demandes de mon campus » pour le staff (la liste « Mes demandes » est bien limitée au demandeur/participant). Donc pas de listing qui affiche des lignes interdites en vue détail. Le seul point à corriger est la **recherche** (cf. 4.1).
- **Raison :** Une fois la recherche alignée sur la policy, la cohérence est rétablie.

---

## 5. Fonctionnalités manquantes utiles par profil

| Profil      | Fonctionnalité manquante potentielle | Bénéfice |
|-------------|--------------------------------------|----------|
| **Staff**   | Notification ou rappel « Demande en attente de validation » (côté demandeur) | Réduire les oublis et relances. |
| **Staff**   | Export PDF de « Mes demandes » ou d’une demande | Archivage et suivi hors ligne. |
| **Point focal** | Filtre « Demandes par campus » sur le tableau de suivi logistique (si pas déjà présent) | Vue plus ciblée par établissement. |
| **Point focal** | Indication claire du solde budgétaire (ou alerte) avant validation d’une demande | Éviter de valider au‑dessus du solde. |
| **Directeur** | Tableau de bord synthétique « Demandes en attente de ma décision » (pending_director) | Accès rapide à la tâche d’approbation. |
| **Tous**    | Filtres sauvegardés ou favoris sur les listes (demandes, commandes) | Gain de temps sur les écrans les plus utilisés. |

---

## 6. Éléments inutiles ou mal placés

| Élément | Profil concerné | Problème | Recommandation |
|--------|------------------|----------|----------------|
| **Résultats de recherche (demandes)** | Staff | Montrent des demandes non ouvrables (403). | Corriger le filtre de recherche (cf. 4.1). |
| **Lien « Stock et référentiel »** | Staff | Absent alors que permission `stock.view_campus` existe. | Soit ajouter une entrée « Stock campus » en lecture seule (4.3A), soit retirer la permission (4.3B). |
| **Section « Inventaire » (Actifs, Maintenance)** | Point focal | Absente ; peut être voulue en lecture. | Décision métier : ajouter en lecture / suivi (4.4) ou laisser réservé au directeur. |
| **KPIs / Alertes globales sur le dashboard** | Staff | Alertes (budget, stock) masquées pour staff ; KPIs limités. | Cohérent : pas de surcharge ; conserver. |

---

## 7. Vérification « outils nécessaires par responsabilité »

| Responsabilité | Profil(s) | Outils actuels | Manques éventuels |
|----------------|-----------|----------------|--------------------|
| Saisir et suivre ses demandes | Staff | Demandes, Mon stock, Dashboard (mes demandes), Guide | Recherche à corriger ; optionnel : lien Maintenance, stock campus lecture seule. |
| Valider / rejeter / transmettre les demandes | Point focal, Directeur | Fiche demande, liste demandes (filtres), tableau suivi logistique | - |
| Créer et réceptionner les commandes | Point focal | Commandes groupées, réceptions | Documenter que le directeur n’a pas « réceptionner ». |
| Gérer le référentiel (désignations, catégories, stock) | Point focal, Directeur, Super admin | Stock et référentiel, Désignations, Catégories | - |
| Gérer les budgets et allocations | Directeur, Super admin | Budgets, Tableau de bord budgétaire, Allocations | - |
| Gérer actifs et maintenance | Directeur, Super admin | Actifs, Maintenance | Staff : lien « Maintenance » pour mes tickets ; Point focal : optionnel (lecture). |
| Analyser et piloter | Point focal, Directeur | Suivi logistique, Rapport mensuel, Statistiques | - |
| Administrer (campus, utilisateurs, paramètres) | Directeur, Super admin | Campus, Utilisateurs, Paramètres | - |

---

## 8. Récapitulatif des actions recommandées

1. **Correction (prioritaire) :** Aligner la recherche des demandes pour le staff sur `MaterialRequestPolicy::view` (résultats = demandes où il est demandeur ou participant).
2. **Menu :** Ajouter un lien « Maintenance » (ou « Mes tickets ») pour les staff (et éventuellement pour le point focal en lecture).
3. **Stock staff :** Choisir entre (A) ajouter une entrée « Stock de mon campus » en lecture seule, ou (B) retirer la permission `stock.view_campus` et documenter.
4. **Point focal :** Décision métier sur l’accès Maintenance / Actifs (lecture ou non) puis adaptation du menu et des policies si besoin.
5. **Documentation :** Rédiger une fiche « Rôles et responsabilités » (notamment commandes : qui confirme, qui réceptionne, qui annule) et mettre à jour le guide utilisateur si nécessaire.
6. **Évolutions possibles :** Notifications staff (demande en attente), export PDF des demandes, filtre « en attente de ma décision » pour le directeur, filtres sauvegardés sur les listes.

---

*Document généré à partir de l’analyse du code (routes, contrôleurs, policies, layout, seeders) du projet gestion-stock-btp.*
