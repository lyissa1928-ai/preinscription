<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Department Model
 *
 * Organizational departments within a campus
 *
 * @property int $id
 * @property int $campus_id
 * @property string $name
 * @property string $code Unique code
 * @property string $head_name
 * @property string $phone
 * @property string $email
 * @property string $description
 * @property bool $is_active
 */
class Department extends Model
{
    /** @use HasFactory<\Database\Factories\DepartmentFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'departments';

    protected $fillable = [
        'campus_id',
        'name',
        'code',
        'head_name',
        'phone',
        'email',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'bool',
    ];

    /**
     * Get the campus this department belongs to
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    /**
     * Get budget allocations for this department
     */
    public function budgetAllocations(): HasMany
    {
        return $this->hasMany(BudgetAllocation::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
