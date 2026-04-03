<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Supplier Model
 *
 * Vendors and suppliers from whom items and assets are procured
 *
 * @property int $id
 * @property string $name
 * @property string $code Unique supplier code
 * @property string $contact_person
 * @property string $email
 * @property string $phone
 * @property string $address
 * @property string $city
 * @property string $country
 * @property int $payment_terms_days
 * @property string $notes
 * @property bool $is_active
 */
class Supplier extends Model
{
    /** @use HasFactory<\Database\Factories\SupplierFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'suppliers';

    protected $fillable = [
        'name',
        'code',
        'contact_person',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'payment_terms_days',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'payment_terms_days' => 'integer',
        'is_active' => 'bool',
    ];

    /**
     * Get all aggregated orders from this supplier
     */
    public function aggregatedOrders(): HasMany
    {
        return $this->hasMany(AggregatedOrder::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
