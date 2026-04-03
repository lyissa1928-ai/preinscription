<?php

namespace App\Traits;

use App\Models\ActivityLog;

/**
 * HasAuditLog Trait
 *
 * Automatically logs model mutations via Observer pattern
 * Tracks created, updated, deleted actions with before/after state
 */
trait HasAuditLog
{
    /**
     * Boot the trait
     * Attach observer to model
     */
    public static function bootHasAuditLog(): void
    {
        static::observe(\App\Observers\ModelObserver::class);
    }

    /**
     * Get activity logs for this model
     * Polymorphic relationship to ActivityLog
     *
     * @return \Illuminate\Database\Eloquent\Relations\MorphMany
     */
    public function activityLogs()
    {
        return $this->morphMany(ActivityLog::class, 'loggable')->withoutDeletedUsers();
    }

    /**
     * Get recent activity for this model
     *
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function recentActivity(int $limit = 10)
    {
        return $this->activityLogs()
            ->latest('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Get activity by action type
     *
     * @param string $action
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function activityByAction(string $action)
    {
        return $this->activityLogs()
            ->where('action', $action)
            ->latest('created_at')
            ->get();
    }

    /**
     * Check if model has been modified since timestamp
     *
     * @param \Carbon\Carbon $since
     * @return bool
     */
    public function modifiedSince(\Carbon\Carbon $since): bool
    {
        return $this->activityLogs()
            ->where('created_at', '>', $since)
            ->exists();
    }
}
