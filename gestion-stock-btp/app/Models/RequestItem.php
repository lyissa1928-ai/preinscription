<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * RequestItem Model
 *
 * Detail lines of a MaterialRequest
 * Core of Federation: tracks item lifecycle pending → aggregated → received
 * Each line maps to AggregatedOrderItems for full traceability
 *
 * @property int $id
 * @property int $material_request_id
 * @property int $item_id
 * @property int $requested_quantity
 * @property string $status 'pending', 'aggregated', 'received', 'rejected'
 * @property int $quantity_received
 * @property int $quantity_rejected
 * @property float $unit_price Expected unit price
 * @property string $notes
 */
class RequestItem extends Model
{
    /** @use HasFactory<\Database\Factories\RequestItemFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'request_items';

    protected $fillable = [
        'material_request_id',
        'requested_by_user_id',
        'designation',
        'is_unlisted_material',
        'item_id',
        'requested_quantity',
        'status',
        'director_approved',
        'quantity_received',
        'quantity_available',
        'quantity_used',
        'quantity_rejected',
        'unit_price',
        'notes',
    ];

    /**
     * Display label: designation if set, otherwise item description
     */
    public function getDisplayLabelAttribute(): string
    {
        if (!empty($this->designation)) {
            return $this->designation;
        }
        return $this->item?->description ?? __('Non renseigné');
    }

    protected $casts = [
        'requested_quantity' => 'integer',
        'director_approved' => 'boolean',
        'quantity_received' => 'integer',
        'quantity_available' => 'integer',
        'quantity_used' => 'integer',
        'quantity_rejected' => 'integer',
        'unit_price' => 'decimal:2',
    ];

    /**
     * Get parent material request
     */
    public function materialRequest(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class);
    }

    /**
     * User who requested this line (for grouped requests)
     */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    /**
     * Get the requested item (optional for free-designation lines)
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Get aggregated orders this item is part of
     */
    public function aggregatedOrderItems(): HasMany
    {
        return $this->hasMany(AggregatedOrderItem::class);
    }

    /**
     * Calculate remaining quantity to be received
     */
    public function getRemainingQuantity(): int
    {
        return $this->requested_quantity - $this->quantity_received - $this->quantity_rejected;
    }

    /**
     * Mark this line as aggregated
     */
    public function markAggregated(): void
    {
        $this->update(['status' => 'aggregated']);
        $this->materialRequest->refresh();
    }

    /**
     * Record receipt of quantity
     */
    public function recordReceipt(int $quantity): void
    {
        $this->quantity_received += $quantity;

        if ($this->quantity_received + $this->quantity_rejected >= $this->requested_quantity) {
            $this->status = 'received';
        } else {
            $this->status = 'partially_received';
        }

        $this->save();
    }

    /**
     * Reject quantity
     */
    public function recordRejection(int $quantity): void
    {
        $this->quantity_rejected += $quantity;

        if ($this->quantity_received + $this->quantity_rejected >= $this->requested_quantity) {
            $this->status = 'received';
        }

        $this->save();
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Lignes dont le matériel n'est pas dans le référentiel (désignation proposée par le demandeur).
     */
    public function scopeUnlistedMaterial($query)
    {
        return $query->where('is_unlisted_material', true)
            ->whereNull('item_id')
            ->whereNotNull('designation');
    }

    public function scopeAggregated($query)
    {
        return $query->where('status', 'aggregated');
    }
}
