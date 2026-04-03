<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Expense Model
 *
 * Records expenses charged against budget allocations
 * Links to aggregated orders for reconciliation
 *
 * @property int $id
 * @property int $budget_allocation_id
 * @property int|null $aggregated_order_id
 * @property float $amount
 * @property string $category 'material', 'service', 'maintenance', 'other'
 * @property string $description
 * @property \Illuminate\Support\Carbon $expense_date
 * @property string $reference_number
 * @property string $status 'pending', 'approved', 'reconciled'
 * @property int $recorded_by_user_id
 */
class Expense extends Model
{
    /** @use HasFactory<\Database\Factories\ExpenseFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'expenses';

    protected $fillable = [
        'budget_id',
        'budget_allocation_id',
        'aggregated_order_id',
        'material_request_id',
        'amount',
        'category',
        'description',
        'expense_date',
        'reference_number',
        'status',
        'recorded_by_user_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
    ];

    /**
     * Budget (dépense directe campus, ex. demande validée).
     */
    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    /**
     * Get the budget allocation (dépense par département).
     */
    public function budgetAllocation(): BelongsTo
    {
        return $this->belongsTo(BudgetAllocation::class);
    }

    /**
     * Demande de matériel ayant généré cette dépense (si validation point focal).
     */
    public function materialRequest(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class);
    }

    /**
     * Get the aggregated order (if applicable)
     */
    public function aggregatedOrder(): BelongsTo
    {
        return $this->belongsTo(AggregatedOrder::class);
    }

    /**
     * Get the user who recorded expense
     */
    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }

    /**
     * Approve expense
     */
    public function approve(): void
    {
        $this->update(['status' => 'approved']);
    }

    /**
     * Mark as reconciled
     */
    public function reconcile(): void
    {
        $this->update(['status' => 'reconciled']);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
}
