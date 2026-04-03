<?php

namespace App\Services;

/**
 * Configuration centralisée du guide utilisateur intelligent.
 * Piloté par données : rôles, résumés, workflows, thèmes de couleurs, ordre.
 * Synchronisé avec les permissions réelles de la plateforme.
 */
class GuideConfigService
{
    public const COLOR_DEMANDES = 'demandes';      // bleu
    public const COLOR_VALIDATION = 'validation';  // vert
    public const COLOR_RECEPTION = 'reception';    // orange
    public const COLOR_DISTRIBUTION = 'distribution'; // violet
    public const COLOR_HISTORIQUE = 'historique';  // gris
    public const COLOR_STOCK = 'stock';            // orange
    public const COLOR_RAPPORTS = 'rapports';       // gris / vert

    /** Rôles reconnus par le guide (alignés sur la plateforme). */
    public const ROLES = ['staff', 'point_focal', 'director', 'super_admin', 'stock_manager'];

    /**
     * Libellé et résumé du périmètre pour l'accueil du guide.
     *
     * @return array<string, array{label: string, summary: string}>
     */
    public function getRoleMetadata(): array
    {
        return [
            'staff' => [
                'label' => 'Staff de campus',
                'summary' => 'Créez et suivez vos demandes de matériel, consultez votre stock personnel et enregistrez les distributions. Vous n\'avez accès qu\'aux données de votre campus.',
            ],
            'point_focal' => [
                'label' => 'Point focal logistique',
                'summary' => 'Validez ou rejetez les demandes, créez et confirmez les commandes fournisseur, enregistrez les réceptions. Seul le point focal peut confirmer et réceptionner les commandes ; le directeur peut les annuler.',
            ],
            'stock_manager' => [
                'label' => 'Gestionnaire de stock',
                'summary' => 'Supervision du stock, réceptions, distributions et rapports d\'inventaire. Même périmètre que le point focal logistique.',
            ],
            'director' => [
                'label' => 'Directeur',
                'summary' => 'Supervision globale, tableaux de bord, budgets, statistiques et synthèses multi-campus. Vous pouvez annuler une commande mais pas la confirmer ni la réceptionner (réservé au point focal).',
            ],
            'super_admin' => [
                'label' => 'Administrateur',
                'summary' => 'Configuration des campus, utilisateurs, paramètres et apparence. Accès complet à toutes les fonctionnalités métier.',
            ],
        ];
    }

    /**
     * Résumé pour un rôle (avec fallback sur staff).
     */
    public function getSummaryForRole(string $role): string
    {
        $meta = $this->getRoleMetadata();
        $r = $meta[$role] ?? $meta['staff'];
        return $r['summary'];
    }

    /**
     * Libellé du rôle pour l'affichage.
     */
    public function getLabelForRole(string $role): string
    {
        $meta = $this->getRoleMetadata();
        $r = $meta[$role] ?? $meta['staff'];
        return $r['label'];
    }

    /**
     * Workflows visuels par rôle (étapes pour timeline / stepper).
     *
     * @return array<string, array{title: string, steps: array<int, string>}>
     */
    public function getWorkflowsForRole(string $role): array
    {
        $workflows = [];
        $staff = [
            'title' => 'Workflow Staff',
            'steps' => [
                'Crée une demande',
                'Remplit le formulaire',
                'Soumet la demande',
                'Attend la validation',
                'Reçoit le matériel',
                'Gère son stock personnel',
            ],
        ];
        $pointFocal = [
            'title' => 'Workflow Point focal',
            'steps' => [
                'Reçoit la demande',
                'Vérifie le campus',
                'Valide ou rejette',
                'Enregistre la réception',
                'Met à jour le stock',
                'Produit les rapports',
            ],
        ];
        $director = [
            'title' => 'Workflow Directeur',
            'steps' => [
                'Consulte la synthèse',
                'Supervise les demandes',
                'Suit les campus',
                'Analyse les statistiques',
                'Valide les rapports',
            ],
        ];

        if (in_array($role, ['staff'], true)) {
            $workflows[] = $staff;
        }
        if (in_array($role, ['point_focal', 'stock_manager', 'director', 'super_admin'], true)) {
            $workflows[] = $pointFocal;
        }
        if (in_array($role, ['director', 'super_admin'], true)) {
            $workflows[] = $director;
        }
        return $workflows;
    }

    /**
     * Thème de couleur par catégorie (icône Bootstrap, couleur bordure).
     *
     * @return array<string, array{color: string, icon: string}>
     */
    public function getColorThemeByCategory(): array
    {
        return [
            self::COLOR_DEMANDES => ['color' => 'primary', 'icon' => 'bi-file-earmark-plus'],   // bleu
            self::COLOR_VALIDATION => ['color' => 'success', 'icon' => 'bi-check2-square'],    // vert
            self::COLOR_RECEPTION => ['color' => 'warning', 'icon' => 'bi-box-seam'],          // orange
            self::COLOR_STOCK => ['color' => 'warning', 'icon' => 'bi-boxes'],
            self::COLOR_DISTRIBUTION => ['color' => 'info', 'icon' => 'bi-share'],              // violet -> info
            self::COLOR_HISTORIQUE => ['color' => 'secondary', 'icon' => 'bi-clock-history'],   // gris
            self::COLOR_RAPPORTS => ['color' => 'success', 'icon' => 'bi-file-earmark-bar-graph'],
        ];
    }

    /**
     * Normalise le rôle pour le guide (stock_manager => point_focal pour le contenu).
     */
    public function normalizeRoleForContent(string $role): string
    {
        return $role === 'stock_manager' ? 'point_focal' : $role;
    }
}
