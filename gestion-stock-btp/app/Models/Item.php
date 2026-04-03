<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Item Model
 *
 * Consumable inventory items managed by quantity
 * Examples: office supplies, fuel, cleaning materials, spare parts
 *
 * @property int $id
 * @property int $category_id
 * @property int|null $supplier_id
 * @property string $name
 * @property string $code Unique item code
 * @property string $unit Unit of measurement
 * @property float $unit_cost Cost per unit
 * @property int $reorder_threshold Minimum quantity before alert
 * @property int $reorder_quantity Quantity to order
 * @property int $stock_quantity Current stock
 * @property string $description
 * @property bool $is_active
 */
class Item extends Model
{
    /** @use HasFactory<\Database\Factories\ItemFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'items';

    protected $fillable = [
        'category_id',
        'supplier_id',
        'name',
        'code',
        'unit',
        'unit_cost',
        'reorder_threshold',
        'reorder_quantity',
        'stock_quantity',
        'description',
        'image_path',
        'is_active',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'stock_quantity' => 'integer',
        'reorder_threshold' => 'integer',
        'reorder_quantity' => 'integer',
        'is_active' => 'bool',
    ];

    /**
     * Get the category this item belongs to
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the preferred supplier for this item (optional).
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get all request items for this item
     */
    public function requestItems(): HasMany
    {
        return $this->hasMany(RequestItem::class);
    }

    /**
     * Alias for stock_quantity (used in views and reports)
     */
    public function getCurrentStockAttribute(): int
    {
        return (int) $this->stock_quantity;
    }

    /**
     * Check if stock is low
     */
    public function isLowStock(): bool
    {
        return $this->stock_quantity <= $this->reorder_threshold;
    }

    /**
     * Get remaining stock after accounting for pending requests
     */
    public function getAvailableStock(): int
    {
        $pendingQuantity = $this->requestItems()
            ->whereIn('status', ['pending', 'aggregated'])
            ->sum('requested_quantity');

        return $this->stock_quantity - $pendingQuantity;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock($query)
    {
        return $query->whereRaw('stock_quantity <= reorder_threshold');
    }

    /**
     * Alias pour les vues qui utilisent unit_of_measure (colonne réelle : unit)
     */
    public function getUnitOfMeasureAttribute(): string
    {
        return $this->attributes['unit'] ?? 'unité';
    }

    /**
     * Alias pour les vues qui utilisent unit_price (colonne réelle : unit_cost)
     */
    public function getUnitPriceAttribute()
    {
        return isset($this->attributes['unit_cost']) ? (float) $this->attributes['unit_cost'] : 0;
    }

    /**
     * Alias pour compatibilité (colonne réelle : code)
     */
    public function getItemCodeAttribute(): ?string
    {
        return $this->attributes['code'] ?? null;
    }
}
