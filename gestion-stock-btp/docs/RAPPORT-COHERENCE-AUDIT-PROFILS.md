# Rapport de cohérence — Audit des profils (post-corrections)

**Projet :** gestion-stock-btp (ESEBAT Logistique & Budget)  
**Date :** après implémentation des corrections de l’audit fonctionnel par profil.

---

## 1. Fichiers modifiés

| Fichier | Modifications |
|---------|----------------|
| `app/Http/Controllers/SearchController.php` | Filtre recherche demandes : staff ne voit que les demandes où il est demandeur ou participant (aligné sur `MaterialRequestPolicy::view`). |
| `app/Http/Controllers/StockController.php` | Nouvelle méthode `monCampus()` (Stock de mon campus, lecture seule staff). Redirection staff depuis `index()` vers `mon-campus` ou 403. Import `RedirectResponse`. |
| `app/Http/Controllers/AggregatedOrderController.php` | Docblock précisant les rôles métier : création / confirmation / réception (point_focal) ; annulation (point_focal + directeur) ; consultation (pf, directeur, super_admin). |
| `app/Services/GuideConfigService.php` | Résumés point_focal et directeur précisant qui confirme/réceptionne vs annule les commandes. |
| `resources/views/layouts/app.blade.php` | Lien « Maintenance » / « Mes tickets de maintenance » pour tous (staff, point_focal, directeur, admin). Lien « Stock de mon campus » pour staff (si `stock.view_campus`). Section Inventaire (Actifs) réservée à directeur et super_admin. Icône Maintenance dans sidebar-mini. |
| `resources/views/stock/mon-campus.blade.php` | **Nouveau.** Vue lecture seule du stock pour le staff (catalogue + quantités + statut, sans prix ni action). |
| `routes/web.php` | Route `GET stock/mon-campus` → `StockController::monCampus` (nommée `stock.mon-campus`). |

---

## 2. Corrections appliquées

### Correction 1 — Recherche des demandes (Staff)

- **Problème :** La recherche renvoyait toutes les demandes du campus ; un staff pouvait ouvrir une fiche et recevoir un 403.
- **Solution :** Dans `SearchController::searchDemandes`, pour un utilisateur site-scoped non admin, le filtre est restreint à :
  - `requester_user_id = user->id` OU
  - participant (`whereHas('participants', ...)`).
- **Résultat :** Les résultats de recherche correspondent aux droits de la policy ; plus de 403 après clic sur un résultat.

### Correction 2 — Accès Maintenance pour Staff et Point focal

- **Problème :** Les staff (et point focal) n’avaient pas d’entrée de menu pour les tickets de maintenance alors qu’ils peuvent en créer et en avoir assignés.
- **Solution :**
  - Lien **« Mes tickets de maintenance »** (staff) ou **« Maintenance »** (point_focal, directeur, admin) dans la sidebar et dans la barre d’icônes (sidebar-mini).
  - La page `maintenance-tickets.index` existante filtre déjà : staff ne voient que les tickets qui leur sont assignés ; point_focal/directeur/admin voient l’ensemble.
- **Résultat :** Aucun accès caché par URL ; chaque profil dispose d’un menu cohérent avec ses droits.

### Correction 3 — Permission stock.view_campus (Staff)

- **Problème :** Le rôle staff avait la permission `stock.view_campus` sans interface dédiée.
- **Solution (option A) :**
  - Nouvelle route `stock.mon-campus` et méthode `StockController::monCampus()`.
  - Vue `stock/mon-campus.blade.php` : catalogue des articles avec quantités et statut (lecture seule, sans prix ni lien « Voir »).
  - Lien **« Stock de mon campus »** dans le menu pour les utilisateurs site-scoped non admin ayant la permission `stock.view_campus`.
  - Si un staff accède à `stock.index`, redirection vers `stock.mon-campus` (ou 403 s’il n’a pas la permission).
- **Résultat :** La permission est utilisée ; pas de menu mort ni de permission orpheline.

### Correction 4 — Maintenance / Actifs pour Point focal

- **Décision :** Le point focal a désormais un accès explicite à **Maintenance** (même lien que les autres, avec filtres côté contrôleur). Les **Actifs** restent réservés au directeur et au super_admin (pas d’accès lecture pour le point focal dans cette version).
- **Résultat :** Point focal peut suivre les tickets de maintenance ; périmètre Actifs inchangé.

### Correction 5 — Clarification des rôles sur les commandes

- **Code :** Docblock détaillé dans `AggregatedOrderController` (création, confirmation, réception, annulation, consultation).
- **Guide :** Résumés des rôles point_focal et directeur mis à jour dans `GuideConfigService` (qui confirme/réceptionne, qui annule).
- **Résultat :** Comportement documenté dans le code et dans l’expérience guide ; moins d’ambiguïté pour les utilisateurs.

---

## 3. Nouvelles routes

| Méthode | URI | Nom | Contrôleur | Profil |
|---------|-----|-----|------------|--------|
| GET | `stock/mon-campus` | `stock.mon-campus` | `StockController::monCampus` | Staff (avec `stock.view_campus`) |

---

## 4. Permissions et policies

- **Aucune nouvelle permission** créée ; utilisation explicite de `stock.view_campus` pour le staff.
- **Policies :** Aucune modification. La recherche est alignée sur `MaterialRequestPolicy::view` sans changer la policy.

---

## 5. Menus modifiés (résumé)

| Élément | Avant | Après |
|--------|--------|--------|
| Maintenance | Visible uniquement pour directeur et super_admin (section Inventaire) | Visible pour **tous** : libellé « Mes tickets de maintenance » (staff) ou « Maintenance » (autres). Section Inventaire = Actifs uniquement, pour directeur et super_admin. |
| Stock de mon campus | Absent | Lien pour **staff** ayant `stock.view_campus`. |
| Sidebar-mini | Pas d’icône Maintenance pour staff / point_focal | Icône Maintenance (ou « Mes tickets ») pour tous. |

---

## 6. Vérification de cohérence globale

| Règle UX | Statut |
|----------|--------|
| Aucune page visible dans le menu ne doit produire un 403 après clic | **Respecté** : recherche staff alignée sur la policy ; staff sans permission stock n’ont pas le lien « Stock de mon campus » ; staff avec permission sont redirigés de `stock.index` vers `stock.mon-campus`. |
| Chaque menu correspond à une fonctionnalité accessible | **Respecté** : Maintenance, Stock de mon campus, autres liens existants pointent vers des pages accessibles au profil concerné. |
| Aucune permission inutilisée pour un rôle exposé dans l’UI | **Respecté** : `stock.view_campus` est utilisée par la page « Stock de mon campus » et le lien conditionnel. |
| Policies et UX alignées | **Respecté** : recherche demandes = policy view ; accès stock staff = lecture seule dédiée. |
| Principe du moindre privilège | **Respecté** : staff limité à ses demandes/participations, à son stock personnel, au stock campus en lecture seule et à ses tickets de maintenance ; point_focal sans gestion Actifs ; directeur sans confirmation/réception des commandes. |

---

## 7. Récapitulatif par profil

| Profil | Actions principales | Menus ajoutés / modifiés |
|--------|---------------------|---------------------------|
| **Staff** | Demandes (ses demandes + participations), Mon stock, Stock de mon campus (lecture), Mes tickets de maintenance, Guide | + Stock de mon campus ; + Mes tickets de maintenance |
| **Point focal** | Tout comme avant + accès explicite Maintenance (suivi) | + Maintenance (déjà présent pour directeur/admin, désormais visible pour pf) |
| **Directeur** | Comme avant ; annulation commandes documentée | Inventaire = Actifs uniquement (Maintenance déplacé plus haut pour tous) |
| **Super Admin** | Inchangé | Idem directeur |

---

## 8. Fonctionnalités non implémentées (hors périmètre des corrections)

Les éléments suivants restent recommandés pour une phase ultérieure :

- Notifications (demande en attente, approuvée/rejetée, budget, réception).
- Widget dashboard directeur « Demandes en attente de ma décision ».
- Export PDF d’une demande ou de « Mes demandes ».
- Filtres sauvegardés (demandes, commandes, analyses).

---

*Rapport généré après implémentation des corrections de l’audit fonctionnel par profil.*
