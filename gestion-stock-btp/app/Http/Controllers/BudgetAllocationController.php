<?php

namespace App\Http\Controllers;

use App\Models\BudgetAllocation;
use App\Models\Budget;
use App\Models\Department;
use App\Http\Requests\AllocateBudgetRequest;
use App\Http\Requests\RecordExpenseRequest;
use App\Services\BudgetService;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

/**
 * BudgetAllocationController
 *
 * Allocations par département désactivées : gestion des budgets par campus uniquement.
 * Les routes restent définies mais redirigent vers la liste des budgets.
 */
class BudgetAllocationController extends Controller
{
    public function __construct(
        private BudgetService $budgetService
    ) {
        $this->middleware(function ($request, $next) {
            return redirect()
                ->route('budgets.index')
                ->with('info', 'La gestion des budgets est faite par campus uniquement. Les allocations par département ne sont pas utilisées.');
        });
    }

    /**
     * List budget allocations (by campus / department)
     *
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $query = BudgetAllocation::with(['budget.campus', 'department'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('campus_id')) {
            $query->whereHas('budget', fn($q) => $q->where('campus_id', $request->campus_id));
        }

        $allocations = $query->get();
        $campuses = \App\Models\Campus::where('is_active', true)->orderBy('name')->get();

        return view('budget-allocations.index', [
            'allocations' => $allocations,
            'campuses' => $campuses,
        ]);
    }

    /**
     * Show form to allocate budget to department
     *
     * Director-only. Select active budget and department
     *
     * @param Request $request
     * @return View
     */
    public function create(Request $request): View
    {
        if (!$request->user()->can('create', BudgetAllocation::class)) {
            abort(403, 'Seul le Directeur peut allouer des budgets aux départements.');
        }

        $budgets = Budget::where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->with('campus')
            ->get();

        return view('budget-allocations.create', [
            'budgets' => $budgets,
        ]);
    }

    /**
     * Store new budget allocation
     *
     * Creates allocation record, updates budget allocated_amount
     *
     * @param AllocateBudgetRequest $request
     * @return RedirectResponse
     */
    public function store(AllocateBudgetRequest $request): RedirectResponse
    {
        try {
            $validated = $request->validated();
            $budget = Budget::findOrFail($validated['budget_id']);

            $allocation = $this->budgetService->allocateToDepartment(
                $budget,
                Department::findOrFail($validated['department_id']),
                $validated['allocated_amount'],
                $request->user()
            );

            return redirect()
                ->route('budget-allocations.show', $allocation)
                ->with('success', 'Budget alloué au département.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Erreur lors de l\'allocation : ' . $e->getMessage()]);
        }
    }

    /**
     * Display specific allocation
     *
     * Shows allocation amount, spent, remaining, and expense history
     *
     * @param BudgetAllocation $allocation
     * @return View
     */
    public function show(BudgetAllocation $allocation): View
    {
        $this->authorize('view', $allocation);

        $allocation->load([
            'budget.campus',
            'department.campus',
            'expenses.recordedBy',
            'expenses.aggregatedOrder.supplier',
        ]);

        return view('budget-allocations.show', [
            'allocation' => $allocation,
            'expenses' => $allocation->expenses()->paginate(10),
            'canRecordExpense' => auth()->user()->isSiteScoped() 
                || auth()->user()->hasAnyRole(['director', 'super_admin']),
        ]);
    }

    /**
     * Show form to record expense against allocation
     *
     * Display remaining allocation and expense details form
     *
     * @param BudgetAllocation $allocation
     * @return View
     */
    public function recordExpenseForm(BudgetAllocation $allocation): View
    {
        $user = auth()->user();

        // Check authorization: same campus if site-scoped
        if ($user->isSiteScoped() && $allocation->department->campus_id !== $user->campus_id) {
            abort(403, 'Non autorisé pour ce département.');
        }

        // Can only record expense if allocation has remaining funds
        if ($allocation->getRemainingAmount() <= 0) {
            return back()->withErrors(['error' => 'Allocation épuisée. Impossible d\'enregistrer la dépense.']);
        }

        return view('budget-allocations.record-expense', [
            'allocation' => $allocation->load('budget', 'department'),
        ]);
    }

    /**
     * Record expense against allocation
     *
     * Creates expense record, updates allocation spent_amount
     * Links to purchase order if applicable
     *
     * @param BudgetAllocation $allocation
     * @param RecordExpenseRequest $request
     * @return RedirectResponse
     */
    public function recordExpense(
        BudgetAllocation $allocation,
        RecordExpenseRequest $request
    ): RedirectResponse {
        try {
            $validated = $request->validated();

            $expense = $this->budgetService->recordExpense(
                $allocation,
                $validated['amount'],
                $validated['description'],
                $request->user(),
                $validated['aggregated_order_id'] ?? null,
                [
                    'category' => $validated['category'] ?? 'material',
                    'expense_date' => $validated['expense_date'] ?? now()->toDate(),
                    'reference_number' => $validated['reference_number'] ?? null,
                ]
            );

            return redirect()
                ->route('budget-allocations.show', $allocation)
                ->with('success', 'Dépense enregistrée. Allocation mise à jour.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Erreur lors de l\'enregistrement de la dépense : ' . $e->getMessage()]);
        }
    }

    /**
     * Show expenses for allocation
     *
     * Paginated list with filtering options
     *
     * @param BudgetAllocation $allocation
     * @param Request $request
     * @return View
     */
    public function expenses(BudgetAllocation $allocation, Request $request): View
    {
        $this->authorize('view', $allocation);

        $query = $allocation->expenses();

        // Filter by status if provided
        if ($request->input('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by category if provided
        if ($request->input('category')) {
            $query->where('category', $request->input('category'));
        }

        $expenses = $query->with(['recordedBy', 'aggregatedOrder'])
            ->orderBy('expense_date', 'desc')
            ->paginate(15);

        return view('budget-allocations.expenses', [
            'allocation' => $allocation,
            'expenses' => $expenses,
            'statusOptions' => ['pending', 'approved', 'reconciled'],
            'categoryOptions' => ['material', 'service', 'maintenance', 'other'],
        ]);
    }

    /**
     * Approve pending expense
     *
     * Director/Campus Manager only. Changes status from pending to approved
     *
     * @param BudgetAllocation $allocation
     * @param int $expenseId
     * @param Request $request
     * @return RedirectResponse
     */
    public function approveExpense(
        BudgetAllocation $allocation,
        int $expenseId,
        Request $request
    ): RedirectResponse {
        $user = $request->user();

        if (!$user->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Vous ne pouvez pas approuver cette dépense.');
        }

        try {
            $expense = $allocation->expenses()->findOrFail($expenseId);

            $this->budgetService->approveExpense($expense, $user);

            return redirect()
                ->back()
                ->with('success', 'Dépense approuvée.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * API endpoint: Get departments for budget (AJAX)
     *
     * Returns departments belonging to budget's campus
     *
     * @param Request $request
     * @param int $budgetId
     * @return JsonResponse
     */
    public function getDepartments(Request $request, int $budgetId): JsonResponse
    {
        $budget = Budget::findOrFail($budgetId);

        // Get departments for this campus that don't already have allocation in this budget
        $allocatedDeptIds = $budget->budgetAllocations()
            ->pluck('department_id')
            ->toArray();

        $departments = Department::where('campus_id', $budget->campus_id)
            ->where('is_active', true)
            ->whereNotIn('id', $allocatedDeptIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($departments);
    }

    /**
     * API endpoint: Check remaining allocation amount
     *
     * Used in expense form to validate amount input
     *
     * @param Request $request
     * @param int $allocationId
     * @return JsonResponse
     */
    public function getRemainingAmount(Request $request, int $allocationId): JsonResponse
    {
        $allocation = BudgetAllocation::findOrFail($allocationId);

        return response()->json([
            'allocated_amount' => $allocation->allocated_amount,
            'spent_amount' => $allocation->spent_amount,
            'remaining_amount' => $allocation->getRemainingAmount(),
            'utilization_percentage' => $allocation->getUtilizationPercentage(),
            'is_depleted' => $allocation->getRemainingAmount() <= 0,
        ]);
    }

    /**
     * API endpoint: Get allocation summary
     *
     * Returns JSON summary for dashboard display
     *
     * @param BudgetAllocation $allocation
     * @return JsonResponse
     */
    public function summary(BudgetAllocation $allocation): JsonResponse
    {
        return response()->json([
            'id' => $allocation->id,
            'budget' => $allocation->budget->id,
            'department' => $allocation->department->name,
            'allocated_amount' => $allocation->allocated_amount,
            'spent_amount' => $allocation->spent_amount,
            'remaining_amount' => $allocation->getRemainingAmount(),
            'utilization_percentage' => $allocation->getUtilizationPercentage(),
            'expense_count' => $allocation->expenses()->count(),
            'status' => $allocation->status ?? 'active',
        ]);
    }
}
