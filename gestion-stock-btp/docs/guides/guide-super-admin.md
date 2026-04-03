# Guide utilisateur — Profil Super Admin

Vous êtes **Super Admin** : vous avez **tous les droits** de la plateforme (équivalent Directeur + gestion des comptes administrateurs). Vous configurez les **campus**, les **utilisateurs** (y compris Directeurs et Points focaux), et vous pouvez intervenir sur **budgets**, **demandes**, **commandes**, **actifs** et **maintenance**.

---

## 1. Périmètre Super Admin

- Tout ce que peut faire un **Directeur** (voir [Guide Directeur](guide-directeur.md)).
- En plus : création et édition d’utilisateurs avec le rôle **Directeur** (le Directeur ne peut pas créer un autre Directeur lui-même selon les règles métier).
- En pratique : vous êtes le niveau le plus élevé pour la configuration et le secours (comptes, campus, droits).

---

## 2. Tableau de bord

- Même vue que la Direction : KPIs, **À traiter** (demandes à valider, commandes), **Mes demandes** si vous en créez.
- Utilisez le menu **Analyse** pour le tableau de suivi logistique et les statistiques.

---

## 3. Administration : Campus et Utilisateurs

### Campus

- **Administration** → **Campus** : créer, modifier, supprimer des campus. À configurer en priorité pour que les Staff soient affectés et que les demandes soient rattachées au bon campus.

### Utilisateurs

- **Administration** → **Utilisateurs**.
- **Créer un utilisateur** : nom, prénom, email, rôle (**Directeur**, **Point focal logistique**, **Staff**), campus (obligatoire pour Staff).
- **Modifier** : changer rôle, campus, suspendre.
- **Actions par lot** (cases à cocher) :
  - Supprimer (soft delete + anonymisation).
  - Affecter à un campus (Staff).
  - Suspendre / Réactiver.

Ne supprimez pas votre propre compte depuis l’interface (bloqué). Pour les autres comptes, la suppression est douce (anonymisation) pour garder l’historique.

---

## 4. Demandes, commandes, budgets (même usage que Directeur)

- **Demandes de matériel** : consulter, valider, rejeter, mettre en cours, clôturer.
- **Commandes groupées** : créer, confirmer, réceptionner, annuler (réservé au point focal en routine ; vous pouvez le faire en secours).
- **Budgets** : créer, approuver, activer. **Allocations** : créer, consulter, approuver les dépenses.

Référez-vous au [Guide Directeur](guide-directeur.md) et au [Guide Point focal](guide-point-focal.md) pour le détail des étapes.

---

## 5. Inventaire : Stock, Actifs, Maintenance

- **Stock** : consultation, alertes stock faible.
- **Actifs** : transfert, envoi en maintenance, récupération, réforme.
- **Maintenance** : assignation de techniciens, clôture de tickets.

---

## 6. Analyse

- **Tableau suivi logistique (DG)** et **Statistiques par campus** : mêmes vues que pour le Directeur / Point focal.

---

## Bonnes pratiques Super Admin

1. **Campus** : créer et maintenir à jour les campus avant d’affecter les utilisateurs.
2. **Utilisateurs** : attribuer le rôle **Point focal logistique** ou **Directeur** avec soin (accès étendus). Staff = un campus obligatoire.
3. **Sécurité** : ne pas partager le compte Super Admin ; créer des comptes Directeur / Point focal pour le quotidien.
4. En cas de **bug ou d’accès refusé** : vous pouvez reprendre une action (validation, commande, etc.) en vous connectant en Super Admin.

---

*Pour des démos animées pas à pas, utilisez la page **Guide utilisateur** dans la plateforme.*
