<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * AggregatedOrderItem Model
 *
 * Pivot: Links RequestItems to AggregatedOrder
 * Enables traceability: "Campus A's RequestLine #5 is part of SupplierOrder #123"
 *
 * @property int $id
 * @property int $aggregated_order_id
 * @property int $request_item_id
 * @property int $quantity_ordered
 * @property int $quantity_received
 * @property float $unit_price
 */
class AggregatedOrderItem extends Model
{
    /** @use HasFactory<\Database\Factories\AggregatedOrderItemFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'aggregated_order_items';

    protected $fillable = [
        'aggregated_order_id',
        'request_item_id',
        'quantity_ordered',
        'quantity_received',
        'unit_price',
    ];

    protected $casts = [
        'quantity_ordered' => 'integer',
        'quantity_received' => 'integer',
        'unit_price' => 'decimal:2',
    ];

    /**
     * Get the aggregated order
     */
    public function aggregatedOrder(): BelongsTo
    {
        return $this->belongsTo(AggregatedOrder::class);
    }

    /**
     * Get the request item being fulfilled
     */
    public function requestItem(): BelongsTo
    {
        return $this->belongsTo(RequestItem::class);
    }

    /**
     * Get total line value
     */
    public function getTotalValue()
    {
        return $this->quantity_ordered * $this->unit_price;
    }

    /**
     * Get remaining quantity to receive
     */
    public function getRemainingQuantity(): int
    {
        return $this->quantity_ordered - $this->quantity_received;
    }

    /**
     * Record receipt of quantity
     */
    public function recordReceipt(int $quantity): void
    {
        $this->quantity_received += $quantity;
        $this->save();

        // Also update the request item
        $this->requestItem->recordReceipt($quantity);
    }
}
