<?php

namespace App\Policies;

use App\Models\AggregatedOrder;
use App\Models\User;

/**
 * AggregatedOrderPolicy
 *
 * Gate access to purchase order (aggregated order) operations
 * Point Focal exclusive for creation/confirmation
 * Director can cancel orders
 */
class AggregatedOrderPolicy
{
    /**
     * Determine if user can view aggregated order
     *
     * Point Focal, Director can view all
     * Campus Manager can view orders for their campus (via request items)
     *
     * @param User $user
     * @param AggregatedOrder $order
     * @return bool
     */
    public function view(User $user, AggregatedOrder $order): bool
    {
        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return true;
        }

        // Staff can view if it contains items from their campus
        if ($user->hasRole('staff') && $user->campus_id) {
            $hasCampusItems = $order->aggregatedOrderItems()
                ->whereHas('requestItem.materialRequest', fn($q) => 
                    $q->where('campus_id', $user->campus_id)
                )
                ->exists();

            return $hasCampusItems;
        }

        return false;
    }

    /**
     * Determine if user can create aggregated order (aggregate items)
     *
     * Point Focal ONLY
     *
     * @param User $user
     * @return bool
     */
    public function create(User $user): bool
    {
        // Strictly Point Focal only
        return $user->hasRole('point_focal');
    }

    /**
     * Determine if user can confirm draft order
     *
     * Point Focal only
     * Order must be draft status
     *
     * @param User $user
     * @param AggregatedOrder $order
     * @return bool
     */
    public function confirm(User $user, AggregatedOrder $order): bool
    {
        // Permission check
        if (!$user->can('aggregated_order.confirm')) {
            return false;
        }

        // Must be draft and created by Point Focal
        return $user->hasRole('point_focal') && $order->status === 'draft';
    }

    /**
     * Determine if user can record order receipt
     *
     * Point Focal only
     * Order must be confirmed status
     *
     * @param User $user
     * @param AggregatedOrder $order
     * @return bool
     */
    public function receive(User $user, AggregatedOrder $order): bool
    {
        // Permission check
        if (!$user->can('aggregated_order.receive')) {
            return false;
        }

        // Must be confirmed status
        return $user->hasRole('point_focal') && $order->status === 'confirmed';
    }

    /**
     * Determine if user can cancel order
     *
     * Director only
     * Order must not be received/cancelled already
     *
     * @param User $user
     * @param AggregatedOrder $order
     * @return bool
     */
    public function cancel(User $user, AggregatedOrder $order): bool
    {
        // Permission check
        if (!$user->can('aggregated_order.cancel')) {
            return false;
        }

        if ($user->hasAnyRole(['director', 'super_admin'])) {
            return !in_array($order->status, ['received', 'cancelled']);
        }
        return false;
    }

    /**
     * Determine if user can export order
     *
     * Point Focal, Director, Campus Manager (own campus orders)
     *
     * @param User $user
     * @param AggregatedOrder $order
     * @return bool
     */
    public function export(User $user, AggregatedOrder $order): bool
    {
        // Permission check
        if (!$user->can('aggregated_order.export')) {
            return false;
        }

        // Can view = can export
        return $this->view($user, $order);
    }
}
