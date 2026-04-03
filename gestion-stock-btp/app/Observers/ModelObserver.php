<?php

namespace App\Observers;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * ModelObserver
 *
 * Automatically logs model mutations (created, updated, deleted)
 * Called via HasAuditLog trait
 * Records before/after state for updates
 */
class ModelObserver
{
    /**
     * Handle the model created event
     *
     * @param Model $model
     * @return void
     */
    public function created(Model $model): void
    {
        // Skip ActivityLog self-logging
        if ($model instanceof ActivityLog) {
            return;
        }

        // Skip if model doesn't use HasAuditLog trait
        if (!$this->shouldLog($model)) {
            return;
        }

        ActivityLog::logAction(
            $model,
            'created',
            $model->getAttributes(),
            auth()->user()
        );
    }

    /**
     * Handle the model updated event
     *
     * Record what changed
     *
     * @param Model $model
     * @return void
     */
    public function updated(Model $model): void
    {
        // Skip ActivityLog
        if ($model instanceof ActivityLog) {
            return;
        }

        // Skip if model doesn't use HasAuditLog trait
        if (!$this->shouldLog($model)) {
            return;
        }

        // Get dirty attributes (what changed)
        $changes = [];
        foreach ($model->getDirty() as $key => $value) {
            $changes[$key] = [
                'before' => $model->getOriginal($key),
                'after' => $value,
            ];
        }

        if (!empty($changes)) {
            ActivityLog::logAction(
                $model,
                'updated',
                $changes,
                auth()->user()
            );
        }
    }

    /**
     * Handle the model deleted event
     *
     * @param Model $model
     * @return void
     */
    public function deleted(Model $model): void
    {
        // Skip ActivityLog
        if ($model instanceof ActivityLog) {
            return;
        }

        // Skip if model doesn't use HasAuditLog trait
        if (!$this->shouldLog($model)) {
            return;
        }

        ActivityLog::logAction(
            $model,
            'deleted',
            $model->getAttributes(),
            auth()->user()
        );
    }

    /**
     * Handle the model restored event
     *
     * @param Model $model
     * @return void
     */
    public function restored(Model $model): void
    {
        // Skip ActivityLog
        if ($model instanceof ActivityLog) {
            return;
        }

        // Skip if model doesn't use HasAuditLog trait
        if (!$this->shouldLog($model)) {
            return;
        }

        ActivityLog::logAction(
            $model,
            'restored',
            $model->getAttributes(),
            auth()->user()
        );
    }

    /**
     * Check if model should be logged
     * (Has HasAuditLog trait)
     *
     * @param Model $model
     * @return bool
     */
    private function shouldLog(Model $model): bool
    {
        return in_array(\App\Traits\HasAuditLog::class, class_uses_recursive($model));
    }
}
