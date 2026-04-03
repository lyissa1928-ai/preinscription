# Refonte visuelle premium — Template DEVORYN + Dashboard Design Idea

**Projet :** gestion-stock-btp (ESEBAT Logistique & Budget)  
**Objectif :** Montée en gamme visuelle fidèle au template (sidebar premium, topbar moderne, grille dashboard, cartes haut de gamme) sans toucher au backend.

---

## 1. Ce qui a été repris du template

| Élément template | Application dans le projet |
|------------------|----------------------------|
| **Design tokens** | `esebat-dashboard-template.css` : `--radius-*`, `--shadow-*`, `--glass-*`, `--space-*` pour cohérence (rayons, ombres, espacements). |
| **Zone principale** | Fond en dégradé selon thème (orange / bleu / vert), padding généreux (`--space-page`), effet immersif. |
| **Grille dashboard** | `.dashboard-grid`, `.dashboard-grid.has-aside` (colonne principale + aside 340px), `.dashboard-main`, `.dashboard-aside` (sticky). |
| **Topbar premium** | Min-height 72px, blur 24px, recherche grande (padding 14px 20px, radius 16px), ombre et bordure renforcées, titre 1.35rem. |
| **Sidebar** | 260px, dégradé thème, `.nav-link` avec `border-left` 3px sur actif, `.nav-section-title` uppercase + letter-spacing, brand et espacements. |
| **Sidebar-mini** | 64px, boutons 44px, état actif avec glow (couleur thème). |
| **Cartes** | Radius 24px, ombres multiples + inset, glass, `.card-header` en dégradé léger, padding 28px 32px. |
| **KPI** | Radius 24px, padding 28px, icône 56px, hover `translateY(-6px)`, ombre renforcée. |
| **Boutons, badges, formulaires, modals, tableaux** | Alignés sur les tokens (rayons, ombres, espacements). |

Tous les sélecteurs du template sont préfixés par `#dashboard-layout` pour ne s’appliquer qu’au layout dashboard.

---

## 2. Conservation de l’identité ESEBAT

- **Couleurs** : variables `--theme-primary`, `--theme-primary-hover`, `--theme-primary-dark` selon `.theme-orange`, `.theme-blue`, `.theme-green` (ESEBAT). Orange par défaut (#F97316), bleu (#2563eb), vert (#16a34a).
- **Typographie** : police existante conservée ; titres et sous-titres renforcés (font-weight, letter-spacing) dans le template.
- **Logo / brand** : inchangés (sidebar brand, topbar logo).
- **Contenu et libellés** : aucun changement métier ; seuls le layout, les espacements, les ombres et les rayons ont été transformés.

---

## 3. Fichiers modifiés (frontend uniquement)

| Fichier | Modification |
|---------|--------------|
| `public/css/esebat-dashboard-template.css` | Refonte complète : tokens, zone principale, grille, topbar, sidebar, sidebar-mini, cartes, KPI, formulaires, modals, alertes, tableaux, responsive. |
| `resources/views/layouts/app.blade.php` | Réduction du bloc `<style>` inline : suppression des règles doublons (sidebar, topbar, card, card-header, kpi-card, page-hero, table, form, btn, nav-section-title, dashboard-section-title). Conservation : variables thème, structure `.dashboard-layout` / `.content-wrapper` / `.body-row` / `.main-content`, alertes, dropdown, pagination, modals. `.main-content` ne définit plus padding ni background (délégué au template). |
| `resources/views/dashboard.blade.php` | Section « Activité et tâches » : utilisation de `.dashboard-grid.has-aside`, `.dashboard-main` (colonne gauche), `.dashboard-aside` (colonne droite sticky) pour la grille template. |

Aucun fichier sous `app/`, `routes/`, `config/` (hors éventuelle référence à assets), ni contrôleur, n’a été modifié pour cette refonte.

---

## 4. Preuve que le backend est resté intact

- **Contrôleurs** : aucun fichier dans `app/Http/Controllers/` modifié.
- **Routes** : aucun fichier dans `routes/` modifié.
- **Logique métier** : aucun modèle, service ou middleware modifié.
- **Données** : les vues reçoivent les mêmes variables qu’avant ; seules les classes CSS et la structure HTML (grille, aside) ont été ajoutées ou ajustées pour le style.

La refonte est limitée aux vues Blade et au fichier CSS du template.

---

## 5. Utilisation de la grille sur les autres pages

Pour appliquer la même grille (zone principale + panneau latéral sticky) sur d’autres dashboards (demandes, stock, budgets, etc.) :

1. Envelopper le contenu principal dans `<div class="dashboard-grid has-aside">`.
2. Mettre le bloc principal dans `<div class="dashboard-main">`.
3. Mettre le panneau secondaire (actions rapides, filtres, résumé) dans `<aside class="dashboard-aside">`.

Les classes `.card`, `.card-header`, `.kpi-card`, `.page-hero`, `.dashboard-section-title` sont déjà stylées dans `esebat-dashboard-template.css` sous `#dashboard-layout` ; les vues qui les utilisent héritent automatiquement du style premium.

---

## 6. Référence

- Synthèse des choix template : `docs/SYNTHESE-DASHBOARD-TEMPLATES.md`
- Audit fonctionnel par profil : `docs/AUDIT-FONCTIONNEL-PAR-PROFIL.md`
