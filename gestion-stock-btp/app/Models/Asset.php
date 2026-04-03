<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Asset Model
 *
 * Fixed, serialized equipment with lifecycle management
 * Examples: Computers, vehicles, machinery, furniture
 * Lifecycle: en_service → maintenance → reformé
 *
 * @property int $id
 * @property int $category_id
 * @property string $name
 * @property string $serial_number Unique identifier/barcode
 * @property string $model
 * @property string $manufacturer
 * @property float $acquisition_cost
 * @property \Illuminate\Support\Carbon $acquisition_date
 * @property string $status 'en_service', 'maintenance', 'reformé'
 * @property int $current_campus_id
 * @property int $current_warehouse_id
 * @property string $location_detail
 * @property string $notes
 */
class Asset extends Model
{
    /** @use HasFactory<\Database\Factories\AssetFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'assets';

    protected $fillable = [
        'category_id',
        'name',
        'serial_number',
        'model',
        'manufacturer',
        'acquisition_cost',
        'acquisition_date',
        'status',
        'current_campus_id',
        'current_warehouse_id',
        'location_detail',
        'notes',
    ];

    protected $casts = [
        'acquisition_cost' => 'decimal:2',
        'acquisition_date' => 'date',
    ];

    /**
     * Get the category
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get current campus location
     */
    public function currentCampus(): BelongsTo
    {
        return $this->belongsTo(Campus::class, 'current_campus_id');
    }

    /**
     * Get current warehouse storage location
     */
    public function currentWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'current_warehouse_id');
    }

    /**
     * Get maintenance tickets for this asset
     */
    public function maintenanceTickets(): HasMany
    {
        return $this->hasMany(MaintenanceTicket::class);
    }

    /**
     * Check if asset is in service
     */
    public function isInService(): bool
    {
        return $this->status === 'en_service';
    }

    /**
     * Move asset to maintenance
     */
    public function markForMaintenance(string $reason = null): void
    {
        $this->update(['status' => 'maintenance']);
    }

    /**
     * Decommission asset
     */
    public function decommission(): void
    {
        $this->update(['status' => 'reformé']);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'en_service');
    }

    public function scopeInMaintenance($query)
    {
        return $query->where('status', 'maintenance');
    }

    public function scopeDecommissioned($query)
    {
        return $query->where('status', 'reformé');
    }
}
