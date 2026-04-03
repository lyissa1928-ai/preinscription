# Audit : doublons par profil, sécurité du code, exposition en production

**Projet :** gestion-stock-btp (ESEBAT Logistique & Budget)  
**Date :** mars 2025  
**Périmètre :** analyse du code (routes, contrôleurs, policies, vues, config), sans modification de la logique métier.

---

# PARTIE A — DOUBLONS ET REDONDANCES PAR PROFIL

## A.1 Méthode

- Inventaire des routes et des entrées de menu (sidebar + mini) par rôle.
- Comparaison des écrans et actions accessibles (controller + policy).
- Identification des doublons fonctionnels (même chose sous des noms différents, mêmes actions à plusieurs endroits).

## A.2 Rôles audités

| Rôle | Périmètre | Menu visible (résumé) |
|------|-----------|------------------------|
| **Staff** | Un campus | Tableau de bord, Demandes, Mon stock, (Stock de mon campus si permission), Maintenance « Mes tickets », Guide |
| **Point focal** | Global | Opérations + Stock et référentiel + Budgets (lecture) + Analyse (suivi logistique, rapport mensuel, stats) ; pas Actifs, pas Administration |
| **Directeur** | Global | Tout sauf partie super_admin si différenciée (identique au super_admin dans le code) |
| **Super Admin** | Global | Menu complet (Opérations, Stock, Finances, Inventaire, Analyse, Administration, Aide) |

## A.3 Fonctionnalités réellement utiles par profil

- **Staff :** Tableau de bord (mes indicateurs, mes demandes), Demandes de matériel (créer, suivre, soumettre), Mon stock (reçus, sorties, restant), Mes tickets de maintenance, Guide. Optionnel : Stock de mon campus (si permission `stock.view_campus`).
- **Point focal :** Tout ce que fait le staff (en lecture/validation sur les demandes des campus) + Commandes groupées (créer, confirmer, réceptionner, annuler), Stock et référentiel (référentiel, stock, réceptions, stock par staff), Budgets en lecture, Tableau suivi logistique, Rapport mensuel, Statistiques, Maintenance (suivi).
- **Directeur / Super Admin :** Tout du point focal + approbation demandes (pending_director), Budgets (créer, approuver, activer), Tableau de bord budgétaire, Allocations, Actifs, Maintenance (assignation, clôture), Campus, Utilisateurs, Paramètres.

## A.4 Doublons et redondances identifiés

### Menus / pages

| Élément | Détail | Profil(s) | Verdict |
|--------|--------|-----------|--------|
| **Stock et référentiel** vs **Référentiel matériel** | « Stock et référentiel » est une page hub (liens vers Référentiel matériel, Stock/Inventaire, Stock par staff, Enregistrer réception). « Référentiel matériel » est une page distincte (catalogue, catégories, gestion). Pas doublon : hub vs détail. | PF, Dir, Admin | Aucune fusion nécessaire. |
| **Stock dashboard** vs **Stock index** | `stock.dashboard` et `stock.index` : le premier est le tableau de bord stock (KPIs, alertes), le second liste/accès au stock. Routes différentes, usages différents. | PF, Dir, Admin | Pas doublon. |
| **Tableau de bord** vs **Tableau suivi logistique** vs **Statistiques** | Dashboard = accueil global ; Suivi logistique = vue DG demandes/commandes ; Statistiques = analytics par campus. Trois vues distinctes. | Tous / PF+ / PF+ | Pas doublon ; noms différents assumés. |
| **Mon stock** vs **Stock par staff** | Mon stock = stock personnel du connecté ; Stock par staff = vue agrégée par membre du staff (PF/dir). Pas doublon. | Staff vs PF+ | OK. |

### Actions en doublon

- **Aucune action métier strictement en doublon** identifiée : les actions (soumettre, approuver, réceptionner, etc.) sont attachées à une ressource (demande, commande, budget) et à un écran cohérent.
- **Recherche globale** : une seule entrée (topbar), un seul contrôleur (SearchController). Pas de doublon.

### Écrans qui « font la même chose sous un autre nom »

- Aucun. Les intitulés « Tableau de bord », « Tableau suivi logistique (DG) », « Tableau de bord budgétaire » désignent des contenus différents (accueil, suivi logistique, budgets).

### Permissions trop larges ou répétées

- **Routes :** toutes les routes web sont dans un groupe `middleware(['web', 'auth'])`. Aucun middleware par rôle au niveau des routes ; les contrôles sont dans les contrôleurs (middleware closure ou `hasAnyRole` / `authorize`). Cohérent mais à maintenir dans chaque contrôleur.
- **Permission `stock.view_campus` (staff) :** déjà documentée dans l’audit fonctionnel : soit on expose « Stock de mon campus » (fait dans le menu sous condition), soit on retire la permission. Actuellement le lien est affiché si la permission existe ; pas de doublon de permission.

## A.5 Suppressions / fusions proposées

- **Aucune suppression de page ou de menu** recommandée : pas de doublon fonctionnel avéré.
- **Simplification possible (optionnelle) :** regrouper sous « Analyse » les trois entrées (Tableau suivi logistique, Rapport mensuel, Statistiques) sans en supprimer aucune — déjà le cas dans le menu.

## A.6 Modifications réellement effectuées (Partie A)

- **Aucune** : l’audit n’a pas mis en évidence de doublon à supprimer ou à fusionner. Les incohérences déjà signalées (recherche staff, menu Maintenance, stock campus) ont été traitées ou documentées dans `AUDIT-FONCTIONNEL-PAR-PROFIL.md`.

---

# PARTIE B — AUDIT DE SÉCURITÉ

## B.1 Contrôles d’accès

| Faille / point | Gravité | Fichiers concernés | Correction proposée / appliquée |
|----------------|---------|---------------------|----------------------------------|
| **Routes non protégées par rôle** | Moyenne | `routes/web.php` | Toutes les routes sont sous `auth`. Aucune route publique (hors login/logout). Pas de middleware par rôle sur les routes ; autorisation dans chaque contrôleur. **Vérifié** : Campus, Users, Settings, Analytics, LogistiqueDashboard, CampusMonthlyReport, Designation, Category, StockReferentiel, Budget, BudgetAllocation, Asset, MaintenanceTicket, AggregatedOrder (confirm/receive/cancel), MaterialRequest (transmit, directorApprove, etc.), PersonalStock (réception) ont des contrôles explicites. |
| **Référentiel matériel accessible à tout authentifié** | Faible | `ReferentielController.php` | Avant : tout utilisateur authentifié pouvait accéder à `/referentiel-materiel` (catalogue en lecture). **Correction appliquée :** redirection vers dashboard avec message si l’utilisateur n’a pas le rôle point_focal, director ou super_admin. |
| **IDOR sur endpoint getAvailable (request_items)** | Élevée | `RequestItemController::getAvailable` | L’endpoint utilisait `request_id` en entrée et chargeait la `MaterialRequest` sans vérifier si l’utilisateur peut y accéder. **Correction appliquée :** `$this->authorize('update', $materialRequest)` avant utilisation. |
| **Policies manquantes** | — | — | Policies présentes pour MaterialRequest, AggregatedOrder, Budget, BudgetAllocation, Asset, MaintenanceTicket. Pas de policy pour Campus, User, Setting, Category, Designation : l’accès est restreint par middleware/closure dans les contrôleurs. Acceptable si cohérent partout. |

## B.2 Validation des entrées

| Point | Constat | Fichiers |
|-------|--------|----------|
| **Form Request** | Utilisés pour : StoreMaterialRequestRequest, StoreRequestItemRequest, UpdateRequestItemRequest, CreateAggregatedOrderRequest, RecordOrderReceiptRequest, AllocateBudgetRequest, RecordExpenseRequest, StoreUserRequest, UpdateUserRequest. | `app/Http/Requests/*` |
| **Validation inline** | BudgetController (store, addAmount, approve, activate), CategoryController, CampusController, SettingsController, MaterialRequestController (reject, treatment notes, store storage, participants), AssetController, MaintenanceTicketController, UserController (batch), PersonalStockController, DesignationController : `$request->validate(...)` utilisé. | Divers contrôleurs |
| **Risque d’injection** | Requêtes utilisant Eloquent et paramètres bindés ; pas de requête SQL brute avec concaténation utilisateur. Recherche (SearchController, ReferentielController) : `like` avec `%$term%` — le terme vient de l’utilisateur ; à limiter en longueur (déjà minLength 2 en recherche). | SearchController, ReferentielController |
| **Upload de fichiers** | Aucun upload de fichier utilisateur identifié dans les contrôleurs audités. | — |
| **Paramètres URL** | `tab` dans ReferentielController : `in_array($tab, ['catalogue', 'categories', 'gestion'], true)` — validé. | ReferentielController |

## B.3 Failles applicatives

| Risque | Présence | Détail / correction |
|--------|----------|---------------------|
| **XSS** | Mitigé | Vues Blade avec échappement par défaut (`{{ }}`). Vérifier les rares `{!! !!}` : à réserver au contenu de confiance. |
| **CSRF** | Mitigé | Middleware `web` actif (Laravel) ; formulaire login et formulaires app avec `@csrf`. Gestion 419 (TokenMismatchException) : redirection vers login avec message. |
| **SQL injection** | Mitigé | Utilisation Eloquent / requêtes préparées. Aucune concaténation SQL brute avec entrée utilisateur. |
| **IDOR** | Corrigé | IDOR sur `getAvailable` (demande par id) corrigée par `authorize('update', $materialRequest)`. NotificationController : vérification `notification->user_id === request->user()->id` sur markAsRead. |
| **Mass assignment** | Mitigé | Modèles avec `$fillable` définis ; création/MAJ via `$request->validated()` ou champs explicites. |
| **Élévation de privilèges** | Mitigé | Chaque action sensible vérifie le rôle (hasAnyRole) ou la policy (authorize). Aucune élévation identifiée. |
| **Erreurs verbeuses en prod** | À configurer | `.env.example` contient `APP_DEBUG=true`. En production : `APP_DEBUG=false`, `APP_ENV=production`. Rappel ajouté dans `.env.example`. |
| **Endpoints dev/test** | Aucun | Pas de route type `/tinker`, `/debug` ou `/test` exposée dans `web.php`. Health check `/up` : standard Laravel. |
| **Credentials / secrets** | Bonnes pratiques | Pas de clé en dur dans le code ; `.env` pour APP_KEY, DB_*, etc. |

## B.4 Session / authentification

| Point | Constat |
|-------|--------|
| **Session** | `SESSION_DRIVER=database`, `SESSION_LIFETIME=120`, `SESSION_ENCRYPT=false`. Pour la production, envisager SESSION_SECURE_COOKIE=true (HTTPS) et SESSION_SAME_SITE=lax (ou strict). |
| **Déconnexion** | `invalidate()`, `regenerateToken()` appelés dans AuthenticatedSessionController::destroy. Complet. |
| **Brute force login** | **Correction appliquée :** middleware `throttle:5,1` sur la route POST `login` (5 tentatives par minute). |

## B.5 Résumé des corrections appliquées (Partie B)

1. **RequestItemController::getAvailable** : ajout de `$this->authorize('update', $materialRequest)` pour supprimer l’IDOR.
2. **ReferentielController::index** : redirection des utilisateurs sans rôle point_focal/director/super_admin vers le dashboard.
3. **routes/auth.php** : ajout de `->middleware('throttle:5,1')` sur la route POST login.
4. **.env.example** : commentaire rappelant APP_ENV=production et APP_DEBUG=false en production.

---

# PARTIE C — RÉDUCTION DE L’EXPOSITION EN PRODUCTION

## C.1 Ce qui rend l’application visible ou trop exposée

- **Pages indexables :** sans contre-mesure, le formulaire de login et éventuellement des URLs de l’app (si crawlé malgré auth) peuvent être indexées.
- **Pas de robots.txt** : les moteurs pouvaient tenter de crawler toute l’application.
- **Pas de balise noindex** sur la page de connexion ni sur le layout applicatif.
- **Bannière / headers serveur :** non audités (dépend du serveur web) ; à désactiver en prod (ex. ServerTokens Prod pour Apache).

## C.2 Mesures mises en place

| Mesure | Fichier / lieu | Détail |
|--------|----------------|--------|
| **robots.txt** | `public/robots.txt` | `User-agent: *` et `Disallow: /` pour désindexer l’ensemble du site. |
| **noindex sur login** | `resources/views/auth/login.blade.php` | `<meta name="robots" content="noindex, nofollow">`. |
| **noindex sur layout app** | `resources/views/layouts/app.blade.php` | Même balise dans le `<head>` pour toutes les pages du tableau de bord. |
| **Rappel production .env** | `.env.example` | Commentaire indiquant de mettre APP_ENV=production, APP_DEBUG=false et APP_URL en HTTPS. |

## C.3 Limites de ces mesures

- **robots.txt** et **noindex** : respectés par les moteurs « honnêtes » ; ils ne protègent pas contre un accès direct par URL ni contre des scanners ciblés.
- **Réduction d’exposition** ≠ **sécurité** : l’authentification, les autorisations et la configuration serveur (HTTPS, headers de sécurité, pas de debug en prod) restent indispensables.
- **Filtrage IP / renforcement admin** : non mis en œuvre dans ce lot ; à envisager au niveau serveur ou reverse proxy si besoin.

---

# ANALYSE DES TYPES D’ATTAQUES

Pour chaque risque, état dans le projet actuel, gravité et correction (ou statut).

| Attaque | Présence du risque | Pourquoi | Gravité | Correction / statut |
|---------|--------------------|----------|---------|----------------------|
| **Brute force login** | Oui (avant correctif) | Pas de limite de tentatives sur le formulaire de connexion. | Élevée | Throttle 5 req/min sur POST login appliqué. |
| **Credential stuffing** | Partielle | Même throttle limite les tentatives ; pas de 2FA. | Moyenne | Throttle en place ; 2FA hors périmètre. |
| **XSS** | Faible | Blade échappe par défaut. | Faible | Vérifier les `{!! !!}` si usage. |
| **CSRF** | Faible | Middleware CSRF + @csrf sur formulaires. | Faible | Aucun correctif supplémentaire. |
| **SQL injection** | Faible | Eloquent / requêtes préparées. | Faible | Aucun correctif. |
| **IDOR** | Oui (avant correctif) | getAvailable exposait les données d’une demande sans vérifier l’accès. | Élevée | authorize('update', $materialRequest) ajouté. |
| **Session hijacking** | Mitigée | Session régénérée à la connexion ; déconnexion complète. | Moyenne | En prod : HTTPS + cookies sécurisés recommandés. |
| **Élévation de privilèges** | Non identifiée | Contrôles par rôle et policies. | — | — |
| **Upload malveillant** | N/A | Pas d’upload fichier dans l’audit. | — | — |
| **Énumération d’utilisateurs** | Partielle | Message login « Les identifiants ne correspondent à aucun compte » ne distingue pas email inconnu / mot de passe faux. | Faible | Comportement actuel acceptable. |
| **Fuite d’info via erreurs** | En dev | APP_DEBUG=true en .env.example. | Moyenne | Rappel prod dans .env.example ; en prod APP_DEBUG=false. |
| **Scan des routes** | Partielle | Toutes les routes sous auth ; pas de listing. | Faible | Pas de correctif spécifique. |
| **Accès fichiers sensibles** | Faible | Pas de stockage de secrets dans public/. | Faible | — |
| **Scraping pages publiques** | Faible | Seule page publique : login ; noindex + robots.txt. | Faible | Mesures appliquées. |
| **Abus formulaires / spam d’actions** | Partielle | Throttle global Laravel ; pas de throttle spécifique sur actions sensibles (ex. création demande). | Moyenne | À envisager si abus constaté (ex. throttle par user sur certaines actions). |
| **Détournement permissions métier** | Faible | Policies et hasAnyRole cohérents. | Faible | — |

---

# FICHIERS INSPECTÉS

- **Routes :** `routes/web.php`, `routes/auth.php`
- **Contrôleurs :** DashboardController, SearchController, MaterialRequestController, RequestItemController, AggregatedOrderController, BudgetController, BudgetAllocationController, StockController, StockReferentielController, ReferentielController, AssetController, MaintenanceTicketController, CampusController, UserController, SettingsController, AnalyticsController, LogistiqueDashboardController, CampusMonthlyReportController, DesignationController, CategoryController, PersonalStockController, GuideController, NotificationController, Auth\AuthenticatedSessionController
- **Policies :** MaterialRequestPolicy, AggregatedOrderPolicy, BudgetPolicy, BudgetAllocationPolicy, AssetPolicy, MaintenanceTicketPolicy
- **Vues :** `layouts/app.blade.php`, `auth/login.blade.php`, `stock-referentiel/index.blade.php`
- **Config / env :** `.env.example`, `bootstrap/app.php`
- **Modèles :** User (fillable, hidden, casts)

---

# FICHIERS MODIFIÉS

| Fichier | Modification |
|---------|--------------|
| `app/Http/Controllers/RequestItemController.php` | Autorisation `update` sur la MaterialRequest dans `getAvailable` (anti-IDOR). |
| `app/Http/Controllers/ReferentielController.php` | Redirection vers dashboard si l’utilisateur n’a pas les rôles point_focal/director/super_admin. |
| `routes/auth.php` | Middleware `throttle:5,1` sur la route POST login. |
| `resources/views/auth/login.blade.php` | Balise `<meta name="robots" content="noindex, nofollow">`. |
| `resources/views/layouts/app.blade.php` | Balise `<meta name="robots" content="noindex, nofollow">` dans le head. |
| `public/robots.txt` | Création : `User-agent: *` et `Disallow: /`. |
| `.env.example` | Commentaire pour production (APP_ENV, APP_DEBUG, APP_URL). |

---

# SUPPRESSIONS / FUSIONS RÉALISÉES

- **Aucune** suppression de fonctionnalité ni fusion de pages (audit doublons sans doublon à fusionner).

---

# PROTECTIONS AJOUTÉES

- Throttle sur le login (5 tentatives par minute).
- Autorisation sur l’endpoint getAvailable (request_items) pour éviter l’IDOR.
- Restriction d’accès au référentiel matériel (uniquement point_focal, director, super_admin).
- robots.txt et noindex sur login + layout app pour réduire l’indexation.
- Rappel de configuration production dans .env.example.

---

# RISQUES RESTANTS

1. **Session / cookies en production** : configurer HTTPS, SESSION_SECURE_COOKIE, SESSION_SAME_SITE selon la doc Laravel et l’hébergeur.
2. **Headers de sécurité** : X-Frame-Options, X-Content-Type-Options, etc. à configurer au niveau serveur ou middleware (hors périmètre de ce document).
3. **Throttle sur actions sensibles** : si besoin, ajouter des limites (ex. création de demandes, exports) par utilisateur.
4. **Logs et niveau de détail** : en production, éviter LOG_LEVEL=debug et limiter les données sensibles dans les logs.
