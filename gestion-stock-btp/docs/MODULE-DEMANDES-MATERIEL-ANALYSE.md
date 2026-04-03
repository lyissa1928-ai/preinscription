# Module de gestion des demandes de matériel multi-campus — Analyse fonctionnelle et modélisation

## 1. Contexte métier

- **Point focal** et **directeur** : reçoivent, consultent et supervisent les demandes de tous les campus.
- **Staff (par campus)** : soumet des demandes de matériel (mobilier, informatique, pédagogique, autre).
- Chaque demande est rattachée à **un seul campus** et peut contenir **plusieurs lignes de matériel** (désignation + quantité).

---

## 2. Règles fonctionnelles

| Règle | Description |
|-------|-------------|
| R1 | Tout membre du staff d’un campus peut créer une demande. |
| R2 | Une demande est liée à un seul campus. |
| R3 | Une demande peut contenir plusieurs matériels ; chaque ligne a : désignation (ou référence catalogue) + quantité > 0. |
| R4 | Chaque demande contient : demandeur, campus, service/département (optionnel), objet, motif/justification, date de soumission, statut. |
| R5 | Après soumission, la demande est transmise au point focal. |
| R6 | Le point focal traite les demandes par campus (filtrage par campus). |
| R7 | Le directeur consulte toutes les demandes (vue globale, supervision). |
| R8 | Visualisation : liste des campus, demandes par campus, détail d’une demande, matériels et quantités. |

---

## 3. Acteurs et rôles

| Rôle | Droits |
|------|--------|
| **Staff** | Créer une demande, remplir le formulaire, ajouter plusieurs lignes (matériel + quantité), consulter ses demandes, suivre le statut. |
| **Point focal** | Voir toutes les demandes, filtrer par campus, voir le détail, traiter par campus, changer le statut, ajouter commentaire/observation. |
| **Directeur** | Consulter toutes les demandes, vue globale, filtrer par campus/statut/période, superviser. |

---

## 4. Statuts des demandes

| Code technique | Libellé affiché |
|----------------|------------------|
| `draft` | Brouillon |
| `submitted` | Soumise |
| `in_treatment` | En cours de traitement |
| `approved` | Validée |
| `cancelled` | Rejetée |
| `received` / `delivered` | Livrée ou clôturée |

*(Les statuts `aggregated`, `partially_received` restent pour le workflow commandes fournisseurs.)*

---

## 5. Formulaire de demande

**Bloc « Informations générales »**

- Demandeur (rempli automatiquement)
- Campus (sélection, ou imposé si staff scoped)
- Service / Département (optionnel, liste selon campus)
- Objet de la demande
- Motif / justification

**Bloc « Détail des matériels »**

- Lignes dynamiques : **matériel demandé** (désignation ou choix catalogue) + **quantité**
- Boutons : « Ajouter un matériel », « Supprimer une ligne »
- Règles : quantité obligatoire et > 0, interdiction d’envoyer une demande sans aucune ligne.

---

## 6. Tableaux de bord

**Point focal**

- Nombre total de demandes
- Nombre par campus
- Nombre par statut
- Liste des demandes récentes + accès détail
- Filtres : campus, statut, date, demandeur

**Directeur**

- Vue consolidée
- Statistiques par campus
- Statistiques par type de matériel (si possible)
- Demandes en attente / validées / rejetées

---

## 7. Écrans attendus

| Écran | Description |
|-------|-------------|
| Liste des campus | Page listant les campus avec accès aux demandes par campus. |
| Liste des demandes par campus | Filtrage par campus (point focal / directeur). |
| Création d’une demande | Formulaire avec infos générales + lignes dynamiques. |
| Détail d’une demande | Fiche complète : demandeur, campus, service, objet, motif, lignes, statut, historique, commentaires. |
| Traitement (point focal) | Vue listant les demandes avec filtres (campus, statut) et actions (changer statut, commenter). |
| Supervision (directeur) | Vue globale, indicateurs, filtres. |
| Historique staff | Liste des demandes du membre connecté. |

---

## 8. Modélisation de la base de données

### Entités existantes réutilisées

- **Campus** : déjà présent.
- **User** : déjà présent (demandeur, approbateur, etc.).
- **Role** : Spatie (director, point_focal, campus_manager, staff, …).
- **Department** : déjà présent (service/département par campus).

### Entités demandes (alignées sur le modèle actuel)

- **material_requests (Demande)**  
  - Champs existants : `id`, `campus_id`, `requester_user_id`, `request_number`, `status`, `request_date`, `needed_by_date`, `notes`, `submitted_at`, `approved_at`, `approved_by_user_id`, `rejection_reason`, `rejected_at`, `rejected_by_user_id`.  
  - **À ajouter** : `subject` (objet), `justification` (motif), `department_id` (optionnel), `treatment_notes` (commentaire point focal).  
  - Statuts à supporter : `draft`, `submitted`, `in_treatment`, `approved`, `cancelled`, `aggregated`, `partially_received`, `received`, `delivered`.

- **request_items (LigneDemandeMateriel)**  
  - Champs existants : `id`, `material_request_id`, `item_id`, `requested_quantity`, `status`, …  
  - **À ajouter** : `designation` (texte libre si pas de `item_id`).  
  - **À adapter** : `item_id` nullable (ligne possible sans référence catalogue).  
  - Contrainte : `requested_quantity` > 0.

- **items (Materiel / catalogue)**  
  - Déjà présent ; peut être utilisé pour préremplir la désignation ou lier une ligne.

### Règles de cohérence

- Une demande appartient à un seul **campus**.
- Une demande peut avoir plusieurs **request_items** (lignes).
- Chaque ligne a une **quantité** strictement positive.
- Point focal et directeur voient les demandes de tous les campus ; le staff voit ses propres demandes (et selon politique campus).

---

## 9. Workflow de traitement

1. **Staff** : crée une demande (brouillon), ajoute des lignes, soumet → statut `submitted`.
2. **Point focal** : reçoit la demande, peut la passer en `in_treatment`, puis `approved` ou `cancelled` (rejet avec motif) ; peut ajouter `treatment_notes`.
3. **Directeur** : consulte et supervise (pas d’actions obligatoires sur le statut dans ce module).
4. Suite possible : intégration avec le module commandes agrégées (approved → aggregated → received/delivered).

---

## 10. Fichiers et modules impactés (prévus)

| Zone | Fichiers / modules |
|------|---------------------|
| BDD | Migrations : `material_requests` (subject, justification, department_id, treatment_notes, statuts), `request_items` (designation, item_id nullable). |
| Modèles | `MaterialRequest`, `RequestItem`, `Department` (déjà utilisé). |
| Contrôleurs | `MaterialRequestController`, nouveau ou étendu : listes par campus, traitement point focal, supervision directeur. |
| Formulaires | `StoreMaterialRequestRequest`, formulaire de création avec lignes dynamiques. |
| Vues | `material-requests` (create, index, show), vues campus, tableau de bord point focal, tableau de bord directeur. |
| Politiques | `MaterialRequestPolicy` (droits staff / point focal / directeur). |

---

*Document de référence pour l’implémentation du module demandes de matériel multi-campus.*
