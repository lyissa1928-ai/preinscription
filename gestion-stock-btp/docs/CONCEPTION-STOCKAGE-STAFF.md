# Conception : stockage staff (sans erreur ni ambiguïté)

## 1. Objectif

- Chaque **staff** dispose d’un **stock personnel** : quantités qui lui ont été **attribuées** après livraison (via l’action « Stocker » du point focal sur la demande).
- À **chaque utilisation** d’un matériel de ce stock, la **quantité restante** est **décrémentée** (la quantité initiale reçue reste en historique, seule la restante diminue).

Aucune ambiguïté : **quantité initiale** = total reçu (fixe) ; **quantité restante** = initiale − total utilisé/distribué.

---

## 2. Vocabulaire (source de vérité)

| Terme | Définition |
|-------|------------|
| **Quantité initiale** | Somme de toutes les entrées « reçu » pour (utilisateur, article/désignation). **Ne diminue jamais.** |
| **Quantité utilisée / distribuée** | Somme de toutes les sorties « distribué » (utilisation par le staff ou donnée à un tiers). |
| **Quantité restante** | `Quantité initiale − Quantité utilisée/distribuée`. C’est le stock disponible pour une nouvelle utilisation. |

À chaque **utilisation** enregistrée par le staff, on **n’enlève pas** à la quantité initiale : on **ajoute une sortie**. La restante est **toujours** recalculée : `restante = initiale − sorties`.

---

## 3. Modèle de données

### 3.1 Table `user_stock_movements`

- **Entrée (type `received`)** : matériel attribué au staff (créé quand le point focal fait « Stocker » sur une demande livrée et met une « quantité à stocker » pour le demandeur).
- **Sortie (type `distributed`)** : matériel utilisé par le staff ou donné à quelqu’un (créé quand le staff enregistre une « utilisation » ou une « distribution »).

Règles invariantes :

- Pour un même `(user_id, item_id ou designation)` :
  - **Quantité initiale** = `SUM(quantity)` où `type = 'received'`.
  - **Quantité sortie** = `SUM(quantity)` où `type = 'distributed'`.
  - **Quantité restante** = quantité initiale − quantité sortie.
- Une **utilisation** ne peut être enregistrée que si **quantité demandée ≤ quantité restante**.

### 3.2 Pas de champ « stock restant » stocké

Le restant est **toujours calculé** à partir des mouvements (reçu − distribué). Ainsi, pas de désynchronisation ni de double décrémentation.

---

## 4. Flux fonctionnel

### 4.1 Alimentation du stock staff (point focal)

1. Le point focal **réceptionne** la commande groupée (quantités reçues).
2. Il **marque** les demandes comme **livrées**.
3. Sur chaque demande livrée, il clique **Stocker** et saisit pour chaque ligne :
   - quantité reçue, quantité **à stocker** (disponible), quantité déjà utilisée.
4. Le système crée des mouvements **`received`** pour le **demandeur** (staff) avec la « quantité à stocker ».  
→ C’est la **seule** façon d’augmenter la « quantité initiale » du staff.

### 4.2 Utilisation du stock par le staff

1. Le staff ouvre **Mon stock** (inventaire personnel).
2. Il voit pour chaque article : **quantité initiale (reçue)**, **quantité déjà utilisée/distribuée**, **quantité restante**.
3. Pour enregistrer une **utilisation** :
   - Il choisit l’article (ou la désignation),
   - Il saisit la **quantité utilisée** (obligatoire, ≥ 1, **≤ quantité restante**),
   - Optionnel : note (ex. « Utilisé pour chantier X ») ou destinataire si c’est une distribution.
4. À la validation :
   - Le système vérifie : `quantité ≤ quantité restante` (sinon erreur explicite).
   - Il crée **un** mouvement `distributed` avec cette quantité.
   - La **quantité restante** pour cet article est immédiatement **décrémentée** (recalcul : initiale − total distribué).

Règle métier : **à chaque utilisation, la quantité restante diminue exactement de la quantité enregistrée.** La quantité initiale ne change jamais.

---

## 5. Règles de validation (éviter les erreurs)

| Règle | Contrôle | Message si non respecté |
|-------|----------|-------------------------|
| Quantité utilisée ≥ 1 | Validation formulaire | « La quantité doit être au moins 1. » |
| Quantité utilisée ≤ quantité restante | Backend (après recalcul du restant) | « Quantité insuffisante en stock. Restant : X. » |
| Article ou désignation obligatoire | Validation | « Indiquez un article ou une désignation. » |
| Pas de stock négatif | Invariant : restant = reçu − distribué ; on n’accepte pas de créer une sortie si restant < quantité | « Quantité insuffisante en stock. Restant : X. » |

Toute création de mouvement `distributed` doit être **précédée** du calcul du restant actuel pour (user, item/designation) et de la vérification `quantity <= remaining`.

---

## 6. Qui fait quoi

| Rôle | Alimenter le stock staff (créer des « reçu ») | Consulter Mon stock | Enregistrer une utilisation (décrémenter le restant) |
|------|-----------------------------------------------|---------------------|------------------------------------------------------|
| **Staff** | Non (ne peut pas faire « Stocker » sur la demande) | Oui | Oui (uniquement sur son propre stock) |
| **Point focal / Directeur / Super admin** | Oui (via « Stocker » sur la demande livrée) | Oui (leur stock + vue par staff si besoin) | Oui (sur leur stock) |

La **quantité initiale** du staff ne peut donc être modifiée que par l’action « Stocker » du point focal (ou rôles équivalents) sur une demande dont le staff est le demandeur.

---

## 7. Résumé technique

- **Quantité initiale** : somme des mouvements `type = received` par (user, item/designation). **Jamais décrémentée.**
- **À chaque utilisation** : création d’un mouvement `type = distributed` ; la **quantité restante** = initiale − somme(distributed) est **décrémentée** de cette quantité.
- **Pas de champ stock restant persisté** : toujours dérivé des mouvements pour éviter incohérences.
- **Validation stricte** : refus d’enregistrer une utilisation si `quantité > quantité restante`.

Cette conception garantit un stockage staff sans erreur ni ambiguïté : une seule source de vérité (les mouvements), et une décrémentation claire du restant à chaque utilisation.
