<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ActivityLog Model
 *
 * Immutable audit trail for compliance and security
 * Tracks all CRUD operations, approvals, and state changes
 * Critical for financial audit and regulatory compliance
 *
 * IMPORTANT: This table is IMMUTABLE - no updates or deletes allowed
 * Use read-only access for audit purposes
 *
 * @property int $id
 * @property string $loggable_type Model class name
 * @property int $loggable_id Model instance ID
 * @property int|null $user_id User who performed action
 * @property string $action 'created', 'updated', 'approved', 'received', etc.
 * @property array $changes JSON: before/after field changes
 * @property string $description Human-readable description
 * @property string $ip_address IP address of request
 * @property string $user_agent Browser user agent
 * @property \Illuminate\Support\Carbon $created_at Immutable timestamp
 */
class ActivityLog extends Model
{
    use HasFactory;

    protected $table = 'activity_logs';

    // IMMUTABLE: No timestamps for updates, no soft deletes
    public $timestamps = false;

    protected $fillable = [
        'loggable_type',
        'loggable_id',
        'user_id',
        'action',
        'changes',
        'description',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected $casts = [
        'changes' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Get the user who performed the action
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the related model instance
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo
     */
    public function loggable()
    {
        return $this->morphTo();
    }

    /**
     * OVERRIDE: Prevent updates on audit logs
     * Audit logs are immutable - once created, they cannot be modified
     */
    public function update(array $attributes = [], array $options = [])
    {
        throw new \RuntimeException('ActivityLog records are immutable and cannot be updated');
    }

    /**
     * OVERRIDE: Prevent deletion of audit logs
     */
    public function delete()
    {
        throw new \RuntimeException('ActivityLog records are immutable and cannot be deleted');
    }

    /**
     * Force-delete protection
     */
    public function forceDelete()
    {
        throw new \RuntimeException('ActivityLog records are immutable and cannot be deleted');
    }

    /**
     * Log a model creation
     */
    public static function logCreated(Model $model, User $user = null)
    {
        static::create([
            'loggable_type' => $model::class,
            'loggable_id' => $model->id,
            'user_id' => $user?->id,
            'action' => 'created',
            'description' => 'Created ' . class_basename($model),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
        ]);
    }

    /**
     * Log a model update
     */
    public static function logUpdated(Model $model, array $changes, User $user = null)
    {
        static::create([
            'loggable_type' => $model::class,
            'loggable_id' => $model->id,
            'user_id' => $user?->id,
            'action' => 'updated',
            'changes' => $changes,
            'description' => 'Updated ' . class_basename($model),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
        ]);
    }

    /**
     * Log a custom action (approval, aggregation, receipt, etc.)
     */
    public static function logAction(
        Model $model,
        string $action,
        string $description = null,
        User $user = null,
        array $changes = []
    ) {
        static::create([
            'loggable_type' => $model::class,
            'loggable_id' => $model->id,
            'user_id' => $user?->id,
            'action' => $action,
            'changes' => $changes ?: null,
            'description' => $description ?? ucfirst($action) . ' ' . class_basename($model),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
        ]);
    }

    /**
     * Get logs for a specific model type  
     */
    public function scopeForModel($query, string $modelClass)
    {
        return $query->where('loggable_type', $modelClass);
    }

    /**
     * Get logs by action type
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Get logs by user
     */
    public function scopeByUser($query, User $user)
    {
        return $query->where('user_id', $user->id);
    }

    /**
     * Exclure les entrées dont l'utilisateur (auteur de l'action) a été supprimé.
     * Les actions relatives aux utilisateurs supprimés ne doivent plus figurer sur la plateforme.
     */
    public function scopeWithoutDeletedUsers($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('user_id')
                ->orWhereHas('user'); // User a SoftDeletes : whereHas exclut les utilisateurs supprimés
        });
    }

    /**
     * Get logs within date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}
