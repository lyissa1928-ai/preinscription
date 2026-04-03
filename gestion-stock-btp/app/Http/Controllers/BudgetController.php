<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Campus;
use App\Http\Requests\AllocateBudgetRequest;
use App\Services\BudgetService;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

/**
 * BudgetController
 *
 * Manages budget lifecycle: creation, approval, activation
 * Director-only operations for financial control
 * Delegates to BudgetService
 */
class BudgetController extends Controller
{
    public function __construct(
        private BudgetService $budgetService
    ) {}

    /**
     * Tableau de bord stratégique (directeur uniquement) : budget par campus, dépenses, solde, demandes en attente faute de budget.
     */
    public function strategicDashboard(Request $request): View
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Réservé au directeur.');
        }

        $year = (int) $request->get('year', now()->year);
        $budgets = Budget::with('campus')
            ->where('fiscal_year', $year)
            ->orderBy('campus_id')
            ->get();

        $submittedRequests = \App\Models\MaterialRequest::with(['campus', 'requester', 'requestItems'])
            ->whereIn('status', ['submitted', 'in_treatment'])
            ->orderByDesc('created_at')
            ->get();

        $pendingForBudget = [];
        foreach ($submittedRequests as $req) {
            $totalCost = $req->requestItems->sum(fn ($i) => (float)($i->unit_price ?? 0) * $i->requested_quantity);
            $budget = $budgets->firstWhere('campus_id', $req->campus_id);
            $remaining = $budget ? $budget->getRemainingAmount() : 0;
            $insufficient = $totalCost > 0 && $remaining < $totalCost;
            if ($insufficient || ($totalCost == 0 && $budget)) {
                $pendingForBudget[] = [
                    'request' => $req,
                    'total_cost' => $totalCost,
                    'budget_remaining' => $remaining,
                    'insufficient' => $insufficient,
                ];
            }
        }

        return view('budgets.strategic-dashboard', [
            'budgets' => $budgets,
            'year' => $year,
            'pendingForBudget' => $pendingForBudget,
        ]);
    }

    /**
     * Display list of budgets
     *
     * Point focal et directeur : tous les budgets (lecture seule pour le point focal).
     * Staff : uniquement les budgets de son campus.
     * Les montants dépensés sont synchronisés avec les commandes validées (demandes de matériel).
     */
    public function index(Request $request): View
    {
        $user = $request->user();

        $query = Budget::with([
            'campus',
            'approvedBy',
        ]);

        if (!$user->canViewAllCampuses()) {
            $query->where('campus_id', $user->campus_id);
        }

        $tab = $request->get('tab', 'all');
        if (in_array($tab, ['draft', 'approved', 'active'], true)) {
            $query->where('status', $tab);
        }

        $budgets = $query->orderBy('fiscal_year', 'desc')->paginate(15)->withQueryString();

        $baseQuery = Budget::query();
        if (!$user->canViewAllCampuses()) {
            $baseQuery->where('campus_id', $user->campus_id);
        }
        $stats = [
            'total' => (clone $baseQuery)->count(),
            'draft' => (clone $baseQuery)->where('status', 'draft')->count(),
            'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
            'active' => (clone $baseQuery)->where('status', 'active')->count(),
        ];

        $readOnly = $user->hasAnyRole(['point_focal']) && !$user->hasAnyRole(['director', 'super_admin']);

        return view('budgets.index', [
            'budgets' => $budgets,
            'stats' => $stats,
            'readOnly' => $readOnly,
        ]);
    }

    /**
     * Show form to create new budget
     *
     * Director-only. Provide campus and fiscal year selection
     *
     * @param Request $request
     * @return View
     */
    public function create(Request $request): View
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Seuls les directeurs peuvent créer des budgets.');
        }

        $campuses = Campus::active()->orderBy('name')->get();
        $currentYear = now()->year;

        return view('budgets.create', [
            'campuses' => $campuses,
            'currentYear' => $currentYear,
            'nextYear' => $currentYear + 1,
        ]);
    }

    /**
     * Store new budget
     *
     * @param Request $request
     * @return RedirectResponse|JsonResponse
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403);
        }

        $validated = $request->validate([
            'campus_id' => 'required|exists:campuses,id',
            'fiscal_year' => [
                'required',
                'integer',
                'min:2024',
                'max:2100',
                function (string $attribute, int $value, \Closure $fail) use ($request) {
                    $campusId = $request->input('campus_id');
                    if (!$campusId) {
                        return;
                    }
                    if (Budget::where('campus_id', $campusId)->where('fiscal_year', $value)->exists()) {
                        $fail('Un budget existe déjà pour ce campus et cette année. Vous ne pouvez pas créer un second. Pour augmenter le montant, utilisez « Ajouter du budget » sur la fiche du budget existant.');
                    }
                },
            ],
            'total_budget_amount' => 'required|integer|min:1|max:999999999',
        ], [
            'total_budget_amount.required' => 'Le montant total du budget est obligatoire.',
            'total_budget_amount.integer' => 'Le montant doit être un nombre entier (sans décimales).',
            'total_budget_amount.min' => 'Le montant doit être supérieur à zéro.',
        ]);

        try {
            $budget = $this->budgetService->createBudget(
                Campus::findOrFail($validated['campus_id']),
                $validated['fiscal_year'],
                $validated['total_budget_amount'],
                $request->user()
            );

            return redirect()
                ->route('budgets.show', $budget)
                ->with('success', 'Budget créé. Statut : brouillon.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()])->withInput($request->only('campus_id', 'fiscal_year', 'total_budget_amount'));
        }
    }

    /**
     * Display specific budget (by campus, one per fiscal year)
     *
     * Shows total, spent, and remaining amounts. Complément possible via « Ajouter du budget ».
     *
     * @param Budget $budget
     * @return View
     */
    public function show(Budget $budget): View
    {
        $this->authorize('view', $budget);

        $budget->load([
            'campus',
            'approvedBy',
        ]);

        $report = $this->budgetService->getBudgetReport(
            $budget->campus,
            $budget->fiscal_year
        );

        $user = auth()->user();
        $readOnly = $user->hasAnyRole(['point_focal']) && !$user->hasAnyRole(['director', 'super_admin']);

        return view('budgets.show', [
            'budget' => $budget,
            'report' => $report,
            'canApprove' => !$readOnly && $user->hasAnyRole(['director', 'super_admin']) && $budget->status === 'draft',
            'canActivate' => !$readOnly && $user->hasAnyRole(['director', 'super_admin']) && $budget->status === 'approved',
            'canDelete' => !$readOnly && $user->hasAnyRole(['director', 'super_admin']) && $this->budgetService->canDeleteBudget($budget),
            'canCloseAndRollover' => !$readOnly && $user->hasAnyRole(['director', 'super_admin']) && in_array($budget->status, ['active', 'approved'], true),
            'nextFiscalYear' => $budget->fiscal_year + 1,
            'readOnly' => $readOnly,
        ]);
    }

    /**
     * Approve draft budget
     *
     * Director only. Changes status from draft to approved
     *
     * @param Budget $budget
     * @param Request $request
     * @return RedirectResponse
     */
    public function approve(Budget $budget, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403);
        }

        try {
            $this->budgetService->approveBudget($budget, $request->user());

            return redirect()
                ->route('budgets.show', $budget)
                ->with('success', 'Budget approuvé. Vous pouvez l\'activer.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Ajouter du budget pour la même année (déblocage en cas de budget insuffisant).
     * Directeur uniquement. Augmente total_budget du budget actif.
     */
    public function addAmount(Budget $budget, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Seuls les directeurs peuvent ajouter du budget.');
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1|max:999999999',
        ], [
            'amount.required' => 'Le montant à ajouter est obligatoire.',
            'amount.min' => 'Le montant doit être supérieur à zéro.',
        ]);

        $amount = (float) $validated['amount'];
        if ($budget->status !== 'active' && $budget->status !== 'approved') {
            return back()->withErrors(['error' => 'Seul un budget actif ou approuvé peut être complété.']);
        }

        $budget->increment('total_budget', $amount);

        return redirect()
            ->route('budgets.show', $budget)
            ->with('success', 'Budget complété : ' . number_format($amount, 0, ',', ' ') . ' FCFA ajoutés. Nouveau total : ' . number_format($budget->fresh()->total_budget, 0, ',', ' ') . ' FCFA.');
    }

    /**
     * Activate approved budget
     *
     * Director only. Changes status from approved to active
     * Makes budget active for spending
     *
     * @param Budget $budget
     * @param Request $request
     * @return RedirectResponse
     */
    public function activate(Budget $budget, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403);
        }

        try {
            $this->budgetService->activateBudget($budget, $request->user());

            return redirect()
                ->route('budgets.show', $budget)
                ->with('success', 'Budget activé.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Supprimer un budget (uniquement si aucune dépense enregistrée).
     * Directeur / Super Admin.
     */
    public function destroy(Budget $budget, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403);
        }

        try {
            $this->budgetService->deleteBudget($budget, $request->user());
            return redirect()
                ->route('budgets.index')
                ->with('success', 'Budget supprimé.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Clôturer l'exercice et reporter le solde vers l'année suivante.
     * Le budget passe en "closed", le solde (total - dépensé) est ajouté au budget de l'année N+1 (créé si besoin).
     */
    public function closeAndRollover(Budget $budget, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403);
        }

        $this->authorize('view', $budget);

        try {
            $nextBudget = $this->budgetService->closeAndRollover($budget, $request->user());

            $remaining = $budget->getRemainingAmount();
            if ($remaining > 0 && $nextBudget->id !== $budget->id) {
                return redirect()
                    ->route('budgets.show', $nextBudget)
                    ->with('success', 'Exercice ' . $budget->fiscal_year . ' clôturé. Solde de ' . number_format($remaining, 0, ',', ' ') . ' FCFA reporté sur l\'exercice ' . $nextBudget->fiscal_year . '.');
            }

            return redirect()
                ->route('budgets.show', $budget)
                ->with('success', 'Exercice ' . $budget->fiscal_year . ' clôturé.' . ($remaining <= 0 ? ' Aucun solde à reporter.' : ''));
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Allocations par département désactivées : redirection vers la fiche budget.
     */
    public function allocations(Budget $budget): \Illuminate\Http\RedirectResponse
    {
        $this->authorize('view', $budget);

        return redirect()
            ->route('budgets.show', $budget)
            ->with('info', 'Gestion des budgets par campus uniquement. Les allocations par département ne sont pas utilisées.');
    }

    /**
     * API endpoint: Get budget summary
     *
     * Returns JSON summary of budget state for dashboard/reports
     *
     * @param Budget $budget
     * @return JsonResponse
     */
    public function summary(Budget $budget): JsonResponse
    {
        return response()->json([
            'id' => $budget->id,
            'campus' => $budget->campus->name,
            'fiscal_year' => $budget->fiscal_year,
            'status' => $budget->status,
            'total_amount' => $budget->total_budget,
            'spent_amount' => $budget->spent_amount,
            'remaining_amount' => $budget->getRemainingAmount(),
            'utilization_percentage' => $budget->getUtilizationPercentage(),
            'expense_count' => $budget->expenses()->count(),
        ]);
    }

    /**
     * API endpoint: Get budgets with low remaining funds
     *
     * Returns budgets where utilization > 80%
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function AlertsHigh(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasAnyRole(['director', 'super_admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $alerts = $this->budgetService->getBudgetsExceedingThreshold(80);

        return response()->json([
            'high_utilization_budgets' => $alerts,
            'summary' => [
                'total_budgets_at_risk' => count($alerts),
                'total_at_risk_amount' => collect($alerts)->sum('spent_amount'),
            ]
        ]);
    }

    /**
     * API endpoint: List active budgets (by campus/year)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getActive(Request $request): JsonResponse
    {
        $campusId = $request->input('campus_id');
        $fiscalYear = $request->input('fiscal_year', now()->year);

        $budgets = Budget::where('status', 'active')
            ->where('fiscal_year', $fiscalYear)
            ->when($campusId, fn($q) => $q->where('campus_id', $campusId))
            ->with('campus')
            ->get()
            ->map(fn($b) => [
                'id' => $b->id,
                'campus' => $b->campus->name,
                'fiscal_year' => $b->fiscal_year,
                'total' => $b->total_budget,
                'remaining_unallocated' => $b->getRemainingUnallocated(),
                'remaining_amount' => $b->getRemainingAmount(),
            ]);

        return response()->json($budgets);
    }
}
