<?php

namespace App\Http\Controllers;

use App\Services\GuideConfigService;
use App\Services\StructuredGuideService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

/**
 * Affiche le guide utilisateur selon le profil (rôle) et gère les démos guidées.
 */
class GuideController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $role = $user->roles->first()?->name ?? 'staff';
        $config = new GuideConfigService();
        $profileLabel = $config->getLabelForRole($role);
        $roleSummary = $config->getSummaryForRole($role);
        $workflows = $config->getWorkflowsForRole($role);
        $contentRole = $config->normalizeRoleForContent($role);

        $demos = $this->getDemosForRole($contentRole);
        $procedures = $this->buildProceduresForRole($contentRole, $demos, $profileLabel);
        $guideSections = (new StructuredGuideService())->getSectionsForRole($contentRole);

        return view('guide.index', [
            'profileLabel' => $profileLabel,
            'role' => $role,
            'roleSummary' => $roleSummary,
            'workflows' => $workflows,
            'guideSections' => $guideSections,
            'demos' => $demos,
            'procedures' => $procedures,
        ]);
    }

    /**
     * Vue d'export PDF du guide (ouverture dans une nouvelle fenêtre pour impression / enregistrement en PDF).
     */
    public function exportPdf(Request $request)
    {
        $user = $request->user();
        $role = $user->roles->first()?->name ?? 'staff';
        $config = new GuideConfigService();
        $profileLabel = $config->getLabelForRole($role);
        $workflows = $config->getWorkflowsForRole($role);
        $contentRole = $config->normalizeRoleForContent($role);
        $guideSections = (new StructuredGuideService())->getSectionsForRole($contentRole);

        return view('guide.export-pdf', [
            'profileLabel' => $profileLabel,
            'role' => $role,
            'guideSections' => $guideSections,
            'workflows' => $workflows,
        ]);
    }

    /**
     * Construit les cartes "procédures principales" pour la vue type GAGE (icône, couleur, acteurs).
     */
    private function buildProceduresForRole(string $role, array $demos, string $profileLabel): array
    {
        $colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
        $icons = [
            'creer-demande' => 'bi-file-earmark-plus',
            'voir-stock' => 'bi-boxes',
            'valider-demande' => 'bi-check2-square',
            'creer-commande' => 'bi-truck',
            'receptionner' => 'bi-box-seam',
            'budget' => 'bi-wallet2',
            'tableau-bord-budgetaire' => 'bi-graph-up-arrow',
            'utilisateurs' => 'bi-people',
            'admin' => 'bi-gear',
        ];
        $livrables = [
            'creer-demande' => 'Demande créée et soumise pour validation',
            'voir-stock' => 'Consultation du stock par campus',
            'valider-demande' => 'Demande approuvée ou rejetée avec motif',
            'creer-commande' => 'Commande fournisseur créée et confirmée',
            'receptionner' => 'Réception enregistrée, stock mis à jour',
            'budget' => 'Budget créé, approuvé et activé',
            'tableau-bord-budgetaire' => 'Vue stratégique budgets et demandes en attente',
            'utilisateurs' => 'Utilisateurs et campus gérés',
            'admin' => 'Paramètres et apparence mis à jour',
        ];
        $out = [];
        $i = 0;
        foreach ($demos as $key => $demo) {
            $out[] = [
                'key' => $key,
                'num' => $i + 1,
                'title' => $demo['title'],
                'description' => $demo['description'],
                'acteurs' => $profileLabel,
                'livrable' => $livrables[$key] ?? 'Procédure réalisée',
                'color' => $colors[$i % count($colors)],
                'icon' => $icons[$key] ?? 'bi-list-check',
            ];
            $i++;
        }
        return $out;
    }

    /**
     * Démos animées (parcours guidés) selon le rôle.
     *
     * @return array<string, array{title: string, description: string, steps: array}>
     */
    private function getDemosForRole(string $role): array
    {
        $all = [
            'staff' => [
                'creer-demande' => [
                    'title' => 'Créer une demande de matériel',
                    'description' => 'Parcours guidé : de la création de la demande à la soumission.',
                    'steps' => [
                        ['element' => 'nav a[href*="material-requests"]', 'title' => 'Demandes de matériel', 'description' => 'Dans le menu Opérations, cliquez sur « Demandes de matériel » pour accéder à la liste.'],
                        ['element' => null, 'title' => 'Nouvelle demande', 'description' => 'Sur la page Demandes de matériel, cliquez sur « Nouvelle demande ». Renseignez le campus, la date souhaitée et les notes, puis enregistrez. Ensuite ajoutez les articles sur la fiche avec le bouton +, puis « Soumettre pour approbation ».'],
                    ],
                ],
                'voir-stock' => [
                    'title' => 'Consulter le stock',
                    'description' => 'Où trouver les articles et les quantités disponibles.',
                    'steps' => [
                        ['element' => 'nav a[href*="stock"]', 'title' => 'Menu Stock', 'description' => 'Dans Inventaire, cliquez sur « Stock » pour voir le tableau de bord et les articles par campus/entrepôt.'],
                    ],
                ],
            ],
            'point_focal' => [
                'valider-demande' => [
                    'title' => 'Valider ou rejeter une demande (avec budget)',
                    'description' => 'Ouvrir une demande soumise, vérifier le budget campus, renseigner les prix unitaires par ligne, puis valider (déduction automatique) ou rejeter.',
                    'steps' => [
                        ['element' => 'nav a[href*="material-requests"]', 'title' => 'Demandes de matériel', 'description' => 'Allez dans Demandes de matériel. Filtrez par statut « Soumise » pour voir les demandes en attente. Ouvrez une demande : le solde budgétaire du campus est affiché. Renseignez le prix unitaire (FCFA) pour chaque ligne ; le coût total est calculé automatiquement. Cliquez sur « Valider » pour approuver (le montant sera déduit du budget). Si le budget est insuffisant, un message s\'affiche et la validation est refusée.'],
                    ],
                ],
                'creer-commande' => [
                    'title' => 'Créer et confirmer une commande fournisseur',
                    'description' => 'Regrouper des lignes en attente et créer une commande, puis la confirmer.',
                    'steps' => [
                        ['element' => 'nav a[href*="aggregated-orders"]', 'title' => 'Commandes groupées', 'description' => 'Cliquez sur « Commandes groupées ». Puis « Créer une commande » : choisissez le fournisseur, cochez les lignes à regrouper, date de livraison, puis créez. Ensuite ouvrez la commande et « Confirmer la commande ».'],
                    ],
                ],
                'receptionner' => [
                    'title' => 'Enregistrer une réception',
                    'description' => 'Quand la livraison arrive, enregistrer les quantités reçues.',
                    'steps' => [
                        ['element' => 'nav a[href*="aggregated-orders"]', 'title' => 'Commandes à réceptionner', 'description' => 'Ouvrez une commande au statut « Confirmée ». Cliquez sur « Enregistrer la réception » et renseignez les quantités reçues pour chaque ligne. Le stock sera mis à jour.'],
                    ],
                ],
            ],
            'director' => [
                'budget' => [
                    'title' => 'Créer et activer un budget',
                    'description' => 'Créer un budget par campus pour l\'année, l\'approuver puis l\'activer. Les demandes validées par le point focal déduiront automatiquement ce budget.',
                    'steps' => [
                        ['element' => 'nav a[href*="budgets"]', 'title' => 'Budgets', 'description' => 'Finances → Budgets. « Nouveau budget » : année, campus, montant. Après création : « Approuver le budget », puis « Activer le budget ».'],
                    ],
                ],
                'tableau-bord-budgetaire' => [
                    'title' => 'Tableau de bord budgétaire',
                    'description' => 'Vue stratégique : budget par campus, dépenses, solde restant, demandes en attente faute de budget.',
                    'steps' => [
                        ['element' => 'nav a[href*="strategic-dashboard"]', 'title' => 'Tableau de bord budgétaire', 'description' => 'Finances → Tableau de bord budgétaire. Consultez le budget initial, les dépenses et le solde par campus, ainsi que la liste des demandes en attente (budget insuffisant ou prix non renseignés).'],
                    ],
                ],
                'utilisateurs' => [
                    'title' => 'Gérer les utilisateurs',
                    'description' => 'Créer un utilisateur, affecter un rôle et un campus.',
                    'steps' => [
                        ['element' => 'nav a[href*="users"]', 'title' => 'Utilisateurs', 'description' => 'Administration → Utilisateurs. Créez un utilisateur (nom, email, rôle, campus pour Staff). Modifier, suspendre ou affecter par lot.'],
                    ],
                ],
            ],
            'super_admin' => [
                'admin' => [
                    'title' => 'Administration : Campus et utilisateurs',
                    'description' => 'Configurer les campus et les comptes utilisateurs.',
                    'steps' => [
                        ['element' => 'nav a[href*="campuses"]', 'title' => 'Campus', 'description' => 'Administration → Campus : créer, modifier les campus.'],
                        ['element' => 'nav a[href*="users"]', 'title' => 'Utilisateurs', 'description' => 'Administration → Utilisateurs : créer (Directeur, Point focal, Staff), modifier, actions par lot.'],
                    ],
                ],
            ],
        ];

        $demos = $all[$role] ?? $all['staff'];
        if ($role === 'super_admin') {
            $demos = array_merge($demos, $all['director'] ?? []);
        }
        if (in_array($role, ['director', 'super_admin'], true)) {
            $demos = array_merge($demos, $all['point_focal'] ?? []);
        }

        return $demos;
    }

    /**
     * Conversion Markdown basique en HTML (sans dépendance).
     */
    private function markdownToHtml(string $md): string
    {
        $lines = explode("\n", $md);
        $out = [];
        $inList = false;
        foreach ($lines as $line) {
            $line = htmlspecialchars($line, ENT_QUOTES, 'UTF-8');
            if (preg_match('/^# (.+)$/', $line, $m)) {
                if ($inList) { $out[] = '</ul>'; $inList = false; }
                $out[] = '<h1 class="h4 mt-3">' . $m[1] . '</h1>';
            } elseif (preg_match('/^## (.+)$/', $line, $m)) {
                if ($inList) { $out[] = '</ul>'; $inList = false; }
                $out[] = '<h2 class="h5 mt-3">' . $m[1] . '</h2>';
            } elseif (preg_match('/^### (.+)$/', $line, $m)) {
                if ($inList) { $out[] = '</ul>'; $inList = false; }
                $out[] = '<h3 class="h6 mt-2">' . $m[1] . '</h3>';
            } elseif (preg_match('/^---$/', $line)) {
                if ($inList) { $out[] = '</ul>'; $inList = false; }
                $out[] = '<hr>';
            } elseif (preg_match('/^- (.+)$/', $line, $m)) {
                if (!$inList) { $out[] = '<ul class="mb-2">'; $inList = true; }
                $out[] = '<li>' . preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $m[1]) . '</li>';
            } elseif (preg_match('/^\|.+\|$/', $line)) {
                if ($inList) { $out[] = '</ul>'; $inList = false; }
                $out[] = '<p class="mb-1">' . str_replace('|', ' | ', $line) . '</p>';
            } elseif (trim($line) === '') {
                if ($inList) { $out[] = '</ul>'; $inList = false; }
                $out[] = '';
            } else {
                if ($inList) { $out[] = '</ul>'; $inList = false; }
                $out[] = '<p class="mb-2">' . preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $line) . '</p>';
            }
        }
        if ($inList) {
            $out[] = '</ul>';
        }
        return implode("\n", $out);
    }
}
