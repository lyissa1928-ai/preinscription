<?php

namespace App\Policies;

use App\Models\MaterialRequest;
use App\Models\User;

/**
 * MaterialRequestPolicy
 *
 * Gate access to material request operations
 * Uses Spatie permissions for fine-grained control
 */
class MaterialRequestPolicy
{
    /**
     * Determine if user can view material request
     *
     * Staff can see own campus requests
     * Managers can see all campus requests
     * Director/Point Focal can see all requests
     *
     * @param User $user
     * @param MaterialRequest $request
     * @return bool
     */
    public function view(User $user, MaterialRequest $request): bool
    {
        // Le demandeur peut toujours voir sa propre demande
        if ($user->id === $request->requester_user_id) {
            return true;
        }

        // Staff : uniquement les demandes de son propre campus (requérant ou participant)
        if ($user->hasRole('staff') && $user->campus_id !== null && $request->campus_id === $user->campus_id) {
            if ($user->id === $request->requester_user_id) {
                return true;
            }
            if ($request->participants()->where('user_id', $user->id)->exists()) {
                return true;
            }
        }

        // Super Admin / Director / Point Focal peuvent tout voir
        if ($user->hasAnyRole(['super_admin', 'director', 'point_focal'])) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can create material request
     *
     * @param User $user
     * @return bool
     */
    public function create(User $user): bool
    {
        return $user->can('material_request.create');
    }

    /**
     * Determine if user can update material request (only draft)
     *
     * Only draft requests can be edited
     * Requester or managers can edit
     *
     * @param User $user
     * @param MaterialRequest $request
     * @return bool
     */
    public function update(User $user, MaterialRequest $request): bool
    {
        // Must be draft status
        if ($request->status !== 'draft') {
            return false;
        }

        // Requester can edit own draft
        if ($user->id === $request->requester_user_id) {
            return true;
        }

        // Participant peut modifier (ajouter des lignes) une demande groupée en brouillon
        if (($request->request_type ?? 'individual') === 'grouped' && $request->participants()->where('user_id', $user->id)->exists()) {
            return true;
        }

        // Super Admin / Director can edit any draft
        if ($user->hasAnyRole(['super_admin', 'director'])) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can delete material request (only draft)
     *
     * @param User $user
     * @param MaterialRequest $request
     * @return bool
     */
    public function delete(User $user, MaterialRequest $request): bool
    {
        // Only draft requests can be deleted
        if ($request->status !== 'draft') {
            return false;
        }

        // Requester can delete own draft
        if ($user->id === $request->requester_user_id) {
            return true;
        }

        // Super Admin / Director can delete any draft
        return $user->hasAnyRole(['super_admin', 'director']);
    }

    /**
     * Determine if user can submit request for approval
     *
     * @param User $user
     * @param MaterialRequest $request
     * @return bool
     */
    public function submit(User $user, MaterialRequest $request): bool
    {
        // Must be draft
        if ($request->status !== 'draft') {
            return false;
        }

        if ($user->id === $request->requester_user_id) {
            return true;
        }
        if ($user->hasAnyRole(['director', 'super_admin', 'point_focal'])) {
            return true;
        }
        return false;
    }

    /**
     * Valider définitivement la demande (après approbation du directeur). Point focal uniquement.
     *
     * @param User $user
     * @param MaterialRequest $request
     * @return bool
     */
    public function approve(User $user, MaterialRequest $request): bool
    {
        if (!$user->can('material_request.approve')) {
            return false;
        }
        // Seules les demandes approuvées par le directeur peuvent être validées définitivement par le point focal
        if ($request->status !== 'director_approved') {
            return false;
        }
        return $user->hasAnyRole(['super_admin', 'point_focal']);
    }

    /**
     * Point focal / Directeur : traiter une demande (mise en traitement, notes, clôture)
     *
     * @param User $user
     * @param MaterialRequest $request
     * @return bool
     */
    public function treat(User $user, MaterialRequest $request): bool
    {
        return $user->hasAnyRole(['point_focal', 'director', 'super_admin']);
    }

    /**
     * Rejeter une demande (avant transmission au directeur). Point focal uniquement pour les demandes soumises.
     *
     * @param User $user
     * @param MaterialRequest $request
     * @return bool
     */
    public function reject(User $user, MaterialRequest $request): bool
    {
        if (!$user->can('material_request.reject')) {
            return false;
        }
        if ($request->status !== 'submitted') {
            return false;
        }
        return $user->hasAnyRole(['super_admin', 'director', 'point_focal']);
    }

    /**
     * Voir le stockage (quantités reçues, à stocker, utilisées) en lecture seule.
     * Demandeur (staff) et point focal / directeur / super_admin (même campus) peuvent consulter.
     */
    public function viewStorage(User $user, MaterialRequest $request): bool
    {
        if (!in_array($request->status, ['delivered', 'received'])) {
            return false;
        }
        if ($user->id === $request->requester_user_id) {
            return true;
        }
        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            if ($user->hasRole('super_admin')) {
                return true;
            }
            if ($user->campus_id && $request->campus_id === $user->campus_id) {
                return true;
            }
        }
        return false;
    }

    /**
     * Enregistrer le stockage après livraison (quantités reçues, disponibles, utilisées).
     * Uniquement le demandeur (staff) qui a reçu le matériel. Le point focal ne fait que consulter (viewStorage).
     */
    public function storeStorage(User $user, MaterialRequest $request): bool
    {
        if (!in_array($request->status, ['delivered', 'received'])) {
            return false;
        }
        return $user->id === $request->requester_user_id;
    }
}
