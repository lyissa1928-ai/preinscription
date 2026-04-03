# Rapport des modifications – Interface et permissions

## 1. Gestion stricte des permissions (rôles)

### Règle appliquée
**Aucune fonctionnalité ou donnée non autorisée n’est rendue dans l’interface.** Les éléments interdits ne sont pas affichés (pas de simple désactivation visuelle).

### Menu (sidebar)
- **Staff** (affilié à un campus) : n’a que  
  **Tableau de bord**, **Demandes de matériel**, **Mon stock personnel**, **Guide utilisateur**.
- **Point focal / Directeur / Super Admin** : en plus **Enregistrer réception**, **Commandes groupées**, **Finances** (Budgets, Allocations), **Inventaire** (Stock, Actifs, Maintenance), **Analyse** (Tableau suivi logistique, Rapport mensuel, Statistiques).
- **Directeur / Super Admin** : en plus **Administration** (Campus, Utilisateurs, Paramètres).

Les blocs du menu (Finances, Inventaire, Analyse, Administration) sont rendus uniquement si l’utilisateur a le rôle adéquat.

### Tableau de bord (dashboard)
- **Staff** :
  - Ne voit qu’**un seul KPI** : Demandes de matériel (chiffres limités à son campus).
  - Pas de KPI Commandes, Budget, Stock faible.
  - Pas de section Alertes (globales).
  - Pas de bloc « À traiter » (commandes / validations).
  - Pas d’indicateurs analytiques, ni demandes par campus/statut, ni « En attente de validation ».
  - **Actions rapides** : uniquement « Nouvelle demande » et « Mon stock personnel ». Pas de « Créer une commande », « Nouveau budget », « Voir le stock ».
- **Point focal / Directeur / Super Admin** : voient toutes les sections et KPIs habituels.

Les données côté backend restent filtrées par rôle (ex. `getRequestStats($campus)` pour le staff, activités récentes filtrées sur ses demandes).

### Pages et API
- Les contrôleurs (Analytics, CampusMonthlyReport, LogistiqueDashboard, AggregatedOrder, Budget, Stock, etc.) vérifient le rôle et renvoient **403** si l’accès est interdit.
- Un staff qui tente d’accéder par URL à une page non autorisée (ex. `/analytics`, `/rapports/rapport-mensuel-campus`) reçoit une erreur 403.

---

## 2. Correction des graphiques du dashboard (Statistiques)

### Problème
Les graphiques (Chart.js) dans la page **Statistiques par campus** (`/analytics`) pouvaient déborder de leur conteneur et casser la mise en page.

### Modifications
- Chaque graphique est placé dans un **conteneur dédié** (`.chart-container`) avec :
  - `height: 280px`
  - `max-height: 100%`
  - `min-height: 200px`
  - `overflow: hidden`
- Les canvas Chart.js ont `maintainAspectRatio: false` et prennent la taille du conteneur.
- Règles CSS ajoutées : `.chart-container canvas { max-width: 100% !important; max-height: 280px !important; }` pour éviter tout débordement.

### Layout global
- Sur le **layout principal** (`layouts/app.blade.php`) :
  - `.content-wrapper` et `.main-content` ont `overflow-x: hidden` et `max-width: 100%` pour **éviter tout scroll horizontal** sur la plateforme.

---

## 3. Refonte visuelle des guides

### Structure de page (alignée sur le modèle fourni)
- **Titre principal centré** : « Guide des procédures ».
- **Sous-titre explicatif** : rappel du profil et invitation à cliquer sur une carte.
- **Bouton d’action principal** : « Parcourir les procédures » (lien d’ancrage vers la section des procédures).

### Section procédures
- Chaque procédure est affichée dans une **carte** contenant :
  - **Titre** de la procédure
  - **Description courte**
  - **Acteurs concernés**
  - **Livrable**
  - **Bouton « Voir les détails »** (ouverture de l’offcanvas)
- Les cartes sont **colorées** (bordure et icône selon le type), **arrondies** (`rounded-3`), **espacées** (`g-4`), avec effet au survol.

### Composants créés
- **`components/guide-page.blade.php`** (layout GuidePage)  
  Props : `title`, `subtitle`, `mainButtonUrl`, `mainButtonLabel`, `mainButtonIcon`. Affiche le bandeau titre + sous-titre + bouton, puis le slot (contenu).
- **`components/procedure-card.blade.php`** (ProcedureCard)  
  Props : `title`, `description`, `acteurs`, `livrable`, `icon`, `color`, `steps`. Carte cliquable qui ouvre l’offcanvas et transmet les données pour la démo.
- La page **`guide/index.blade.php`** utilise ces composants et un **offcanvas** pour le détail + bouton « Lancer la démo » (Driver.js).

### Données
- Dans **GuideController**, un champ **livrable** a été ajouté pour chaque procédure (ex. « Demande créée et soumise pour validation », « Commande fournisseur créée et confirmée »).

---

## 4. Style graphique et uniformisation

- **Cartes** : coins arrondis (`rounded-3`), ombre légère, bordure gauche colorée sur les cartes de procédure.
- **Couleurs** : palette cohérente (primary, success, info, warning, danger) pour les icônes et boutons.
- **Boutons** : bien visibles, arrondis (`rounded-2` / `rounded-3`), avec icônes.
- **Hiérarchie** : titre de page centré, sous-titre, puis cartes en grille responsive (1 colonne mobile, 2 tablette, 3 desktop).

---

## 5. Fichiers modifiés ou créés

| Fichier | Action |
|--------|--------|
| `resources/views/layouts/app.blade.php` | Menu conditionnel par rôle ; Administration pour director + super_admin ; Analyse pour director + point_focal + super_admin ; overflow-x + max-width sur content-wrapper / main-content |
| `resources/views/dashboard.blade.php` | KPIs, alertes, sections analytiques, « À traiter », « En attente de validation » et actions rapides affichés uniquement pour les rôles autorisés (pas pour staff seul) |
| `resources/views/analytics/index.blade.php` | Conteneur `.chart-container` à hauteur fixe pour chaque graphique ; section `@section('styles')` pour limiter le débordement des canvas |
| `resources/views/guide/index.blade.php` | Refonte complète : utilisation de `<x-guide-page>` et `<x-procedure-card>`, structure titre / sous-titre / bouton / grille de cartes, offcanvas et script Driver.js |
| `resources/views/components/guide-page.blade.php` | **Créé** – Layout des pages de guide |
| `resources/views/components/procedure-card.blade.php` | **Créé** – Carte de procédure (titre, description, acteurs, livrable, bouton « Voir les détails ») |
| `app/Http/Controllers/GuideController.php` | Ajout du champ `livrable` dans `buildProceduresForRole` |

---

## 6. État des lieux du système

- **Permissions** : le menu, le tableau de bord et les pages ne montrent que ce que le rôle permet ; les contrôleurs renvoient 403 en cas d’accès non autorisé.
- **Graphiques** : contenus dans des blocs à hauteur fixe, sans débordement ; pas de scroll horizontal au niveau du layout.
- **Guides** : même structure (titre centré, sous-titre, bouton principal, cartes procédures avec titre, description, acteurs, livrable, « Voir les détails »), avec composants réutilisables.
- **Style** : cartes arrondies, couleurs harmonisées, boutons et icônes lisibles, rendu cohérent sur les pages modifiées.
