<?php

namespace App\Policies;

use App\Models\BudgetAllocation;
use App\Models\User;

/**
 * BudgetAllocationPolicy
 *
 * Gate access to budget allocation operations
 * Managers can allocate budgets
 * Staff can record expenses against allocations
 */
class BudgetAllocationPolicy
{
    /**
     * Determine if user can view budget allocation
     *
     * Director can view all
     * Campus Manager can view own campus allocations
     * Staff can view allocations in own campus
     *
     * @param User $user
     * @param BudgetAllocation $allocation
     * @return bool
     */
    public function view(User $user, BudgetAllocation $allocation): bool
    {
        // Director can view all
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus manager can view own campus
        if ($user->hasRole('point_focal') && 
            $allocation->department->campus_id === $user->campus_id) {
            return true;
        }

        // Staff can view own campus
        if ($user->hasRole('staff') && 
            $allocation->department->campus_id === $user->campus_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can create allocation (allocate to department)
     *
     * Director only. Super Admin ne peut pas allouer de budget.
     *
     * @param User $user
     * @return bool
     */
    public function create(User $user): bool
    {
        return $user->hasRole('director') && $user->can('budget_allocation.create');
    }

    /**
     * Determine if user can record expense against allocation
     *
     * Campus Manager, Site Manager (own campus), Staff (own campus), Director
     *
     * @param User $user
     * @param BudgetAllocation $allocation
     * @return bool
     */
    public function recordExpense(User $user, BudgetAllocation $allocation): bool
    {
        // Permission check
        if (!$user->can('budget_allocation.record_expense')) {
            return false;
        }

        // Director can record against any (Super Admin n'a pas la permission record_expense)
        if ($user->hasRole('director')) {
            return true;
        }

        // Campus Manager (own campus)
        if ($user->hasRole('point_focal') && 
            $allocation->department->campus_id === $user->campus_id) {
            return true;
        }

        // Site Manager (own campus)
        if ($user->hasRole('site_manager') && 
            $allocation->department->campus_id === $user->campus_id) {
            return true;
        }

        // Staff (own campus)
        if ($user->hasRole('staff') && 
            $allocation->department->campus_id === $user->campus_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can approve expense
     *
     * Campus Manager, Director only
     *
     * @param User $user
     * @param BudgetAllocation $allocation
     * @return bool
     */
    public function approveExpense(User $user, BudgetAllocation $allocation): bool
    {
        // Permission check
        if (!$user->can('budget_allocation.approve_expense')) {
            return false;
        }

        // Director can approve any (Super Admin n'a pas la permission approve_expense)
        if ($user->hasRole('director')) {
            return true;
        }

        // Campus Manager can approve own campus
        if ($user->hasRole('point_focal') && 
            $allocation->department->campus_id === $user->campus_id) {
            return true;
        }

        return false;
    }
}
