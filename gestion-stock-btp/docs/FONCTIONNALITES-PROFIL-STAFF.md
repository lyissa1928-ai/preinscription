# Fonctionnalités du profil Staff

Un **membre du staff** est affilié à **un seul campus**. Il ne doit consulter et interagir qu’avec les activités de **son campus** (isolation stricte des données).

---

## Ce que le staff doit avoir (spécification)

### 1. Tableau de bord
- Vue d’accueil après connexion.
- Résumé de **ses** demandes (en cours, soumises, validées).
- Accès rapide à « Mes demandes » et « Mon stock personnel ».
- Journal d’activité limité aux actions liées à **ses** demandes (pas toute la plateforme).

### 2. Demandes de matériel
- **Créer** une demande (individuelle ou groupée), uniquement pour **son campus**.
- **Voir** uniquement :
  - les demandes dont il est **demandeur** ;
  - les demandes **groupées** auxquelles il est **participant** (même campus).
- **Modifier / supprimer** uniquement ses demandes en **brouillon**.
- **Soumettre** une demande pour validation (point focal / directeur).
- **Demande groupée** : s’il est **participant**, pouvoir **ajouter des lignes** (matériel + quantités) à la demande en brouillon.
- **Ne peut pas** : valider, rejeter, mettre en traitement, clôturer une demande (réservé point focal / directeur).

### 3. Mon stock personnel
- **Voir** son inventaire personnel :
  - matériels **reçus** ou livrés ;
  - matériels **distribués** à d’autres personnes ou services ;
  - **quantité restante** par article.
- **Enregistrer une distribution** : lorsqu’il remet du matériel à quelqu’un (destinataire optionnel, article, quantité).
- **Ne peut pas** : « Enregistrer réception » (attribution d’un reçu à un utilisateur) — réservé au point focal / directeur.

### 4. Guide utilisateur
- Accès au **guide** (procédures, démos) comme les autres profils.

### 5. Notifications
- Voir les **notifications** qui le concernent (ex. demande validée / rejetée).

---

## Ce que le staff ne doit pas avoir

| Fonctionnalité | Raison |
|----------------|--------|
| **Commandes groupées** (création, confirmation, réception) | Rôle du point focal. |
| **Rapport mensuel par campus** | Réservé point focal / directeur. |
| **Tableau de suivi logistique (DG)** | Réservé direction / point focal. |
| **Statistiques par campus** | Réservé direction / point focal. |
| **Enregistrer réception** (attribution livraison à un utilisateur) | Point focal / directeur. |
| **Budgets / Allocations** (création, approbation, dépenses) | Gestion financière = directeur / point focal. |
| **Stock** (inventaire global, alertes, mise à jour quantités) | Gestion centralisée = point focal. |
| **Actifs** (création, transfert, maintenance, mise au rebut) | Gestion des actifs = point focal / directeur. |
| **Maintenance** (création, assignation, clôture) | Sauf si un « technicien » est un sous-type de staff (voir ci‑dessous). |
| **Campus / Utilisateurs / Paramètres** | Administration = directeur / super admin. |

---

## Optionnel selon votre organisation

- **Voir les actifs de son campus** (lecture seule) : utile si le staff doit savoir quels équipements sont sur site.
- **Voir les tickets de maintenance** qui lui sont **assignés** : si le staff peut être assigné à une intervention (sinon, masquer la section Maintenance).
- **Voir les budgets / allocations de son campus** (lecture seule) : pour transparence ; sinon, masquer Finances pour le staff.

---

## Résumé : menu idéal pour le staff

1. **Tableau de bord**
2. **Demandes de matériel** (liste, création, détail, soumission)
3. **Mon stock personnel** (synthèse + historique + enregistrer distribution)
4. **Guide utilisateur**
5. **Notifications** (cloche)

Tout le reste (Commandes groupées, Budgets, Allocations, Stock, Actifs, Maintenance, Analyse, Administration) peut être **masqué** dans le menu pour le staff pour éviter confusion et accès inutiles.
