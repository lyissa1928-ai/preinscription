## UI changelog

### Design global & module Apparence

- **Dashboard Admin** refondu avec `PageHeader`, `Card` et `NavCard` : sections « Accès par domaine », « Indicateurs », « Admin — Gouvernance, vigilance, paramètres » avec grilles homogènes et liens clairs. Lien « Apparence & Thème » ajouté pour SUPER_ADMIN.
- **Composant `NavCard`** : lien stylé type card (variantes blue, emerald, amber, red, default) avec badge optionnel.
- **Module Apparence & Thème** (SUPER_ADMIN uniquement) :
  - Backend : table `AppSettings` (Prisma), `AppearanceModule` avec `GET /appearance/settings` (public) et `PATCH /appearance/settings` (SUPER_ADMIN), audit sur mise à jour.
  - Frontend : `ThemeProvider` charge le thème au démarrage et applique les variables CSS (`--color-primary`, `--background`, etc.) et le favicon ; page `/dashboard/admin/settings/appearance` pour modifier logos, favicon et couleurs, avec bouton « Activer ce thème » et application immédiate sans rechargement complet.
- **Documentation** : `docs/theme-customization.md` pour la personnalisation du thème.

### Refactor inscriptions (Scolarité)

- Introduction d'un mini design-system (`PageHeader`, `Card`, `Button`, `BadgeStatus`, `EmptyState`, `Spinner`) dans `frontend/src/components/ui`.
- Page `Scolarité → Inscriptions` mise à jour pour utiliser ces composants : header clair, formulaire dans une card deux colonnes, toolbar de tableau (recherche + filtres formation/année/statut), badges de statut et pagination.
- Année universitaire affichée comme champ en lecture seule stylé, basée sur la maquette sélectionnée.
- États vides améliorés avec message explicite et CTA "Nouvelle inscription".
- Remplacement des `alert()` par des toasts (`ToastContext`) pour les succès/erreurs d'API.

