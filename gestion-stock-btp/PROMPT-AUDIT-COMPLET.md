# Prompt : Audit complet du projet (incohérences, manques, doublons, affichage)

**À utiliser tel quel** : copier ce bloc dans une nouvelle conversation Cursor, ou invoquer ce fichier avec `@PROMPT-AUDIT-COMPLET.md`, pour forcer un audit systématique et des corrections en profondeur.

---

## Instruction principale

Tu dois **identifier et réparer** tous les problèmes suivants en **explorant en profondeur** les répertoires et fichiers du projet. Tu ne dois **pas te limiter** à la surface : tu dois parcourir le code, les vues, les routes, les modèles et les contrôleurs de manière méthodique.

### 1. Incohérences à identifier

- **Nommage** : incohérences entre contrôleurs, routes, vues, noms de variables (ex. `request` vs `materialRequest`, `item` vs `designation`).
- **Rôles et permissions** : endroits où les rôles (staff, point_focal, director, super_admin) sont vérifiés différemment (hasRole, hasAnyRole, can(), policy) ou où l’affichage ne respecte pas les droits.
- **Données** : champs utilisés en base vs affichés en vue (ex. `unit_cost` vs `unit_price`, `stock_quantity` vs autre libellé).
- **Références croisées** : liens entre modèles (relations Eloquent), noms de clés étrangères, cohérence entre `route()`, noms de routes et contrôleurs.
- **Messages et textes** : incohérences de libellés (français/anglais), messages d’erreur ou de succès qui ne correspondent pas à l’action.
- **Statuts et états** : valeurs de statut (draft, submitted, delivered, etc.) utilisées de façon incohérente entre contrôleurs, vues et modèles.

### 2. Manques d’information (coquis / trous)

- **Vues** : variables utilisées dans les Blade (`$variable`) mais non passées par le contrôleur ; `@if` sur des propriétés inexistantes ; liens `route()` avec des paramètres manquants.
- **Formulaires** : champs requis en base ou en validation non présents dans le formulaire ; `old()` ou erreurs de validation non affichés.
- **Sécurité** : actions sans `authorize()` ou sans vérification de rôle ; formulaires sans `@csrf` ; champs sensibles affichés (prix, données d’autres campus) pour des rôles qui ne devraient pas les voir.
- **Documentation** : commentaires obsolètes, docblocks ne décrivant pas les paramètres ou le comportement réel.
- **Erreurs** : cas non gérés (données null, collections vides, 404) sans message ou redirection adaptée.

### 3. Doublons à repérer

- **Code dupliqué** : même logique répétée dans plusieurs contrôleurs ou vues (ex. calcul de stock, formatage de nombre, vérification de rôle).
- **Vues / partials** : blocs HTML ou tableaux identiques dans plusieurs fichiers au lieu d’un composant ou d’un `@include`.
- **Routes** : routes redondantes ou deux chemins menant à la même action sans nécessité.
- **Textes** : mêmes chaînes en dur à plusieurs endroits au lieu de langues ou de constantes.
- **Règles de validation** : mêmes règles répétées dans plusieurs Form Request ou contrôleurs.

### 4. Problèmes d’affichage et de fonctionnalité

- **Affichage** : colonnes ou champs affichés pour un rôle alors qu’ils ne devraient pas l’être (ex. prix pour le staff) ; tableaux vides sans message ; pagination ou filtres qui ne fonctionnent pas.
- **Liens et boutons** : liens cassés, `route()` avec mauvais nom ou paramètres ; boutons visibles alors que l’action est interdite (sans désactivation ou masquage).
- **Formulaires** : `action` ou `method` incorrects ; `name` des champs ne correspondant pas à ce qu’attend le contrôleur ; upload sans `enctype="multipart/form-data"`.
- **JavaScript** : scripts inline ou externes qui supposent des sélecteurs ou des `data-*` absents ; erreurs console possibles.
- **Responsive / accessibilité** : éléments critiques (tableaux, formulaires) non utilisables ou illisibles sur petit écran ou sans structure sémantique.

---

## Méthode obligatoire (profondeur)

1. **Parcourir la structure**  
   Lister les répertoires pertinents : `app/Http/Controllers`, `app/Models`, `app/Policies`, `routes`, `resources/views`, `database/migrations`, et tout dossier métier.

2. **Croiser les références**  
   Pour chaque fonctionnalité majeure (demandes de matériel, stock, référentiel, budgets, stock personnel, utilisateurs, etc.) :
   - Vérifier la route → le contrôleur → la méthode → les variables passées à la vue.
   - Vérifier la vue : toutes les variables utilisées sont-elles fournies ? Les noms de champs correspondent-ils à la validation ?
   - Vérifier le modèle : fillable, casts, relations, accesseurs utilisés dans les vues.

3. **Comparer par rôle**  
   Pour chaque rôle (staff, point_focal, director, super_admin), vérifier que :
   - Le menu (sidebar/nav) n’affiche que les entrées autorisées.
   - Les pages accessibles n’affichent pas de données interdites (prix, autres campus, etc.).
   - Les actions (boutons, formulaires) sont bien protégées côté serveur (policy ou vérification de rôle).

4. **Liste de contrôle par type de fichier**  
   - **Contrôleurs** : authorize, validation, passage de variables à la vue, redirections, messages flash.
   - **Vues Blade** : @csrf, route(), old(), @error, variables existantes, pas de prix pour le staff.
   - **Modèles** : fillable à jour, relations définies, pas d’accès direct à des colonnes supprimées.
   - **Routes** : nommage cohérent, middleware, paramètres attendus.

5. **Réparer**  
   Pour chaque problème trouvé : proposer et **appliquer** une correction concrète (modification de fichier), pas seulement une liste de recommandations. Si une modification est ambiguë, choisir la solution la plus cohérente avec le reste du projet et indiquer le choix.

---

## Livrable attendu

En fin d’audit, produire :

1. **Rapport structuré** (Markdown ou liste) avec :
   - Incohérences (avec fichier/ligne ou extrait de code).
   - Manques (variable manquante, champ manquant, autorisation manquante, etc.).
   - Doublons (fichiers et extraits concernés).
   - Problèmes d’affichage / fonctionnalité (page, rôle, description).

2. **Modifications effectuées** : liste des fichiers modifiés et résumé des corrections.

3. **Points laissés volontairement** : tout ce que tu n’as pas corrigé (avec raison : impact trop large, décision métier à valider, etc.).

---

## Rappel

- **Ne pas se limiter** aux fichiers déjà ouverts ou aux premiers résultats de recherche.
- **Ouvrir et lire** les fichiers des répertoires listés pour vérifier les variables, les noms de champs et les autorisations.
- **Réparer** chaque problème identifié sauf si une raison explicite empêche la modification.
