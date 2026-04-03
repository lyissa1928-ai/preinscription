<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * BudgetAllocation Model
 *
 * Department-level allocation from campus budget
 * Department managers track spending against their allocation
 *
 * @property int $id
 * @property int $budget_id
 * @property int $department_id
 * @property float $allocated_amount
 * @property float $spent_amount
 * @property float $remaining_amount (computed)
 * @property string $status 'active', 'depleted', 'frozen'
 * @property string $notes
 */
class BudgetAllocation extends Model
{
    /** @use HasFactory<\Database\Factories\BudgetAllocationFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'budget_allocations';

    protected $fillable = [
        'budget_id',
        'department_id',
        'allocated_amount',
        'spent_amount',
        'status',
        'notes',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'spent_amount' => 'decimal:2',
    ];

    /**
     * Get the parent budget
     */
    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    /**
     * Get the department
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get expenses charged to this allocation
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Get remaining budget
     */
    public function getRemainingAmount()
    {
        return $this->allocated_amount - $this->spent_amount;
    }

    /**
     * Check if amount can be spent
     */
    public function canSpend($amount): bool
    {
        return $this->getRemainingAmount() >= $amount;
    }

    /**
     * Get budget utilization percentage
     */
    public function getUtilizationPercentage()
    {
        if ($this->allocated_amount == 0) {
            return 0;
        }
        return ($this->spent_amount / $this->allocated_amount) * 100;
    }

    /**
     * Record expense against this allocation
     */
    public function recordExpense($amount, $description, User $user)
    {
        $this->expenses()->create([
            'amount' => $amount,
            'description' => $description,
            'expense_date' => now(),
            'recorded_by_user_id' => $user->id,
        ]);

        $this->spent_amount += $amount;

        if ($this->getRemainingAmount() <= 0) {
            $this->status = 'depleted';
        }

        $this->save();
        $this->budget->refresh();
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
