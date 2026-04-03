<?php

namespace App\Services;

/**
 * Guide détaillé structuré en sections et cartes pédagogiques.
 * Une fonctionnalité / étape / formulaire = une carte.
 */
class StructuredGuideService
{
    /**
     * Retourne les sections du guide pour un rôle donné.
     * Chaque section contient des cartes (titre, description, actions, rôles, formulaire éventuel).
     *
     * @return array<int, array{title: string, icon: string, cards: array}>
     */
    public function getSectionsForRole(string $role): array
    {
        $sections = $this->getBaseSections();
        $filtered = [];
        foreach ($sections as $section) {
            $cards = array_filter($section['cards'], fn ($c) => $this->isCardVisibleForRole($c, $role));
            if (count($cards) > 0) {
                $filtered[] = ['title' => $section['title'], 'icon' => $section['icon'], 'cards' => array_values($cards)];
            }
        }
        return $filtered;
    }

    /**
     * Une carte n'est affichée que si le rôle de l'utilisateur en fait partie.
     * Director et super_admin voient aussi les cartes point_focal.
     * stock_manager est traité comme point_focal pour la visibilité.
     */
    private function isCardVisibleForRole(array $card, string $role): bool
    {
        $roles = $card['roles'] ?? [];
        if (empty($roles)) {
            return true;
        }
        $effectiveRole = $role === 'stock_manager' ? 'point_focal' : $role;
        if (in_array($effectiveRole, $roles, true)) {
            return true;
        }
        if (in_array($effectiveRole, ['super_admin', 'director'], true) && in_array('point_focal', $roles)) {
            return true;
        }
        return false;
    }

    /**
     * Tous les champs du formulaire "Demande de matériel" (avec règle métier).
     */
    public static function formulaireDemandeMatériel(): array
    {
        return [
            ['champ' => 'Campus', 'description' => 'Site concerné par la demande', 'type' => 'Liste déroulante', 'obligatoire' => 'Oui', 'exemple' => 'Campus Dakar', 'regle' => 'Doit correspondre au campus de l\'utilisateur'],
            ['champ' => 'Type de demande', 'description' => 'Demande individuelle ou groupée', 'type' => 'Choix', 'obligatoire' => 'Oui', 'exemple' => 'Demande groupée', 'regle' => '—'],
            ['champ' => 'Service / Département', 'description' => 'Service demandeur (optionnel)', 'type' => 'Liste', 'obligatoire' => 'Non', 'exemple' => 'Maintenance', 'regle' => '—'],
            ['champ' => 'Objet de la demande', 'description' => 'Résumé court du besoin', 'type' => 'Texte', 'obligatoire' => 'Oui', 'exemple' => 'Demande de bureau', 'regle' => 'Maximum 150 caractères'],
            ['champ' => 'Motif / Justification', 'description' => 'Justification de la demande', 'type' => 'Texte long', 'obligatoire' => 'Oui', 'exemple' => 'Besoin pour nouveau personnel', 'regle' => 'Détail obligatoire'],
            ['champ' => 'Date souhaitée', 'description' => 'Date de livraison souhaitée', 'type' => 'Date', 'obligatoire' => 'Oui', 'exemple' => '15/04/2025', 'regle' => 'Date future ou courante'],
            ['champ' => 'Lignes de matériel', 'description' => 'Matériel demandé et quantités', 'type' => 'Liste (désignation + quantité)', 'obligatoire' => 'Oui', 'exemple' => 'Bureau × 2, Chaise × 4', 'regle' => 'Au moins un article ; quantité strictement positive'],
        ];
    }

    /**
     * Champs du formulaire "Enregistrer une réception" (point focal) avec règle métier.
     */
    public static function formulaireReception(): array
    {
        return [
            ['champ' => 'Utilisateur bénéficiaire', 'description' => 'Personne à qui attribuer le matériel reçu', 'type' => 'Liste utilisateurs', 'obligatoire' => 'Oui', 'exemple' => 'Jean Dupont', 'regle' => 'Utilisateur du même campus'],
            ['champ' => 'Article', 'description' => 'Article du catalogue ou désignation libre', 'type' => 'Liste / Texte', 'obligatoire' => 'Oui', 'exemple' => 'Bureau', 'regle' => '—'],
            ['champ' => 'Quantité', 'description' => 'Nombre d\'unités attribuées', 'type' => 'Nombre', 'obligatoire' => 'Oui', 'exemple' => '2', 'regle' => 'Strictement positive'],
        ];
    }

    private function getBaseSections(): array
    {
        return [
            [
                'title' => 'Vue d\'ensemble',
                'icon' => 'bi-diagram-3',
                'cards' => [
                    [
                        'title' => 'Plateforme ESEBAT — Logistique & demandes',
                        'description' => 'La plateforme permet de gérer les demandes de matériel par campus, de les valider, de regrouper les commandes et de suivre les livraisons et le stock personnel.',
                        'actions' => ['Accéder au tableau de bord', 'Consulter les demandes selon son rôle'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-building',
                        'color' => 'primary',
                    ],
                    [
                        'title' => 'Isolation par campus',
                        'description' => 'Chaque membre du staff n\'a accès qu\'aux activités de son propre campus. Le point focal et le directeur voient l\'ensemble des campus.',
                        'actions' => [],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-shield-lock',
                        'color' => 'info',
                    ],
                ],
            ],
            [
                'title' => 'Création d\'une demande',
                'icon' => 'bi-file-earmark-plus',
                'cards' => [
                    [
                        'title' => 'Demande individuelle ou groupée',
                        'description' => 'Vous pouvez créer une demande personnelle (individuelle) ou une demande groupée à laquelle d\'autres membres du même campus pourront ajouter leurs besoins.',
                        'actions' => ['Menu Opérations → Demandes de matériel', 'Nouvelle demande', 'Choisir le type (individuelle / groupée)', 'Renseigner les champs obligatoires'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-person-plus',
                        'color' => 'primary',
                    ],
                    [
                        'title' => 'Formulaire de demande de matériel',
                        'description' => 'Champs à renseigner pour créer une demande. Les champs marqués obligatoires doivent être remplis avant soumission.',
                        'actions' => ['Remplir le formulaire', 'Ajouter au moins une ligne de matériel', 'Enregistrer en brouillon ou Soumettre'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-ui-checks',
                        'color' => 'success',
                        'formFields' => self::formulaireDemandeMatériel(),
                    ],
                    [
                        'title' => 'Soumission pour approbation',
                        'description' => 'Une fois la demande complète, cliquez sur « Soumettre pour approbation ». Elle apparaîtra alors dans la liste des demandes en attente du point focal ou du directeur.',
                        'actions' => ['Vérifier les lignes et quantités', 'Soumettre pour approbation'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-send',
                        'color' => 'primary',
                        'expectedResult' => 'Demande avec statut « Soumise »',
                    ],
                ],
            ],
            [
                'title' => 'Validation ou rejet d\'une demande',
                'icon' => 'bi-check2-square',
                'cards' => [
                    [
                        'title' => 'Traiter les demandes soumises',
                        'description' => 'Le point focal et le directeur voient les demandes en statut « Soumise ». Sur la fiche demande, le solde budgétaire du campus est affiché. Renseignez le prix unitaire (FCFA) pour chaque ligne : le coût total (prix × quantité) est calculé automatiquement. Cliquez sur « Valider » pour approuver : le montant est alors déduit du budget du campus. Si le budget est insuffisant, un message clair s\'affiche et la validation est refusée ; la demande reste en attente jusqu\'à une nouvelle allocation par le directeur.',
                        'actions' => ['Demandes de matériel → filtre Soumise', 'Ouvrir une demande', 'Vérifier le solde budget campus', 'Renseigner le prix unitaire par ligne (FCFA)', 'Valider (déduction automatique du budget) ou Rejeter (motif obligatoire)'],
                        'roles' => ['point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-clipboard-check',
                        'color' => 'success',
                        'expectedResult' => 'Demande validée (budget déduit) ou rejetée ; si budget insuffisant, message explicite et demande en attente.',
                    ],
                ],
            ],
            [
                'title' => 'Budgets et contrôle budgétaire',
                'icon' => 'bi-wallet2',
                'cards' => [
                    [
                        'title' => 'Allocation budgétaire (directeur)',
                        'description' => 'Le directeur effectue les allocations budgétaires globales pour chaque rentrée académique, par campus. Créer un budget : année fiscale, campus, montant total. Après création : Approuver le budget, puis Activer le budget. Seul le budget actif du campus permet de valider les demandes d\'achat et de déduire les dépenses.',
                        'actions' => ['Finances → Budgets', 'Nouveau budget : année, campus, montant', 'Approuver le budget', 'Activer le budget'],
                        'roles' => ['director', 'super_admin'],
                        'icon' => 'bi-wallet2',
                        'color' => 'primary',
                        'expectedResult' => 'Budget actif par campus pour l\'année en cours.',
                    ],
                    [
                        'title' => 'Tableau de bord budgétaire (directeur)',
                        'description' => 'Vue stratégique réservée au directeur : budget initial par campus, dépenses effectuées, solde restant, taux d\'utilisation. Liste des demandes en attente faute de budget (budget insuffisant ou prix non renseignés). Permet de prendre des décisions (nouvelle allocation, ajustement).',
                        'actions' => ['Finances → Tableau de bord budgétaire', 'Consulter la synthèse par campus et par année', 'Consulter les demandes en attente faute de budget'],
                        'roles' => ['director', 'super_admin'],
                        'icon' => 'bi-graph-up-arrow',
                        'color' => 'info',
                        'expectedResult' => 'Vision complète des budgets et des demandes bloquées.',
                    ],
                    [
                        'title' => 'Validation avec budget (point focal)',
                        'description' => 'Pour chaque demande soumise, le point focal renseigne le prix unitaire par ligne. Le système calcule le coût total et vérifie en temps réel le budget du campus. Si le solde est suffisant, la validation enregistre la dépense et déduit le montant du budget. Si le budget est épuisé ou insuffisant, la validation est refusée avec un message clair ; seule une nouvelle allocation par le directeur pourra débloquer la demande.',
                        'actions' => ['Ouvrir une demande soumise', 'Vérifier le solde affiché (Budget campus)', 'Renseigner le prix unitaire (FCFA) pour chaque ligne', 'Valider : le montant est déduit du budget du campus'],
                        'roles' => ['point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-currency-exchange',
                        'color' => 'success',
                        'expectedResult' => 'Demande validée et budget déduit, ou message « Budget insuffisant » si le solde est trop faible.',
                    ],
                ],
            ],
            [
                'title' => 'Réception des matériels',
                'icon' => 'bi-box-seam',
                'cards' => [
                    [
                        'title' => 'Enregistrer une réception',
                        'description' => 'Lorsqu\'une livraison arrive, le point focal ou le directeur peut attribuer les quantités reçues à un utilisateur (bénéficiaire). Ces entrées alimentent le stock personnel de chaque utilisateur.',
                        'actions' => ['Mon stock personnel → Enregistrer réception', 'Choisir l\'utilisateur bénéficiaire', 'Article et quantité', 'Enregistrer'],
                        'roles' => ['point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-box-arrow-in-down',
                        'color' => 'info',
                        'formFields' => self::formulaireReception(),
                        'expectedResult' => 'Mouvement « Reçu » enregistré pour l\'utilisateur.',
                    ],
                ],
            ],
            [
                'title' => 'Gestion du stock',
                'icon' => 'bi-boxes',
                'cards' => [
                    [
                        'title' => 'Stock global (inventaire)',
                        'description' => 'Le point focal et le directeur ont accès au stock par entrepôt/campus : quantités disponibles, alertes stock faible, réapprovisionnement.',
                        'actions' => ['Menu Inventaire → Stock', 'Consulter le tableau de bord stock', 'Alertes stock faible'],
                        'roles' => ['point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-boxes',
                        'color' => 'warning',
                    ],
                    [
                        'title' => 'Mon stock personnel',
                        'description' => 'Chaque utilisateur dispose d\'un tableau de suivi : matériels reçus, matériels distribués à d\'autres, quantité restante. Il peut enregistrer une distribution lorsqu\'il remet du matériel à quelqu\'un.',
                        'actions' => ['Menu → Mon stock personnel', 'Consulter la synthèse', 'Enregistrer une distribution si besoin'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-person-badge',
                        'color' => 'primary',
                        'expectedResult' => 'Vue claire : reçu, distribué, restant.',
                    ],
                ],
            ],
            [
                'title' => 'Distribution du matériel',
                'icon' => 'bi-share',
                'cards' => [
                    [
                        'title' => 'Enregistrer une distribution',
                        'description' => 'Lorsqu\'un membre du staff remet du matériel à un collègue, il peut enregistrer cette distribution dans « Mon stock personnel ». La quantité est déduite de son stock et ajoutée à celui du bénéficiaire.',
                        'actions' => ['Mon stock personnel → Distribuer', 'Choisir le bénéficiaire', 'Article et quantité', 'Enregistrer'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-arrow-left-right',
                        'color' => 'info',
                        'expectedResult' => 'Mouvement « Distribué » enregistré ; stocks mis à jour.',
                    ],
                ],
            ],
            [
                'title' => 'Consultation de l\'historique',
                'icon' => 'bi-clock-history',
                'cards' => [
                    [
                        'title' => 'Historique des demandes',
                        'description' => 'Chaque utilisateur peut consulter l\'historique de ses demandes (brouillon, soumise, en cours, validée, rejetée). Le point focal et le directeur voient toutes les demandes avec filtre par campus et par statut.',
                        'actions' => ['Demandes de matériel', 'Filtrer par statut ou campus', 'Ouvrir une demande pour voir le détail'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-list-ul',
                        'color' => 'primary',
                    ],
                    [
                        'title' => 'Historique des mouvements de stock',
                        'description' => 'Dans Mon stock personnel, l\'historique des mouvements (reçu, distribué) est affiché pour chaque article, avec date et bénéficiaire le cas échéant.',
                        'actions' => ['Mon stock personnel', 'Consulter les mouvements par article'],
                        'roles' => ['staff', 'point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-arrow-repeat',
                        'color' => 'secondary',
                    ],
                ],
            ],
            [
                'title' => 'Suivi par campus',
                'icon' => 'bi-building',
                'cards' => [
                    [
                        'title' => 'Données limitées au campus (staff)',
                        'description' => 'Un membre du staff ne voit que les demandes et activités de son campus. Il ne peut pas accéder aux données des autres sites.',
                        'actions' => [],
                        'roles' => ['staff'],
                        'icon' => 'bi-geo-alt',
                        'color' => 'info',
                    ],
                    [
                        'title' => 'Vue multi-campus (point focal / directeur)',
                        'description' => 'Le point focal et le directeur voient tous les campus. Les listes et rapports peuvent être filtrés par campus.',
                        'actions' => ['Filtres par campus dans les listes', 'Rapport mensuel par campus'],
                        'roles' => ['point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-building',
                        'color' => 'primary',
                    ],
                ],
            ],
            [
                'title' => 'Rapports mensuels',
                'icon' => 'bi-calendar-month',
                'cards' => [
                    [
                        'title' => 'État des lieux mensuel par campus',
                        'description' => 'Le point focal reçoit un rapport par mois et par campus : demandes effectuées, validées, livrées, quantités distribuées, stocks restants. Export CSV et impression PDF disponibles.',
                        'actions' => ['Menu Analyse → Rapport mensuel par campus', 'Choisir le mois et le campus', 'Exporter Excel (CSV) ou Imprimer / PDF'],
                        'roles' => ['point_focal', 'director', 'super_admin'],
                        'icon' => 'bi-file-earmark-bar-graph',
                        'color' => 'success',
                        'expectedResult' => 'Tableaux clairs et export PDF avec identité ESEBAT.',
                    ],
                ],
            ],
        ];
    }
}
