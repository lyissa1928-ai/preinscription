<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Campus Model
 *
 * Represents a school campus/branch location.
 * Multi-tenancy pivot: campus_id filters visibility for Site Managers
 *
 * @property int $id
 * @property string $name
 * @property string $code Unique campus code
 * @property string $address
 * @property string $city
 * @property string $phone
 * @property string $email
 * @property string $description
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
class Campus extends Model
{
    /** @use HasFactory<\Database\Factories\CampusFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'campuses';

    protected $fillable = [
        'name',
        'code',
        'address',
        'city',
        'phone',
        'email',
        'description',
        'is_active',
        'order_responsible_user_id',
    ];

    protected $casts = [
        'is_active' => 'bool',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Responsable de commande du campus (utilisateur associé)
     */
    public function orderResponsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'order_responsible_user_id');
    }

    /**
     * Get all warehouses for this campus
     */
    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    /**
     * Get all departments for this campus
     */
    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    /**
     * Get all material requests from this campus
     */
    public function materialRequests(): HasMany
    {
        return $this->hasMany(MaterialRequest::class);
    }

    /**
     * Get all budget records for this campus
     */
    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class);
    }

    /**
     * Get assets currently at this campus
     */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class, 'current_campus_id');
    }

    /**
     * Scope: Only active campuses
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: By code
     */
    public function scopeByCode($query, string $code)
    {
        return $query->where('code', $code);
    }
}
