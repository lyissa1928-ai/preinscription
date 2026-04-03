# Module Guide utilisateur intelligent — Architecture et état des lieux

## 1. Architecture choisie

### 1.1 Principe

- **Piloté par données** : le contenu du guide est défini dans des services PHP (`GuideConfigService`, `StructuredGuideService`), pas en texte brut. Chaque rôle reçoit uniquement les sections et cartes qui le concernent.
- **Synchronisé avec les permissions** : les cartes affichées correspondent aux actions réellement accessibles à l’utilisateur (filtrage par rôle côté serveur).
- **Composants réutilisables** : chaque brique (carte, section, modal, tableau, workflow) est un composant Blade dédié.

### 1.2 Flux

1. L’utilisateur ouvre la page **Guide utilisateur**.
2. Le **GuideController** récupère le rôle de l’utilisateur connecté.
3. **GuideConfigService** fournit : libellé du rôle, résumé du périmètre, workflows visuels.
4. **StructuredGuideService** fournit les sections et cartes du guide détaillé (filtrées par rôle).
5. **GuideController** récupère les démos (étapes pour la prévisualisation) et construit les « procédures principales » (cartes cliquables).
6. La vue **guide/index** affiche : résumé du rôle, cartes de fonctionnalités, bloc workflows, guide détaillé en cartes, lien Export PDF.

### 1.3 Niveaux du guide

| Niveau | Implémentation |
|--------|----------------|
| **Niveau 1 — Accueil** | Page guide avec titre, sous-titre (profil), résumé du périmètre (`roleSummary`), cartes principales. |
| **Niveau 2 — Cartes de fonctionnalités** | Composant `procedure-card` (alias **GuideCard**) : icône, titre, description, acteurs, livrable, bouton « Voir les détails ». |
| **Niveau 3 — Prévisualisation rapide** | Modal **procedure-preview-modal** (alias **GuideQuickViewModal**) : résumé, étapes, boutons « Voir le guide complet » et « Lancer la démo ». |
| **Niveau 4 — Guide détaillé** | Sections avec **guide-detail-card** : une carte par fonctionnalité / étape / formulaire ; tableaux de champs (GuideFormTable) avec colonne Règle métier. |
| **Niveau 5 — Export PDF** | Route `guide.export-pdf` : page dédiée avec couverture, workflows, sections/cartes, tableaux (avec Règle), schémas ; impression navigateur → « Enregistrer en PDF ». |

---

## 2. Rôles gérés

| Rôle technique | Libellé affiché | Contenu guide |
|----------------|------------------|---------------|
| `staff` | Staff de campus | Demandes, stock personnel, distribution, historique (campus seul). |
| `point_focal` | Point focal logistique | Validation/rejet, réception, stock global, rapports, + contenu staff. |
| `stock_manager` | Gestionnaire de stock | Même contenu que point_focal (normalisé en `point_focal` pour le contenu). |
| `director` | Directeur | Budgets, utilisateurs, synthèse multi-campus, + contenu point_focal. |
| `super_admin` | Administrateur | Tout (campus, utilisateurs, paramètres, apparence, + contenu directeur/point_focal). |

**Règle** : un utilisateur ne voit que les cartes dont son rôle fait partie. Director et super_admin voient aussi les cartes point_focal.

---

## 3. Composants créés / utilisés

| Composant logique | Fichier Blade | Rôle |
|-------------------|---------------|------|
| **GuideHome** | `guide/index.blade.php` + `guide-page` | Page d’accueil du guide : titre, sous-titre, résumé rôle, procédures, workflows, guide détaillé, bouton PDF. |
| **GuideSection** | Bloc dans `guide/index` (`.guide-section`) | Titre de section + grille de cartes. |
| **GuideCard** | `procedure-card.blade.php` | Carte de fonctionnalité principale (cliquable → modal). |
| **GuideQuickViewModal** | `procedure-preview-modal.blade.php` | Prévisualisation : résumé, étapes, « Voir le guide complet », « Lancer la démo ». |
| **GuideDetailedView** | Suite de `guide-detail-card` dans chaque section | Cartes pédagogiques du guide détaillé (titre, description, actions, formulaire, résultat attendu). |
| **GuideWorkflowBlock** | `guide-workflow-block.blade.php` | Affichage des workflows (timeline d’étapes par rôle). |
| **GuideFormTable** | `form-fields-table.blade.php` | Tableau Champ / Description / Type / Obligatoire / Exemple / Règle métier. |
| **GuidePdfExport** | `guide/export-pdf.blade.php` | Vue d’export : couverture, workflows, sections, tableaux, schémas. |

---

## 4. Pages modifiées

- **`resources/views/guide/index.blade.php`** : intégration résumé rôle, section workflows (`guide-workflow-block`), lien Export PDF, pas de bloc de texte brut.
- **`app/Http/Controllers/GuideController.php`** : utilisation de `GuideConfigService` (label, summary, workflows, normalisation rôle), passage de `roleSummary`, `workflows`, et pour l’export PDF de `workflows`.
- **`resources/views/guide/export-pdf.blade.php`** : ajout des workflows par rôle et colonne « Règle métier » dans les tableaux de formulaires.

---

## 5. Workflows intégrés

- **Workflow Staff** : Crée une demande → Remplit le formulaire → Soumet → Attend validation → Reçoit le matériel → Gère son stock personnel.
- **Workflow Point focal** : Reçoit la demande → Vérifie le campus → Valide ou rejette → Enregistre la réception → Met à jour le stock → Produit les rapports.
- **Workflow Directeur** : Consulte la synthèse → Supervise les demandes → Suit les campus → Analyse les statistiques → Valide les rapports.

Affichage : bloc « Votre parcours » sur la page guide (composant **GuideWorkflowBlock**) et section dédiée dans le PDF.

---

## 6. Tableaux de formulaires

- **Demande de matériel** : Campus, Type, Service, Objet, Motif, Date souhaitée, Lignes de matériel — avec **Règle métier** (ex. « Maximum 150 caractères », « Au moins un article »).
- **Réception** : Utilisateur bénéficiaire, Article, Quantité — avec règles (ex. « Utilisateur du même campus », « Strictement positive »).

Composant **GuideFormTable** (`form-fields-table`) : colonnes Champ, Description, Type, Obligatoire, Exemple, Règle métier (affichée si `showRegle` et données présentes).

---

## 7. Mécanisme d’export PDF

- **Route** : `GET /guide-utilisateur/export-pdf` (nom : `guide.export-pdf`), protégée par `auth`.
- **Comportement** : ouvre une page HTML dédiée (sans layout app) contenant :
  - Page de couverture (logo, titre, profil, date),
  - Section « Votre parcours » (workflows du rôle),
  - Sections du guide en cartes (même structure que la page guide),
  - Tableaux de formulaires avec colonne Règle métier,
  - Schémas (validation, cycle de vie, flux global, par campus, demande groupée/individuelle).
- **Génération du fichier** : l’utilisateur clique sur « Imprimer / Enregistrer en PDF » (ou Ctrl+P) et choisit « Enregistrer au format PDF » dans la boîte d’impression du navigateur. Aucune librairie serveur (ex. Dompdf) n’est requise.

---

## 8. Points à améliorer

- **Couleurs par catégorie** : appliquer systématiquement le codage Demandes=bleu, Validation=vert, Réception=orange, Distribution=violet, Historique=gris (via `GuideConfigService::getColorThemeByCategory()`) aux cartes en fonction de la section ou de la clé de fonctionnalité.
- **Rôle `stock_manager` en base** : si ce rôle n’existe pas encore dans la table des rôles, l’ajouter pour les utilisateurs « Gestionnaire de stock » ; le guide est déjà prêt à l’afficher.
- **Génération PDF côté serveur** : optionnellement, utiliser Dompdf ou Snappy pour produire un fichier PDF téléchargeable (lien « Télécharger le PDF ») en plus de l’impression navigateur.
- **Démos (Driver.js)** : vérifier les sélecteurs des étapes (menu, liens) après tout changement de structure du menu ou des URLs.
- **Contenu piloté par BDD** : à long terme, déplacer sections/cartes/workflows dans des tables (ex. `guide_sections`, `guide_cards`) pour édition sans déploiement.

---

## 9. État des lieux

| Élément | Statut |
|--------|--------|
| Détection du profil (rôle) | ✅ |
| Affichage limité au rôle | ✅ |
| Résumé du périmètre par rôle | ✅ |
| Cartes de fonctionnalités (niveau 2) | ✅ |
| Prévisualisation rapide (modal) | ✅ |
| Guide détaillé en cartes (niveau 4) | ✅ |
| Tableaux de formulaires avec Règle métier | ✅ |
| Workflows visuels (Staff, Point focal, Directeur) | ✅ |
| Export PDF (page + impression) | ✅ |
| Schémas dans le PDF | ✅ |
| Design cohérent (cartes, espacements, responsive) | ✅ |
| Profils Staff, Point focal, Directeur, Admin, Gestionnaire stock | ✅ |
| Architecture modulaire et pilotée par données | ✅ |

Le module Guide utilisateur intelligent est opérationnel, contextuel par rôle, sans affichage de long texte brut, avec prévisualisation, guide détaillé en cartes, tableaux pédagogiques, workflows et export PDF professionnel.
