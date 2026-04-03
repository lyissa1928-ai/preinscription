# Utilisateurs à créer par campus — ESEBAT Logistique

Ce document indique **quels utilisateurs créer** au niveau global (sans campus) et **au niveau de chaque campus**, avec leur rôle et leur usage dans l’application.

---

## 1. Rôles disponibles (rappel)

| Rôle | Périmètre | Usage principal |
|------|-----------|------------------|
| **director** | Global (aucun campus) | Direction : tous les campus, budgets, utilisateurs, tableaux de bord, supervision. |
| **point_focal** | Global (aucun campus) | Logistique : recevoir les demandes de tous les campus, créer/confirmer/réceptionner les commandes groupées, tableau de suivi. |
| **campus_manager** | 1 campus | Responsable de campus : demandes de son campus, validation locale, budgets, stock, actifs, maintenance. |
| **site_manager** | 1 campus | Gestionnaire de site : demandes, budgets, stock, actifs, maintenance (scope campus). |
| **staff** | 1 campus | Demandeur : créer et suivre ses demandes de matériel, consulter stock/actifs/maintenance de son campus. |
| **technician** | 1 campus | Technicien : voir et traiter les tickets de maintenance qui lui sont assignés. |

---

## 2. Utilisateurs au niveau GLOBAL (sans campus)

À créer **une seule fois** pour toute l’organisation (pas rattachés à un campus).

| Utilisateur à créer | Rôle | Nom / usage suggéré |
|---------------------|------|----------------------|
| **1 Directeur** | `director` | ex. DG, Direction générale — accès complet, supervision, Campus, Utilisateurs, Budgets, Tableau de suivi logistique. |
| **1 ou 2 Point focal** | `point_focal` | ex. Responsable logistique — traitement des demandes de tous les campus, commandes groupées, réceptions, Tableau suivi logistique. |

**Important :** pour `director` et `point_focal`, le champ **campus** doit rester **vide** (aucun campus).

---

## 3. Utilisateurs à créer PAR CAMPUS

Pour **chaque campus**, créer au moins les utilisateurs suivants.

### 3.1 Obligatoires par campus

| Utilisateur | Rôle | Campus | Rôle dans l’app |
|-------------|------|--------|------------------|
| **1 Responsable de campus** | `campus_manager` | Ce campus | Pilote les demandes du campus, peut valider/rejeter (en plus du point focal), gère budgets/allocations, stock, actifs, maintenance. |
| **Au moins 1 Demandeur** | `staff` | Ce campus | Crée les demandes de matériel pour le campus, consulte ses demandes et le stock. En pratique : plusieurs `staff` par campus (par service/département). |

### 3.2 Recommandés par campus

| Utilisateur | Rôle | Campus | Rôle dans l’app |
|-------------|------|--------|------------------|
| **1 Gestionnaire de site** (optionnel) | `site_manager` | Ce campus | Peut créer/valider des demandes et gérer stock/actifs/maintenance au niveau du campus (complément au campus_manager). |
| **1 ou plusieurs Techniciens** (si maintenance) | `technician` | Ce campus | Voient les tickets qui leur sont assignés, travaillent et clôturent les interventions. |

### 3.3 Résumé par campus (exemple)

Pour **chaque campus** vous pouvez créer par exemple :

- **1** `campus_manager` (responsable du campus)
- **2 à N** `staff` (demandeurs : par service, département ou projet)
- **0 ou 1** `site_manager` (si besoin d’un second gestionnaire)
- **0 à N** `technician` (si vous utilisez le module maintenance)

---

## 4. Récapitulatif en tableau

| Rôle | Où créer ? | Nombre | Campus |
|------|------------|--------|--------|
| **director** | Global | 1 | Aucun |
| **point_focal** | Global | 1 ou 2 | Aucun |
| **campus_manager** | Par campus | 1 par campus | Oui (choisir le campus) |
| **staff** | Par campus | 2 à N par campus | Oui (choisir le campus) |
| **site_manager** | Par campus (optionnel) | 0 ou 1 par campus | Oui |
| **technician** | Par campus (optionnel) | 0 à N par campus | Oui |

---

## 5. Exemple pour 3 campus

- **Global :**  
  - 1 utilisateur `director` (campus = vide)  
  - 1 utilisateur `point_focal` (campus = vide)

- **Campus A :**  
  - 1 `campus_manager` (campus = Campus A)  
  - 3 `staff` (campus = Campus A)  
  - 1 `technician` (campus = Campus A)

- **Campus B :**  
  - 1 `campus_manager` (campus = Campus B)  
  - 2 `staff` (campus = Campus B)

- **Campus C :**  
  - 1 `campus_manager` (campus = Campus C)  
  - 2 `staff` (campus = Campus C)  
  - 1 `site_manager` (campus = Campus C)  
  - 2 `technician` (campus = Campus C)

**Total exemple :** 2 globaux + 3 + 3 + 4 = **12 utilisateurs** (à adapter selon le nombre de campus et de demandeurs).

---

## 6. Où créer les utilisateurs dans l’application ?

- **Menu** (réservé au **director**) : **Administration → Utilisateurs**.
- Lors de la création : choisir le **rôle** et, pour les rôles campus, le **campus**.
- Les rôles `director` et `point_focal` doivent avoir **aucun campus** (champ campus vide).

---

*Document de référence pour le déploiement des comptes utilisateurs par campus.*
