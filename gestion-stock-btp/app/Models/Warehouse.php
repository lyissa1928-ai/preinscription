<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Warehouse Model
 *
 * Physical warehouse location within a campus for inventory storage
 *
 * @property int $id
 * @property int $campus_id
 * @property string $name
 * @property string $code Unique code
 * @property string $location
 * @property int $capacity Storage capacity in units
 * @property string $description
 * @property bool $is_active
 */
class Warehouse extends Model
{
    /** @use HasFactory<\Database\Factories\WarehouseFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'warehouses';

    protected $fillable = [
        'campus_id',
        'name',
        'code',
        'location',
        'capacity',
        'description',
        'is_active',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'is_active' => 'bool',
    ];

    /**
     * Get the campus this warehouse belongs to
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    /**
     * Get assets stored in this warehouse
     */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class, 'current_warehouse_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
