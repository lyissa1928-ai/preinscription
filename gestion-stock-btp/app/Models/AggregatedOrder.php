<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

/**
 * AggregatedOrder Model
 *
 * Purchase orders created by Point Focal aggregating RequestItems from multiple campuses
 * Central piece of Federation: combines many RequestItems into one supplier order
 * Maintains full traceability via AggregatedOrderItems pivot
 *
 * @property int $id
 * @property int $supplier_id
 * @property string $po_number Unique PO number
 * @property string $status 'draft', 'confirmed', 'received', 'cancelled'
 * @property \Illuminate\Support\Carbon $order_date
 * @property \Illuminate\Support\Carbon $expected_delivery_date
 * @property \Illuminate\Support\Carbon $actual_delivery_date
 * @property int $created_by_user_id
 * @property string $notes
 */
class AggregatedOrder extends Model
{
    /** @use HasFactory<\Database\Factories\AggregatedOrderFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'aggregated_orders';

    protected $fillable = [
        'supplier_id',
        'po_number',
        'status',
        'order_date',
        'expected_delivery_date',
        'actual_delivery_date',
        'created_by_user_id',
        'notes',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
    ];

    /**
     * Get the supplier
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the user who created this order
     */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Get all aggregated order line items
     */
    public function aggregatedOrderItems(): HasMany
    {
        return $this->hasMany(AggregatedOrderItem::class);
    }

    /**
     * Get all request items through the pivot
     */
    public function requestItems()
    {
        return $this->hasManyThrough(
            RequestItem::class,
            AggregatedOrderItem::class,
            'aggregated_order_id',
            'id',
            'id',
            'request_item_id'
        );
    }

    /**
     * Get total order value
     */
    public function getTotalValue()
    {
        return $this->aggregatedOrderItems()
            ->selectRaw('SUM(quantity_ordered * unit_price) as total')
            ->first()
            ->total ?? 0;
    }

    /**
     * Confirm order with supplier
     */
    public function confirm(): void
    {
        $this->update(['status' => 'confirmed']);
    }

    /**
     * Record receipt of order
     */
    public function recordReceipt(): void
    {
        $this->update([
            'status' => 'received',
            'actual_delivery_date' => Carbon::now(),
        ]);
    }

    /**
     * Cancel order
     */
    public function cancel(): void
    {
        $this->update(['status' => 'cancelled']);
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['draft', 'confirmed']);
    }
}
