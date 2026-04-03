<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Category Model
 *
 * Classification for Items (consommables) and Assets (serialized equipment)
 * Type determines inventory management strategy
 *
 * @property int $id
 * @property string $name
 * @property string $code
 * @property string $description
 * @property string $type 'consommable' or 'asset'
 * @property bool $is_active
 */
class Category extends Model
{
    /** @use HasFactory<\Database\Factories\CategoryFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'categories';

    protected $fillable = [
        'name',
        'code',
        'description',
        'type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'bool',
    ];

    /**
     * Get all items in this category
     */
    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    /**
     * Get all assets in this category
     */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeConsommables($query)
    {
        return $query->where('type', 'consommable');
    }

    public function scopeAssets($query)
    {
        return $query->where('type', 'asset');
    }
}
