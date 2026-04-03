# État des lieux : stock staff (stock local) vs stock central

## Flux métier retenu

1. Le **point focal** livre (action « Stocker » sur la demande livrée).
2. Le **staff** reçoit : le matériel est **ajouté au stock du staff** (UserStockMovement type `received`, `user_id` = demandeur).
3. Chaque **sortie** (utilisation ou attribution) par le staff crée un mouvement `distributed` avec **destinataire réel obligatoire**.
4. Chaque sortie **décrémente automatiquement** le stock du staff (restant = reçu − distribué).
5. Chaque mouvement est **historisé** (table `user_stock_movements`).
6. **Aucune sortie incohérente** : validation backend `quantité ≤ stock restant`, refus sinon.

**Distinction obligatoire :**
- **Stock central** (point focal / référentiel) : `Item.stock_quantity` + vue agrégée. Non utilisé pour le suivi « qui a reçu quoi » côté staff.
- **Stock local du staff** : `UserStockMovement` où `user_id` = le staff (reçu − distribué = restant).

---

## Fichiers inspectés et modifiés

### 1. Base de données

| Fichier | Action |
|---------|--------|
| `database/migrations/2026_03_07_150000_create_user_stock_movements_table.php` | Inspecté. Structure existante : `user_id`, `item_id`, `designation`, `quantity`, `type`, `distributed_to_user_id`, `notes`. Pas de champ libre « destinataire réel ». |
| `database/migrations/2026_03_20_100000_add_recipient_to_user_stock_movements.php` | **Créé.** Ajout colonne `recipient` (string 500, nullable pour anciennes lignes). Commentaire : destinataire réel obligatoire pour toute sortie (étudiant, classe, salle, etc.). |

### 2. Modèles

| Fichier | Action |
|---------|--------|
| `app/Models/UserStockMovement.php` | **Modifié.** (1) Commentaire de classe : préciser « stock LOCAL du staff », « pas le stock central du point focal », « destinataire réel obligatoire pour toute sortie ». (2) Ajout de `recipient` dans `$fillable`. |

### 3. Contrôleurs

| Fichier | Action |
|---------|--------|
| `app/Http/Controllers/PersonalStockController.php` | **Modifié.** (1) Commentaire de classe : stock local du staff, flux point focal livre → staff reçoit → sorties avec destinataire obligatoire. (2) `storeDistribution` : règle de validation `recipient` **required**, string, max 500 ; message dédié si absent ; vérification `trim(recipient) !== ''` ; enregistrement de `recipient` sur le mouvement ; message d’erreur en cas de quantité > restant : « Stock restant pour cet article : X. Aucune sortie incohérente autorisée. » ; message succès : « Sortie enregistrée. Le stock a été décrémenté. » |
| `app/Http/Controllers/MaterialRequestController.php` | **Modifié.** (1) Avant création de `UserStockMovement` (type received) : commentaire explicite « Stock LOCAL du staff (demandeur) : le point focal livre → le matériel est ajouté au stock du staff ». (2) Avant mise à jour de `Item.stock_quantity` : commentaire « Stock central (référentiel). Distinct du stock local staff ». (3) Libellé de note du mouvement : « Livraison – [numéro demande] ». |

### 4. Vues (formulaires et affichage)

| Fichier | Action |
|---------|--------|
| `resources/views/personal-stock/index.blade.php` | **Modifié.** (1) Texte d’intro : « Stock local (staff) », « point focal livre → matériel ajouté à votre stock », « sortie = destinataire réel obligatoire », « décrémente automatiquement », « chaque mouvement historisé ». (2) Tableau synthèse : libellé colonne « Enregistrer une sortie ». (3) Formulaire inline (chaque ligne) : champ **obligatoire** « Destinataire réel » (text, placeholder, maxlength 500, required) ; bouton « Enregistrer sortie ». (4) Modal « Enregistrer une sortie » : titre et texte explicatif ; champ **Destinataire réel** obligatoire (placeholder : ex. élève, classe, salle, labo, usage interne) ; « Utilisateur du campus » restant optionnel (si destinataire = un compte) ; bouton « Enregistrer la sortie ». (5) Historique des mouvements : pour les sorties, affichage prioritaire de `recipient` (échappé), sinon `distributedTo->name` pour l’ancien données ; note en complément si présente. (6) Bouton principal : « Enregistrer une sortie » (icône box-arrow-right). |

### 5. Routes et politique

| Fichier | Action |
|---------|--------|
| `routes/web.php` | Inspecté. Aucune modification : routes `personal-stock.index`, `personal-stock.store-distribution` inchangées. |
| Policies | Aucune nouvelle policy : le staff ne fait que consulter et enregistrer des sorties sur **son** stock (`user_id` = auth()->id()). |

---

## Règles métier appliquées (backend)

- **Destinataire réel** : requis en validation (`required|string|max:500`), re-vérification `trim(recipient) !== ''` avant création. Refus avec message dédié si absent.
- **Quantité** : `required|integer|min:1|max:99999`. Puis comparaison au **stock restant** (calculé via `UserStockMovement::remainingByUserItem($user->id)`). Si `quantity > remaining` → erreur, pas de création de mouvement.
- **Article** : au moins un parmi `item_id` ou `designation` (sinon erreur « Indiquez un article ou une désignation »).
- **Historisation** : chaque sortie crée une ligne `user_stock_movements` (type `distributed`, `recipient` renseigné). Aucune suppression des sorties ; seul le calcul « restant = reçu − distribué » est utilisé.

---

## Synthèse des incohérences corrigées

1. **Confusion stock central / stock staff** : commentaires et libellés clarifiés dans le modèle, le contrôleur matériel et la vue (stock local staff = UserStockMovement du demandeur ; stock central = Item.stock_quantity).
2. **Destinataire optionnel** : le destinataire est désormais **obligatoire** (champ `recipient`, saisie libre : étudiant, classe, salle, etc.) et enregistré en base ; affiché dans l’historique.
3. **Sortie sans identité du destinataire** : plus possible ; validation backend + champs requis en interface (tableau + modal).
4. **Risque de sortie incohérente** : contrôle strict en backend (quantité ≤ restant), message explicite en cas de refus.

Aucune seconde fonctionnalité créée, aucun contournement : réutilisation de `user_stock_movements`, des routes et du contrôleur existants, avec une migration additive et des validations renforcées.
