<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Budget Model
 *
 * Annual or periodic budget allocation per campus
 * Top-level budget container that gets allocated to departments
 *
 * @property int $id
 * @property int $campus_id
 * @property int $fiscal_year
 * @property float $total_budget
 * @property float $allocated_amount Amount allocated to departments
 * @property float $spent_amount Total spent
 * @property string $status 'draft', 'approved', 'active', 'closed'
 * @property string $notes
 * @property int|null $approved_by_user_id
 * @property \Illuminate\Support\Carbon|null $approved_at
 */
class Budget extends Model
{
    /** @use HasFactory<\Database\Factories\BudgetFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'budgets';

    protected $fillable = [
        'campus_id',
        'fiscal_year',
        'total_budget',
        'allocated_amount',
        'spent_amount',
        'status',
        'notes',
        'approved_by_user_id',
        'approved_at',
    ];

    protected $casts = [
        'total_budget' => 'decimal:2',
        'allocated_amount' => 'decimal:2',
        'spent_amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    /**
     * Get the campus
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    /**
     * Get the approving user
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    /**
     * Get department allocations
     */
    public function budgetAllocations(): HasMany
    {
        return $this->hasMany(BudgetAllocation::class);
    }

    /**
     * Dépenses directes sur le budget (ex. validation de demandes par le point focal).
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Solde disponible pour les achats (total_budget - spent_amount).
     * Utilisé pour le contrôle budgétaire à la validation des demandes.
     */
    public function getRemainingAmount()
    {
        return $this->total_budget - $this->spent_amount;
    }

    /**
     * Vérifie si le budget peut supporter une dépense du montant donné.
     */
    public function canSpend(float $amount): bool
    {
        return $this->getRemainingAmount() >= $amount;
    }

    /**
     * Get remaining unallocated amount
     */
    public function getRemainingUnallocated()
    {
        return $this->total_budget - $this->allocated_amount;
    }

    /**
     * Check if budget has room for allocation
     */
    public function canAllocate($amount): bool
    {
        return $this->getRemainingUnallocated() >= $amount;
    }

    /**
     * Get budget utilization percentage (0 if no budget)
     */
    public function getUtilizationPercentage()
    {
        if ($this->total_budget <= 0) {
            return 0;
        }
        return ($this->spent_amount / $this->total_budget) * 100;
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
}
