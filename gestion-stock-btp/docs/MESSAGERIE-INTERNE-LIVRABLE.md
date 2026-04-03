# Messagerie interne – Livrable et preuves de sécurité

## 1. Rôles pris en compte

Les rôles utilisés par le module de messagerie sont ceux du projet (Spatie Permission) :

| Rôle          | Description métier                          |
|---------------|---------------------------------------------|
| `staff`       | Utilisateur de base (campus ou global)       |
| `point_focal` | Point focal logistique                      |
| `director`    | Directeur                                   |
| `super_admin` | Administrateur système                      |

Un utilisateur peut n’avoir qu’un seul rôle principal pour la messagerie ; la logique s’appuie sur le premier rôle retourné par `$user->roles`.

---

## 2. Matrice des communications autorisées

**Qui peut envoyer un message à qui** (contrôlé côté backend dans `MessagingService`) :

| Expéditeur   | Peut envoyer à                    |
|-------------|------------------------------------|
| **staff**   | `point_focal` uniquement          |
| **point_focal** | `staff`, `point_focal`, `director`, `super_admin` |
| **director**| `staff`, `point_focal`, `super_admin` |
| **super_admin** | `staff`, `point_focal`, `director`, `super_admin` |

Règles métier respectées :
- Le **staff ne peut pas** envoyer au directeur (il ne voit que le point focal dans la liste des destinataires).
- Le **point focal peut** envoyer à tout le monde (staff, directeur, admin, autres point focaux).
- Le **directeur** peut envoyer à staff, point focal et super_admin (pas entre directeurs sauf si ajouté explicitement).
- L’**administrateur** peut communiquer avec tous les rôles.

Définition précise : `app/Services/MessagingService.php`, tableau `ALLOWED_SEND_TO` et méthode `canSendTo(User $from, User $to)`.

---

## 3. Fichiers inspectés

- `app/Models/User.php` – Rôles (HasRoles), `getDisplayNameAttribute`
- `app/Providers/AuthServiceProvider.php` – Enregistrement des policies
- `routes/web.php` – Groupe auth + middleware
- `app/Models/AppNotification.php` – Type `inbox_message` et `data` (conversation_id)
- `resources/views/notifications/index.blade.php` – Lien vers une demande (pour y ajouter le lien conversation)
- `resources/views/layouts/app.blade.php` – Sidebar et topbar pour ajouter le lien Messagerie

---

## 4. Fichiers modifiés / créés

### Créés
- `database/migrations/2026_03_25_100000_create_conversations_table.php`
- `database/migrations/2026_03_25_100001_create_inbox_messages_table.php`
- `app/Models/Conversation.php`
- `app/Models/InboxMessage.php`
- `app/Services/MessagingService.php`
- `app/Policies/ConversationPolicy.php`
- `app/Http/Controllers/InboxController.php`
- `resources/views/inbox/index.blade.php`
- `resources/views/inbox/create.blade.php`
- `resources/views/inbox/show.blade.php`
- `docs/MESSAGERIE-INTERNE-LIVRABLE.md` (ce fichier)

### Modifiés
- `app/Providers/AuthServiceProvider.php` – Enregistrement de `ConversationPolicy` pour le modèle `Conversation`
- `routes/web.php` – Import de `InboxController` et routes : `inbox.index`, `inbox.create`, `inbox.store`, `inbox.show`, `inbox.storeMessage`
- `resources/views/layouts/app.blade.php` – Lien « Messagerie » dans la sidebar et la barre d’icônes
- `resources/views/notifications/index.blade.php` – Lien « Voir la conversation » pour les notifications de type `inbox_message` (avec `data.conversation_id`)

---

## 5. Logique de sécurité appliquée

Toute la logique est **côté backend** ; le frontend ne fait qu’afficher ce que le backend autorise.

1. **Qui peut écrire à qui**  
   - `MessagingService::canSendTo(User $from, User $to)` : vérification via la matrice (rôle de `$from` → rôles autorisés pour `$to`).  
   - Utilisée dans : `InboxController::store()` (nouvelle conversation) et dans `ConversationPolicy::sendMessage()` (réponse dans une conversation), elle-même utilisée dans `InboxController::storeMessage()`.

2. **Qui peut lire quelle conversation**  
   - `MessagingService::canAccessConversation(User $user, Conversation $conversation)` : l’utilisateur doit être participant (`user1_id` ou `user2_id`).  
   - Utilisée dans : `ConversationPolicy::view()`, appelée par `InboxController::show()` via `$this->authorize('view', $conversation)`.

3. **Qui peut voir la liste des destinataires autorisés**  
   - `MessagingService::allowedRecipientsQuery(User $user)` : retourne une requête Eloquent des utilisateurs vers lesquels `$user` a le droit d’envoyer un message (hors soi-même).  
   - Utilisée dans : `InboxController::create()` pour la liste déroulante « Nouvelle conversation ». Un staff ne voit donc pas le directeur.

4. **Qui peut accéder à un fil de discussion**  
   - Route `GET messagerie/{conversation}` avec binding sur `Conversation`.  
   - Avant tout affichage : `$this->authorize('view', $conversation)` dans `show()`. Un accès par URL avec un `id` d’une conversation à laquelle l’utilisateur ne participe pas renvoie 403.

5. **Qui peut créer une nouvelle conversation / envoyer un message**  
   - Création : `store()` valide `recipient_id`, charge le destinataire, appelle `canSendTo($user, $recipient)` ; si false → 403.  
   - Envoi dans une conversation existante : `storeMessage()` appelle `$this->authorize('sendMessage', $conversation)` (policy qui vérifie participant + `canSendTo` vers l’autre). Aucun envoi possible vers un profil interdit.

Aucun contrôle uniquement côté interface : tout refus est fait en PHP (403 ou liste filtrée).

---

## 6. Preuve qu’un staff ne peut pas écrire au directeur

- Dans `MessagingService::ALLOWED_SEND_TO`, pour le rôle `staff`, le tableau autorisé est `['point_focal']`. Le rôle `director` n’y figure pas.  
- Donc `canSendTo($staffUser, $directorUser)` retourne `false`.  
- Lors de la création d’une conversation : `InboxController::store()` appelle `canSendTo($user, $recipient)` ; si l’utilisateur choisit un directeur (par exemple en forçant `recipient_id` dans la requête), la condition échoue et `abort(403, '...')` est exécuté.  
- Le formulaire « Nouvelle conversation » utilise `allowedRecipientsQuery($user)->get()` : un staff ne reçoit que les point focaux dans la liste ; le directeur n’apparaît pas.  
- Si un staff tente d’envoyer un message dans une conversation existante avec un directeur, `sendMessage` de la policy appelle `canSendInConversation`, qui appelle `canSendTo($user, $other)` : pour un directeur comme `$other`, c’est false → 403.

**Conclusion** : un staff ne peut ni créer une conversation avec un directeur ni lui envoyer de message ; le backend renvoie 403 et la liste des destinataires ne contient pas le directeur.

---

## 7. Preuve qu’un point focal peut écrire à tout le monde

- Dans `MessagingService::ALLOWED_SEND_TO`, pour le rôle `point_focal`, le tableau autorisé est `['staff', 'point_focal', 'director', 'super_admin']`.  
- Donc pour tout utilisateur dont le rôle est l’un de ceux-là, `canSendTo($pointFocalUser, $thatUser)` retourne `true`.  
- La liste des destinataires pour un point focal est `allowedRecipientsQuery($pointFocalUser)->get()` : elle inclut tous les utilisateurs (sauf lui-même) ayant un de ces rôles.  
- Création de conversation et envoi de message dans une conversation existante passent par `canSendTo` ou `canSendInConversation` : un point focal peut donc initier une conversation avec staff, point focal, directeur ou super_admin et leur répondre.

**Conclusion** : le point focal peut envoyer des messages à tous les profils définis dans la matrice (staff, point focal, directeur, super_admin).

---

## 8. Preuve qu’un utilisateur ne peut lire que ses propres conversations

- Liste des conversations : `InboxController::index()` utilise  
  `Conversation::query()->where('user1_id', $user->id)->orWhere('user2_id', $user->id)->...`  
  Donc seules les conversations dont l’utilisateur est participant sont retournées.  
- Ouverture d’une conversation : `InboxController::show($conversation)` appelle `$this->authorize('view', $conversation)`.  
  `ConversationPolicy::view()` appelle `MessagingService::canAccessConversation($user, $conversation)`, qui retourne true seulement si `$user->id` est `user1_id` ou `user2_id`.  
  Si un utilisateur modifie l’URL pour mettre l’id d’une conversation d’un autre (ex. `messagerie/123`), le binding charge la conversation 123 ; la policy vérifie qu’il est participant ; sinon → 403.  
- Les messages affichés dans `show()` sont ceux de `$conversation->messages` ; la conversation n’est chargée que si l’utilisateur a passé la policy. Il n’existe pas d’autre route exposant les messages d’une conversation par id sans cette autorisation.

**Conclusion** : un utilisateur ne peut voir que les conversations où il est participant ; l’accès par ID à une conversation d’un autre est refusé (403).

---

## Résumé des routes (messagerie)

| Méthode | URL                              | Nom de route          | Contrôle principal                          |
|--------|-----------------------------------|------------------------|---------------------------------------------|
| GET    | /messagerie                       | inbox.index            | Liste limitée à ses conversations           |
| GET    | /messagerie/nouvelle              | inbox.create           | Liste destinataires = allowedRecipientsQuery |
| POST   | /messagerie                       | inbox.store            | canSendTo( user, recipient )                 |
| GET    | /messagerie/{conversation}        | inbox.show             | authorize('view', conversation)              |
| POST   | /messagerie/{conversation}/messages | inbox.storeMessage   | authorize('sendMessage', conversation)      |

Les migrations `create_conversations_table` et `create_inbox_messages_table` ont été exécutées. Le module est intégré dans la navigation (sidebar + barre d’icônes) et les notifications de type `inbox_message` pointent vers la conversation concernée.
