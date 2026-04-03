<?php

namespace App\Policies;

use App\Models\MaintenanceTicket;
use App\Models\User;

/**
 * MaintenanceTicketPolicy
 *
 * Gate access to maintenance ticket operations
 * Managers create/assign/close tickets
 * Technicians work on assigned tickets
 */
class MaintenanceTicketPolicy
{
    /**
     * Determine if user can view maintenance ticket
     *
     * Director can view all
     * Campus Manager can view own campus tickets
     * Technician can view assigned tickets
     * Staff can view own campus tickets
     *
     * @param User $user
     * @param MaintenanceTicket $ticket
     * @return bool
     */
    public function view(User $user, MaintenanceTicket $ticket): bool
    {
        // Director can view all
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can view own campus
        if ($user->hasRole('point_focal') && 
            $ticket->asset->current_campus_id === $user->campus_id) {
            return true;
        }

        // Site Manager can view own campus
        if ($user->hasRole('point_focal') && 
            $ticket->asset->current_campus_id === $user->campus_id) {
            return true;
        }

        // Technician can view assigned
        if ($user->hasRole('technician') && 
            $user->id === $ticket->assigned_to_user_id) {
            return true;
        }

        // Staff can view own campus
        if ($user->hasRole('staff') && 
            $ticket->asset->current_campus_id === $user->campus_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can create maintenance ticket
     *
     * Campus Manager, Site Manager, Director, Staff (own campus)
     *
     * @param User $user
     * @param Asset|null $asset
     * @return bool
     */
    public function create(User $user, $asset = null): bool
    {
        // Permission check
        if (!$user->can('maintenance_ticket.create')) {
            return false;
        }

        // Director can create any
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can create
        if ($user->hasRole('point_focal')) {
            return true;
        }

        // Site Manager can create
        if ($user->hasRole('point_focal')) {
            return true;
        }

        // Staff can create (own campus if asset provided)
        if ($user->hasRole('staff') && $asset) {
            return $asset->current_campus_id === $user->campus_id;
        }

        return false;
    }

    /**
     * Determine if user can assign ticket to technician
     *
     * Campus Manager, Director only
     *
     * @param User $user
     * @param MaintenanceTicket $ticket
     * @return bool
     */
    public function assign(User $user, MaintenanceTicket $ticket): bool
    {
        // Permission check
        if (!$user->can('maintenance_ticket.assign')) {
            return false;
        }

        // Director can assign any
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can assign own campus
        return $user->hasRole('point_focal') && 
               $ticket->asset->current_campus_id === $user->campus_id;
    }

    /**
     * Determine if user can work on ticket
     *
     * Assigned technician or manager
     *
     * @param User $user
     * @param MaintenanceTicket $ticket
     * @return bool
     */
    public function work(User $user, MaintenanceTicket $ticket): bool
    {
        // Permission check
        if (!$user->can('maintenance_ticket.work')) {
            return false;
        }

        // Assigned technician
        if ($user->id === $ticket->assigned_to_user_id) {
            return true;
        }

        // Manager can work on tickets
        return $user->hasAnyRole(['director', 'point_focal', 'point_focal']);
    }

    /**
     * Determine if user can resolve ticket
     *
     * Assigned technician or manager
     *
     * @param User $user
     * @param MaintenanceTicket $ticket
     * @return bool
     */
    public function resolve(User $user, MaintenanceTicket $ticket): bool
    {
        // Permission check
        if (!$user->can('maintenance_ticket.resolve')) {
            return false;
        }

        // Assigned technician
        if ($user->id === $ticket->assigned_to_user_id) {
            return true;
        }

        // Manager can resolve
        return $user->hasAnyRole(['director', 'point_focal', 'point_focal']);
    }

    /**
     * Determine if user can close ticket
     *
     * Manager only
     *
     * @param User $user
     * @param MaintenanceTicket $ticket
     * @return bool
     */
    public function close(User $user, MaintenanceTicket $ticket): bool
    {
        // Permission check
        if (!$user->can('maintenance_ticket.close')) {
            return false;
        }

        // Director can close any
        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return true;
        }

        // Campus Manager can close own campus
        return $user->hasRole('point_focal') && 
               $ticket->asset->current_campus_id === $user->campus_id;
    }
}
