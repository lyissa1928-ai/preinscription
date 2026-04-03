## Design system - Gestion Scolaire

- **Couleurs principales** : `primary` (#2563EB), `success` (#16A34A), `warning` (#F59E0B), `danger` (#DC2626), `neutral` (gamme slate).
- **Radii** : `--radius-md` (0.75rem), `--radius-lg` (1rem).
- **Ombres** : `--shadow-soft` pour les cards et panneaux.
- **Typographie** : Geist Sans (titres, texte), hiérarchie forte pour `h1`/`h2`, corps en 14px–16px.

### Composants de base

- **PageHeader** : en haut de chaque page, avec titre, description et actions (boutons).
- **Card** : conteneur de section (`bg-white`, bord arrondi, ombre légère, padding confortable).
- **Button** : variantes `primary`, `secondary`, `ghost`, `danger` avec états hover/focus/disabled cohérents.
- **BadgeStatus** : badge arrondi pour tous les statuts (inscriptions, paiements, dossier étudiant, etc.).
- **EmptyState** : état vide avec icône, message et CTA optionnel.
- **Spinner** : indicateur de chargement centré avec label optionnel.

### Règles UI/UX

- Chaque page métier utilise `PageHeader` + au moins une `Card` principale.
- Les tableaux sont contenus dans une `Card` avec toolbar (recherche + filtres) et pagination côté client quand nécessaire.
- Les formulaires indiquent les champs obligatoires par `*`, ont un bouton principal clair (`Button primary`) et affichent les erreurs via `ToastContext`.
- Toutes les actions d’écriture (POST/PATCH/DELETE) déclenchent un toast succès/erreur et rafraîchissent les données de la page.
- Les champs en lecture seule sont désaturés (fond `bg-slate-50`, texte `text-slate-700`) et explicités par un texte d’aide.

