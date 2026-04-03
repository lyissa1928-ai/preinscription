# Refonte messagerie – Expérience type WhatsApp

## 1. Fichiers inspectés

- `app/Http/Controllers/InboxController.php` – Logique liste, show, store, storeMessage, permissions
- `app/Services/MessagingService.php` – Règles qui peut écrire à qui (inchangé)
- `app/Policies/ConversationPolicy.php` – view, sendMessage, deleteForMe (inchangé)
- `resources/views/inbox/index.blade.php` – Ancienne liste simple
- `resources/views/inbox/show.blade.php` – Ancien écran discussion (cards + formulaire)
- `resources/views/layouts/app.blade.php` – Structure main, styles, scripts
- `routes/web.php` – Routes messagerie (inchangées)

## 2. Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `app/Http/Controllers/InboxController.php` | Extraction de `getConversationsList($user)` ; passage de `conversations` + `currentConversation` à la vue `show` ; `index` utilise la même liste. Aucun changement de règles métier. |
| `resources/views/inbox/index.blade.php` | Refonte complète : layout 2 colonnes (sidebar liste + zone bienvenue), recherche de conversation (JS), inclusion CSS inbox-whatsapp. |
| `resources/views/inbox/show.blade.php` | Refonte complète : même layout 2 colonnes (sidebar avec conversation active + zone discussion), header type WhatsApp, bulles, zone de saisie fixe, message vocal, pièces jointes, statut lu/non lu. |
| `docs/MESSAGERIE-REFONTE-WHATSAPP.md` | Ce livrable. |

## 3. Composants créés

| Composant | Rôle |
|-----------|------|
| `public/css/inbox-whatsapp.css` | Feuille de style dédiée : structure 2 colonnes, liste conversations (avatar, heure, badge, recherche), header chat, bulles envoyées/reçues, horodatage, zone saisie fixe, responsive, thème ESEBAT (orange). |
| `resources/views/inbox/partials/conversation-list.blade.php` | Partial réutilisable : en-tête avec recherche + bouton nouvelle conversation, liste des conversations (lien, avatar, nom, aperçu dernier message, heure relative, badge non lu, état actif). |

## 4. Règles de sécurité conservées

- **Backend inchangé** pour les autorisations : `MessagingService::canSendTo`, `canAccessConversation`, `canSendInConversation` ; `ConversationPolicy::view`, `sendMessage`, `deleteForMe` ; `InboxController::authorize('view')` et `authorize('sendMessage')` / `authorize('deleteForMe')`.
- **Liste des conversations** : toujours issue de `getConversationsList($user)` (filtrée par `user1_id`/`user2_id` et `user1_hidden_at`/`user2_hidden_at`). Aucune exposition de conversations d’autres utilisateurs.
- **Affichage d’une conversation** : réservé aux participants via policy `view` et `canAccessConversation`.
- **Envoi de message** : contrôlé par `sendMessage` et `canSendTo` vers l’autre participant.
- **Destinataires « Nouvelle conversation »** : toujours via `MessagingService::allowedRecipientsQuery($user)` (page create inchangée côté logique).

## 5. Fonctionnalités type WhatsApp ajoutées

- **Colonne gauche (liste)** : avatar, nom, aperçu du dernier message, heure relative (diffForHumans), badge de non lus, conversation active mise en évidence, recherche en temps réel (filtre par nom), scroll propre, bouton nouvelle conversation.
- **Zone droite (discussion)** : header fixe (avatar, nom, rôle, menu options / supprimer conversation), zone messages scrollable, bulles différenciées (envoyées à droite / reçues à gauche), horodatage par message (H:i), indicateur lu (✓✓) pour les messages envoyés, champ de saisie fixe en bas avec pièce jointe + message vocal + envoi, Enter pour envoyer.
- **Design** : bulles arrondies type WhatsApp, fond avec motif discret, couleurs sent/received, thème orange ESEBAT pour bulles envoyées et bouton envoyer.
- **Responsive** : sur mobile, liste masquée quand une conversation est ouverte, bouton retour vers la liste ; colonne liste en haut (partie visible) puis zone discussion ou bienvenue.

## 6. Preuve interface type messagerie moderne

- Structure en **2 colonnes** (liste | discussion ou bienvenue) comme WhatsApp/Web.
- **Liste** : cartes conversation avec avatar, nom, aperçu, heure, badge ; recherche ; pas de simple liste brute.
- **Discussion** : header dédié, bulles alignées (droite = envoyé, gauche = reçu), horodatage discret, zone de saisie fixe en bas avec actions (pièce jointe, vocal, envoyer).
- **Fichier CSS dédié** (`inbox-whatsapp.css`) : variables, bulles, responsive, thème.

## 7. Preuve que les restrictions entre profils fonctionnent toujours

- Aucune modification des contrôleurs au-delà de l’ajout de `getConversationsList` et du passage de `conversations` / `currentConversation` aux vues.
- Les routes, policies et `MessagingService` sont inchangés ; les vues n’appellent que des routes et données fournies par le backend (liste filtrée, conversation autorisée, formulaire d’envoi si `canReply`).
- La page « Nouvelle conversation » (`inbox.create`) n’a pas été modifiée : les destinataires restent ceux de `allowedRecipientsQuery($user)`.

---

**Résumé** : Refonte uniquement frontend (vues + CSS + partial). Expérience utilisateur proche de WhatsApp (liste, discussion, bulles, recherche, responsive). Backend et règles métier (staff ≠ directeur, point focal → tous, accès strict aux conversations) inchangés et toujours appliqués côté serveur.
