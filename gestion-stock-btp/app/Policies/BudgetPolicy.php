<?php

namespace App\Policies;

use App\Models\Budget;
use App\Models\User;

/**
 * BudgetPolicy
 *
 * Gate access to budget operations
 * Director-only creation, approval, activation
 * Campus scoped viewing for managers
 */
class BudgetPolicy
{
    /**
     * Point focal : tous les budgets en lecture seule.
     * Directeur / super_admin : tous, avec écriture.
     * Staff : uniquement le budget de son campus.
     */
    public function view(User $user, Budget $budget): bool
    {
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        if ($user->hasRole('point_focal')) {
            return true;
        }

        if ($user->hasRole('staff') && $user->campus_id === $budget->campus_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can create budget
     *
     * Director ONLY
     *
     * @param User $user
     * @return bool
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['director', 'super_admin']) && $user->can('budget.create');
    }

    /**
     * Determine if user can update budget (not typical - budgets are immutable after approval)
     *
     * Draft budgets can be updated by director only
     *
     * @param User $user
     * @param Budget $budget
     * @return bool
     */
    public function update(User $user, Budget $budget): bool
    {
        // Only draft budgets can be updated
        if ($budget->status !== 'draft') {
            return false;
        }

        return $user->hasAnyRole(['director', 'super_admin']);
    }

    /**
     * Determine if user can delete budget
     *
     * Draft budgets only, Director only
     *
     * @param User $user
     * @param Budget $budget
     * @return bool
     */
    public function delete(User $user, Budget $budget): bool
    {
        // Only draft budgets can be deleted
        if ($budget->status !== 'draft') {
            return false;
        }

        return $user->hasAnyRole(['director', 'super_admin']);
    }

    /**
     * Determine if user can approve budget
     *
     * Director only
     * Budget must be in draft status
     *
     * @param User $user
     * @param Budget $budget
     * @return bool
     */
    public function approve(User $user, Budget $budget): bool
    {
        // Permission check
        if (!$user->can('budget.approve')) {
            return false;
        }

        // Director only
        if (!$user->hasAnyRole(['director', 'super_admin'])) {
            return false;
        }

        // Must be draft status
        return $budget->status === 'draft';
    }

    /**
     * Determine if user can activate budget
     *
     * Director only
     * Budget must be approved status
     *
     * @param User $user
     * @param Budget $budget
     * @return bool
     */
    public function activate(User $user, Budget $budget): bool
    {
        // Permission check
        if (!$user->can('budget.activate')) {
            return false;
        }

        // Director only
        if (!$user->hasAnyRole(['director', 'super_admin'])) {
            return false;
        }

        // Must be approved status
        return $budget->status === 'approved';
    }

    /**
     * Determine if user can allocate from budget
     *
     * Director only
     * Budget must be active
     *
     * @param User $user
     * @param Budget $budget
     * @return bool
     */
    public function allocate(User $user, Budget $budget): bool
    {
        // Permission check
        if (!$user->can('budget_allocation.create')) {
            return false;
        }

        // Director only
        if (!$user->hasAnyRole(['director', 'super_admin'])) {
            return false;
        }

        // Must be active status
        return $budget->status === 'active';
    }

    /**
     * Determine if user can view budget report
     *
     * Director, Campus Manager, Site Manager (own campus), staff (own campus)
     *
     * @param User $user
     * @param Budget $budget
     * @return bool
     */
    public function viewReport(User $user, Budget $budget): bool
    {
        return $this->view($user, $budget) && $user->can('budget.view_report');
    }
}
