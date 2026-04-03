<?php

namespace App\Policies;

use App\Models\Asset;
use App\Models\User;

/**
 * AssetPolicy
 *
 * Gate access to asset operations
 * Managers can create/transfer/maintain assets
 * Staff can view assets
 */
class AssetPolicy
{
    /**
     * Determine if user can view asset
     *
     * All authenticated users can view assets in their campus
     * Director/Manager can view all
     *
     * @param User $user
     * @param Asset $asset
     * @return bool
     */
    public function view(User $user, Asset $asset): bool
    {
        // Director can view all
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can view all assets in campus
        if ($user->hasRole('point_focal') && 
            $asset->current_campus_id === $user->campus_id) {
            return true;
        }

        // Site Manager can view own campus
        if ($user->hasRole('site_manager') && 
            $asset->current_campus_id === $user->campus_id) {
            return true;
        }

        // Staff can view own campus
        if ($user->hasRole('staff') && 
            $asset->current_campus_id === $user->campus_id) {
            return true;
        }

        // Technician can view assigned assets
        if ($user->hasRole('staff') && 
            $asset->current_campus_id === $user->campus_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can create asset
     *
     * Campus Manager, Director only
     *
     * @param User $user
     * @return bool
     */
    public function create(User $user): bool
    {
        return $user->can('asset.create') && 
               $user->hasAnyRole(['director', 'point_focal']);
    }

    /**
     * Determine if user can update asset
     *
     * Campus Manager, Director (own campaign only for managers)
     *
     * @param User $user
     * @param Asset $asset
     * @return bool
     */
    public function update(User $user, Asset $asset): bool
    {
        // Director can update any
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can update own campus
        return $user->hasRole('point_focal') && 
               $asset->current_campus_id === $user->campus_id;
    }

    /**
     * Determine if user can transfer asset
     *
     * Campus Manager, Director
     *
     * @param User $user
     * @param Asset $asset
     * @return bool
     */
    public function transfer(User $user, Asset $asset): bool
    {
        // Permission check
        if (!$user->can('asset.transfer')) {
            return false;
        }

        // Director can transfer any
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can transfer own campus
        return $user->hasRole('point_focal') && 
               $asset->current_campus_id === $user->campus_id;
    }

    /**
     * Determine if user can send asset to maintenance
     *
     * Campus Manager, Director
     *
     * @param User $user
     * @param Asset $asset
     * @return bool
     */
    public function maintain(User $user, Asset $asset): bool
    {
        // Permission check
        if (!$user->can('asset.maintain')) {
            return false;
        }

        // Director can maintain any
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can maintain own campus
        return $user->hasRole('point_focal') && 
               $asset->current_campus_id === $user->campus_id;
    }

    /**
     * Determine if user can decommission asset
     *
     * Director only
     *
     * @param User $user
     * @param Asset $asset
     * @return bool
     */
    public function decommission(User $user, Asset $asset): bool
    {
        // Permission check
        if (!$user->can('asset.decommission')) {
            return false;
        }

        return $user->hasAnyRole(['director', 'super_admin']);
    }
}
