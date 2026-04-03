# Synthèse des templates dashboard — Amélioration des tableaux de bord

**Projet :** gestion-stock-btp (ESEBAT Logistique & Budget)  
**Objectif :** Choisir le meilleur template pour améliorer l’apparence et l’organisation des tableaux de bord **sans modifier les fonctionnalités**.

---

## 1. Inventaire des templates analysés

| # | Template | Style | Contenu type | Atouts | Limites |
|---|----------|--------|---------------|--------|--------|
| 1 | **Workspace Settings (DEVORYN)** | Glassmorphism sombre, fond flouté | Paramètres : sécurité, sessions, intégrations, accès équipe | Cartes bien séparées, toggles/statuts clairs | Très orienté “settings”, peu de données métier |
| 2 | **Reports Center (DEVORYN)** | Idem | Génération de rapports, archive, graphique type donut | Wizard + tableau “Archive” + statuts (Ready, Generating, Failed) | Spécifique “reports” |
| 3 | **Design Team (DEVORYN)** | Idem | Charge équipe, statut projets, backlog, jalons | Barres de progression, donut, liste de tâches | Vocabulaire “design” à transposer |
| 4 | **Messages (DEVORYN)** | Idem, 3 colonnes | Fil de discussion, messages directs, fils épinglés | Recherche, compose, bulles de messages | Peu utile pour le cœur métier stock |
| 5 | **Projects Overview (DEVORYN)** | Idem | Cartes projets, timeline type Gantt | Cartes avec progression/statut, vue timeline | Projets ≠ stock, mais structure réutilisable |
| 6 | **Analytics Insights (DEVORYN)** | Glassmorphism sombre, mode dark | Courbes, barres, entonnoir, donut, heatmap | Très riche en visualisations, KPIs en pied de carte | Très “analytics”, à simplifier pour notre usage |
| 7 | **Dashboard Overview (DEVORYN)** | Idem, gouttes d’eau sur le verre | Métriques, projets actifs, statut des tâches (pie), activité équipe | Vue d’ensemble équilibrée, KPIs + listes + graphique | Très adapté comme “accueil” |
| 8 | **Dashboard Design Idea (violet/bleu)** | Glassmorphism violet/bleu, clair/sombre | Data Analytics, Recent Activity, System Status, Master Record, Team Members | Structure proche de nos besoins : KPIs, activité, tableau maître, équipe | Déjà partiellement utilisé pour l’inspiration |
| 9 | **Astra Admin (observatoire)** | Thème “espace”, fond étoilé | Ciel, télescopes, planètes, calendrier lunaire, transits | Sidebar + header + widgets modulaires, indicateurs de statut | Thème trop spécifique ; garder uniquement la **structure** |

---

## 2. Choix du meilleur template

### Template retenu : **suite DEVORYN + Dashboard Design Idea**

**Pourquoi ce choix :**

1. **Cohérence avec ce qui est déjà en place**  
   Le layout actuel a déjà été inspiré par un style “verre” (glassmorphism léger, dégradé, cartes semi-transparentes). Les maquettes DEVORYN et Dashboard Design Idea prolongent cette direction sans tout casser.

2. **Adaptation directe au métier stock BTP**  
   - **Dashboard Overview (DEVORYN)** → tableau de bord d’accueil : KPIs (stock total, mouvements du mois, demandes en attente), liste “projets” = demandes ou réceptions récentes, “Tasks Status” = répartition des statuts (livré, reçu, en attente), activité récente.  
   - **Dashboard Design Idea** → structure déjà proche : “Data Analytics” = indicateurs + mini graphiques stock ; “Recent Activity” = dernières réceptions/sorties ; “Master Record” = tableau type synthèse articles ou mouvements ; “Team Members” = staff / utilisateurs par campus.  
   - **Reports Center (DEVORYN)** → page ou bloc “Rapports” : filtres, génération, archive avec colonnes Nom / Date / Type / Statut.

3. **Lisibilité et accessibilité**  
   Les templates en mode clair (ou fond sombre avec bon contraste) gardent une hiérarchie claire : titres de cartes, libellés, statuts colorés (badges). Ça reste exploitable en BTP/éducation sans effet “gadget”.

4. **Éléments réutilisables sans toucher à la logique**  
   - Cartes en grille, avec en-tête + corps.  
   - KPIs en haut de carte ou en bandeau.  
   - Tableaux avec recherche, filtres, colonne Statut, actions (voir / éditer).  
   - Indicateurs de statut (pastilles vert / orange / rouge).  
   - Sidebar avec item actif mis en avant (glow / fond).  

Astra Admin est utile uniquement comme référence de **structure** (sidebar + header + zones en cartes) ; le thème “observatoire” n’est pas à reprendre tel quel.

---

## 3. Synthèse des bonnes pratiques à réutiliser

| Pratique | Où on la voit | Application dans notre projet |
|----------|----------------|--------------------------------|
| **Cartes modulaires** | Tous les templates | Une carte = un bloc logique (Réceptions enregistrées, Synthèse par article, Historique des mouvements, etc.). |
| **KPIs en tête ou pied de carte** | DEVORYN Overview, Design Idea | Ex. : “Total stock restant”, “Sorties ce mois”, “Demandes en attente de réception”. |
| **Statuts visuels (badges / pastilles)** | Reports Center, Projects, Design Idea | Garder nos badges (Livrée, Réceptionnée, etc.) et les rendre plus visibles (couleur, contraste). |
| **Tableau “Master” avec recherche + filtres** | Design Idea, Reports Center | Synthèse par article, Historique des mouvements : barre de recherche, filtre par date/catégorie. |
| **Recent Activity / liste d’événements** | Design Idea, DEVORYN Overview | Bloc “Dernières réceptions / sorties” sur le tableau de bord ou la page Mon stock. |
| **Sidebar avec état actif marqué** | DEVORYN, Astra | Item actif avec fond + léger glow (déjà amorcé dans notre layout). |
| **Header : titre + actions utilisateur** | Tous | Conserver titre de page + notifications + profil + thème (déjà en place). |
| **Graphiques simples** | Analytics, Design Idea, Overview | Plus tard : courbe des entrées/sorties, donut par catégorie — sans changer les fonctionnalités, uniquement présentation. |

---

## 4. Plan d’amélioration proposé (uniquement visuel / structure)

Sans modifier les fonctionnalités existantes :

1. **Layout global (déjà partiellement fait)**  
   - Garder le fond en dégradé discret et les cartes type “verre” (backdrop-filter, bords arrondis).  
   - S’assurer que la sidebar et le header restent cohérents avec ce style.

2. **Tableau de bord d’accueil**  
   - Structurer la page en **cartes** (comme DEVORYN Overview / Design Idea).  
   - Ajouter 2–3 **KPIs** en haut (ex. stock total, mouvements du mois, demandes livrées non réceptionnées).  
   - Un bloc **“Activité récente”** (dernières sorties, dernières réceptions) si les données sont déjà disponibles côté backend.

3. **Page “Mon stock”**  
   - Conserver les 3 blocs actuels (Réceptions, Synthèse, Historique) en les traitant comme des **cartes distinctes** avec en-tête clair.  
   - Renforcer la lisibilité des **statuts** (badges) et des **boutons d’action** (Enregistrer une sortie, etc.).

4. **Pages listes (rapports, référentiel, etc.)**  
   - S’inspirer de **Master Record** / **Report Archive** : titre de section, recherche, filtres (date, type, statut), tableau avec colonnes claires et pastilles de statut.

5. **Modales et formulaires**  
   - Garder le style “verre” des modales déjà appliqué, champs avec focus visible, boutons avec état hover cohérent.

---

## 5. Récapitulatif

- **Meilleur template global :** suite **DEVORYN** (Overview, Reports, Design Team) + **Dashboard Design Idea** pour la structure des widgets (Data Analytics, Recent Activity, Master Record, Team).  
- **À prendre des autres maquettes :** structure sidebar + header + cartes (y compris Astra Admin), sans reprendre les thèmes trop spécifiques.  
- **Déjà en place :** fond dégradé, cartes glassmorphism, topbar “verre”, sidebar avec item actif, modales et formulaires améliorés.  
- **Prochaines étapes recommandées :** appliquer la synthèse ci-dessus page par page (dashboard, Mon stock, rapports) en ne touchant qu’au HTML/CSS et à l’agencement des blocs, sans changer routes, contrôleurs ni règles métier.
