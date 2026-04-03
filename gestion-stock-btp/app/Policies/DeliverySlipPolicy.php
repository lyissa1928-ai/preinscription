<?php

namespace App\Policies;

use App\Models\DeliverySlip;
use App\Models\User;

class DeliverySlipPolicy
{
    /**
     * Staff : bons où il est destinataire ou auteur.
     * Point focal / directeur : tous les bons.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DeliverySlip $deliverySlip): bool
    {
        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return true;
        }
        return $deliverySlip->recipient_user_id === $user->id || $deliverySlip->author_user_id === $user->id;
    }

    /**
     * Pas de création manuelle : génération automatique uniquement.
     */
    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, DeliverySlip $deliverySlip): bool
    {
        return false;
    }

    public function delete(User $user, DeliverySlip $deliverySlip): bool
    {
        return false;
    }
}
