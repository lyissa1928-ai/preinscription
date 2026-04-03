<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\BudgetAllocation;
use App\Models\Expense;
use App\Models\Campus;
use App\Models\Department;
use App\Models\AggregatedOrder;
use App\Models\MaterialRequest;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Illuminate\Database\Eloquent\Collection;

/**
 * BudgetService
 *
 * Manages budget lifecycle: creation, allocation, tracking, and forecasting
 * Ensures budget compliance and prevents overspending
 *
 * Key Responsibilities:
 * - Create and approve budgets
 * - Allocate budgets to departments
 * - Track expenses against allocations
 * - Generate budget reports and alerts
 * - Enforce spending controls
 */
class BudgetService
{
    /**
     * Create new budget for a campus and fiscal year
     *
     * @param Campus $campus
     * @param int $fiscalYear
     * @param float $totalBudget Total budget amount
     * @param User $createdByUser
     * @param array $options notes, etc.
     *
     * @return Budget
     * @throws InvalidArgumentException If budget already exists for this campus/year
     */
    public function createBudget(
        Campus $campus,
        int $fiscalYear,
        float $totalBudget,
        User $createdByUser,
        array $options = []
    ): Budget {
        // Check if budget already exists
        $existing = Budget::where('campus_id', $campus->id)
            ->where('fiscal_year', $fiscalYear)
            ->exists();

        if ($existing) {
            throw new InvalidArgumentException(
                "Un seul budget par campus et par année. Un budget existe déjà pour {$campus->name} en {$fiscalYear}. En cas d'épuisement, utilisez « Ajouter du budget » sur la fiche du budget existant."
            );
        }

        if ($totalBudget <= 0) {
            throw new InvalidArgumentException('Budget amount must be positive');
        }

        $budget = Budget::create([
            'campus_id' => $campus->id,
            'fiscal_year' => $fiscalYear,
            'total_budget' => $totalBudget,
            'status' => 'draft',
            'notes' => $options['notes'] ?? null,
        ]);

        ActivityLog::logCreated($budget, $createdByUser);

        return $budget;
    }

    /**
     * Approve a budget
     *
     * State transition: draft → approved
     * Sets budget to active for allocations
     *
     * @param Budget $budget
     * @param User $approver User with director role
     * @throws InvalidArgumentException If not draft or user not authorized
     */
    public function approveBudget(Budget $budget, User $approver): void
    {
        if ($budget->status !== 'draft') {
            throw new InvalidArgumentException('Only draft budgets can be approved');
        }

        if (!$approver->hasAnyRole(['director', 'super_admin'])) {
            throw new InvalidArgumentException('Only directors can approve budgets');
        }

        $budget->update([
            'status' => 'approved',
            'approved_by_user_id' => $approver->id,
            'approved_at' => now(),
        ]);

        ActivityLog::logAction(
            $budget,
            'approved',
            "Budget approved by {$approver->name}",
            $approver,
            ['previous_status' => 'draft', 'new_status' => 'approved']
        );
    }

    /**
     * Activate a budget for allocations
     *
     * State transition: approved → active
     *
     * @param Budget $budget
     * @param User $user
     */
    public function activateBudget(Budget $budget, User $user): void
    {
        if ($budget->status !== 'approved') {
            throw new InvalidArgumentException('Only approved budgets can be activated');
        }

        $budget->update(['status' => 'active']);

        ActivityLog::logAction(
            $budget,
            'updated',
            'Budget activated for allocations',
            $user,
            ['previous_status' => 'approved', 'new_status' => 'active']
        );
    }

    /**
     * Allocate portion of budget to a department
     *
     * Subtracts from campus total and assigns to department
     * Creates BudgetAllocation record
     *
     * @param Budget $budget Parent budget
     * @param Department $department Target department
     * @param float $amount Amount to allocate
     * @param User $allocatedBy
     *
     * @return BudgetAllocation
     * @throws InvalidArgumentException If insufficient funds or allocation exists
     */
    public function allocateToDepartment(
        Budget $budget,
        Department $department,
        float $amount,
        User $allocatedBy
    ): BudgetAllocation {
        // Validate budget status
        if ($budget->status !== 'active') {
            throw new InvalidArgumentException('Can only allocate from active budgets');
        }

        // Validate department belongs to campus
        if ($department->campus_id !== $budget->campus_id) {
            throw new InvalidArgumentException('Department does not belong to this campus');
        }

        // Check for existing allocation
        if (BudgetAllocation::where('budget_id', $budget->id)
            ->where('department_id', $department->id)
            ->exists()) {
            throw new InvalidArgumentException(
                "Allocation for {$department->name} already exists"
            );
        }

        // Validate available funds
        if (!$budget->canAllocate($amount)) {
            throw new InvalidArgumentException(
                "Insufficient unallocated funds. Available: {$budget->getRemainingUnallocated()}"
            );
        }

        return DB::transaction(function () use ($budget, $department, $amount, $allocatedBy) {
            // Create allocation
            $allocation = BudgetAllocation::create([
                'budget_id' => $budget->id,
                'department_id' => $department->id,
                'allocated_amount' => $amount,
                'status' => 'active',
            ]);

            // Update campus total allocated
            $budget->increment('allocated_amount', $amount);

            ActivityLog::logAction(
                $allocation,
                'created',
                "Allocated \${$amount} to {$department->name}",
                $allocatedBy,
                ['allocated_to' => $department->name]
            );

            return $allocation;
        });
    }

    /**
     * Enregistrer une dépense directe sur le budget campus (ex. validation d'une demande par le point focal).
     * Vérifie le solde disponible avant d'enregistrer.
     *
     * @param Budget $budget Budget actif du campus
     * @param float $amount Montant total (coût de la demande)
     * @param string $description Libellé (ex. "Demande #XXX")
     * @param User $recordedByUser Point focal ou directeur
     * @param MaterialRequest|null $request Demande concernée
     * @return Expense
     * @throws InvalidArgumentException Si budget insuffisant ou budget non actif
     */
    public function recordExpenseAgainstBudget(
        Budget $budget,
        float $amount,
        string $description,
        User $recordedByUser,
        ?MaterialRequest $request = null
    ): Expense {
        if ($budget->status !== 'active') {
            throw new InvalidArgumentException('Seul un budget actif peut être débité.');
        }
        if (!$budget->canSpend($amount)) {
            $remaining = $budget->getRemainingAmount();
            throw new InvalidArgumentException(
                "Budget insuffisant. Solde disponible : " . number_format($remaining, 0, ',', ' ') . " FCFA. Montant demandé : " . number_format($amount, 0, ',', ' ') . " FCFA."
            );
        }

        $expense = null;
        DB::transaction(function () use ($budget, $amount, $description, $recordedByUser, $request, &$expense) {
            $expense = Expense::create([
                'budget_id' => $budget->id,
                'budget_allocation_id' => null,
                'material_request_id' => $request?->id,
                'amount' => $amount,
                'category' => 'material',
                'description' => $description,
                'expense_date' => now()->toDateString(),
                'recorded_by_user_id' => $recordedByUser->id,
                'status' => 'approved',
            ]);
            $budget->increment('spent_amount', $amount);
            ActivityLog::logCreated($expense, $recordedByUser);
        });

        // Alerte 70 % : notifier les directeurs dès que le budget utilisé dépasse 70 %
        $budget->refresh();
        if ($budget->total_budget > 0) {
            $utilization = ($budget->spent_amount / $budget->total_budget) * 100;
            if ($utilization >= 70) {
                \App\Models\AppNotification::notifyBudgetAlert70($budget);
            }
        }

        return $expense;
    }

    /**
     * Record expense against a budget allocation
     *
     * Validates allocation has remaining funds
     * Updates spent_amount
     * Links to AggregatedOrder if from PO
     *
     * @param BudgetAllocation $allocation
     * @param float $amount Expense amount
     * @param string $description
     * @param User $recordedByUser
     * @param AggregatedOrder|null $order Associated PO (optional)
     *
     * @return Expense
     * @throws InvalidArgumentException If insufficient allocation funds
     */
    public function recordExpense(
        BudgetAllocation $allocation,
        float $amount,
        string $description,
        User $recordedByUser,
        AggregatedOrder $order = null
    ): Expense {
        if (!$allocation->canSpend($amount)) {
            throw new InvalidArgumentException(
                "Insufficient allocated funds. Remaining: {$allocation->getRemainingAmount()}"
            );
        }

        $expense = null;

        DB::transaction(function () use (
            $allocation,
            $amount,
            $description,
            $recordedByUser,
            $order,
            &$expense
        ) {
            // Create expense record
            $expense = $allocation->expenses()->create([
                'amount' => $amount,
                'aggregated_order_id' => $order?->id,
                'category' => 'material', // TODO: Add category parameter
                'description' => $description,
                'expense_date' => now()->toDate(),
                'recorded_by_user_id' => $recordedByUser->id,
                'status' => 'pending',
            ]);

            // Update allocation spent amount
            $allocation->increment('spent_amount', $amount);

            // Update budget spent amount
            $allocation->budget->increment('spent_amount', $amount);

            // Check if allocation is depleted
            if ($allocation->getRemainingAmount() <= 0) {
                $allocation->update(['status' => 'depleted']);
            }

            ActivityLog::logCreated($expense, $recordedByUser);
        });

        return $expense;
    }

    /**
     * Approve an expense
     *
     * State transition: pending → approved
     *
     * @param Expense $expense
     * @param User $approver
     */
    public function approveExpense(Expense $expense, User $approver): void
    {
        if ($expense->status !== 'pending') {
            throw new InvalidArgumentException('Only pending expenses can be approved');
        }

        $expense->approve();

        ActivityLog::logAction(
            $expense,
            'approved',
            'Expense approved',
            $approver
        );
    }

    /**
     * Get budget report for a campus
     *
     * Comprehensive overview of budget status, allocations, and spending
     *
     * @param Campus $campus
     * @param int|null $fiscalYear If null, returns current year
     *
     * @return array Budget report with details
     */
    public function getBudgetReport(Campus $campus, int $fiscalYear = null): array
    {
        if (!$fiscalYear) {
            $fiscalYear = now()->year;
        }

        $budget = Budget::where('campus_id', $campus->id)
            ->where('fiscal_year', $fiscalYear)
            ->with('budgetAllocations')
            ->first();

        if (!$budget) {
            return [
                'status' => 'no_budget',
                'message' => "No budget found for {$campus->name} in {$fiscalYear}",
            ];
        }

        $allocations = $budget->budgetAllocations;

        return [
            'campus' => $campus->name,
            'fiscal_year' => $fiscalYear,
            'status' => $budget->status,
            'total_budget' => $budget->total_budget,
            'allocated_amount' => $budget->allocated_amount,
            'spent_amount' => $budget->spent_amount,
            'remaining_total' => $budget->getRemainingUnallocated(),
            'utilization_percentage' => $budget->getUtilizationPercentage(),
            'allocations' => $allocations->map(function ($allocation) {
                return [
                    'department' => $allocation->department->name,
                    'allocated_amount' => $allocation->allocated_amount,
                    'spent_amount' => $allocation->spent_amount,
                    'remaining_amount' => $allocation->getRemainingAmount(),
                    'utilization_percentage' => $allocation->getUtilizationPercentage(),
                    'status' => $allocation->status,
                ];
            })->all(),
        ];
    }

    /**
     * Get campus budgets exceeding threshold
     *
     * Alerts for budgets above 80% utilization
     *
     * @param float $threshold Percentage threshold (0-100)
     *
     * @return Collection Budgets exceeding threshold
     */
    public function getBudgetsExceedingThreshold(float $threshold = 80): Collection
    {
        return Budget::where('status', 'active')
            ->get()
            ->filter(function ($budget) use ($threshold) {
                return $budget->getUtilizationPercentage() >= $threshold;
            });
    }

    /**
     * Vérifie si un budget peut être supprimé (aucune dépense enregistrée).
     */
    public function canDeleteBudget(Budget $budget): bool
    {
        return (float) $budget->spent_amount === 0.0;
    }

    /**
     * Supprime un budget (soft delete). Autorisé uniquement si aucune dépense.
     */
    public function deleteBudget(Budget $budget, User $user): void
    {
        if (!$this->canDeleteBudget($budget)) {
            throw new InvalidArgumentException('Impossible de supprimer un budget qui a déjà des dépenses enregistrées.');
        }

        $budget->delete();
        ActivityLog::logAction(
            $budget,
            'deleted',
            "Budget {$budget->campus->name} FY{$budget->fiscal_year} supprimé par {$user->name}",
            $user,
            []
        );
    }

    /**
     * Clôture l'exercice et reporte le solde vers l'année suivante.
     * - Passe le budget en statut 'closed'
     * - Calcule le solde restant (total_budget - spent_amount)
     * - Crée le budget de l'année suivante avec ce solde en montant initial, ou l'ajoute au budget existant
     *
     * @return Budget Le budget de l'année suivante (créé ou mis à jour)
     */
    public function closeAndRollover(Budget $budget, User $user): Budget
    {
        if ($budget->status === 'closed') {
            throw new InvalidArgumentException('Ce budget est déjà clôturé.');
        }

        $remaining = $budget->getRemainingAmount();
        $nextYear = $budget->fiscal_year + 1;

        return DB::transaction(function () use ($budget, $user, $remaining, $nextYear) {
            $previousStatus = $budget->status;
            $budget->update(['status' => 'closed']);

            ActivityLog::logAction(
                $budget,
                'updated',
                "Budget clôturé. Solde reporté vers exercice {$nextYear}.",
                $user,
                ['previous_status' => $previousStatus, 'new_status' => 'closed', 'remaining_reported' => $remaining]
            );

            $nextBudget = Budget::where('campus_id', $budget->campus_id)
                ->where('fiscal_year', $nextYear)
                ->first();

            if ($nextBudget) {
                if ($remaining > 0) {
                    $nextBudget->increment('total_budget', $remaining);
                    ActivityLog::logAction(
                        $nextBudget,
                        'updated',
                        "Solde de l'exercice {$budget->fiscal_year} reporté : +" . number_format($remaining, 0, ',', ' ') . " FCFA.",
                        $user,
                        ['amount_added' => $remaining]
                    );
                }
                return $nextBudget->fresh();
            }

            if ($remaining <= 0) {
                return $budget; // Pas de budget suivant à créer si solde nul
            }

            $nextBudget = $this->createBudget(
                $budget->campus,
                $nextYear,
                $remaining,
                $user,
                ['notes' => "Report du solde de l'exercice {$budget->fiscal_year} (clôture automatique)."]
            );

            return $nextBudget;
        });
    }
}
