<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Règles métier strictes : qui peut envoyer à qui, qui peut accéder à quelle conversation.
 * Toutes les vérifications doivent être utilisées côté backend (contrôleurs, policies).
 *
 * MATRICE DES COMMUNICATIONS AUTORISÉES (envoi) :
 * - Staff         → Point focal uniquement (PAS le directeur)
 * - Point focal   → Staff, Directeur, Super Admin (tout le monde)
 * - Directeur     → Staff, Point focal, Super Admin
 * - Super Admin   → Staff, Point focal, Directeur, Super Admin (tout le monde)
 */
class MessagingService
{
    /**
     * Vérifie si l'utilisateur $from a le droit d'envoyer un message à $to.
     * Contrôle backend obligatoire avant tout envoi.
     */
    public static function canSendTo(User $from, User $to): bool
    {
        if ($from->id === $to->id) {
            return false;
        }
        if (!$to->is_active) {
            return false;
        }

        $fromRole = $from->roles->first()?->name;
        $toRole = $to->roles->first()?->name;

        // Staff : ne peut envoyer QU'au point focal (jamais au directeur ni super_admin)
        if ($fromRole === 'staff') {
            return $toRole === 'point_focal';
        }

        // Point focal : peut envoyer à tout le monde
        if ($fromRole === 'point_focal') {
            return in_array($toRole, ['staff', 'point_focal', 'director', 'super_admin'], true);
        }

        // Directeur : peut envoyer à staff, point_focal, super_admin
        if ($fromRole === 'director') {
            return in_array($toRole, ['staff', 'point_focal', 'super_admin'], true);
        }

        // Super Admin : peut envoyer à tout le monde
        if ($fromRole === 'super_admin') {
            return in_array($toRole, ['staff', 'point_focal', 'director', 'super_admin'], true);
        }

        return false;
    }

    /**
     * Retourne le query builder des utilisateurs que $user peut contacter (destinataires autorisés).
     * Utilisé pour la liste des destinataires dans le formulaire "Nouvelle conversation".
     */
    public static function allowedRecipientsQuery(User $user): Builder
    {
        $role = $user->roles->first()?->name;

        $query = User::query()
            ->where('id', '!=', $user->id)
            ->where('is_active', true)
            ->with('roles')
            ->orderBy('name');

        if ($role === 'staff') {
            $query->whereHas('roles', fn ($q) => $q->where('name', 'point_focal'));
            return $query;
        }

        if ($role === 'point_focal') {
            return $query->whereHas('roles', fn ($q) => $q->whereIn('name', ['staff', 'point_focal', 'director', 'super_admin']));
        }

        if ($role === 'director') {
            return $query->whereHas('roles', fn ($q) => $q->whereIn('name', ['staff', 'point_focal', 'super_admin']));
        }

        if ($role === 'super_admin') {
            return $query->whereHas('roles', fn ($q) => $q->whereIn('name', ['staff', 'point_focal', 'director', 'super_admin']));
        }

        return $query->whereRaw('1 = 0'); // aucun rôle reconnu → aucun destinataire
    }

    /**
     * Vérifie si $user peut accéder (lire/écrire) à la conversation $conversation.
     * Un utilisateur ne peut accéder qu'aux conversations dont il est participant.
     */
    public static function canAccessConversation(User $user, Conversation $conversation): bool
    {
        return (int) $conversation->user1_id === (int) $user->id
            || (int) $conversation->user2_id === (int) $user->id;
    }

    /**
     * Vérifie que l'utilisateur peut envoyer un message dans cette conversation (il est participant ET a le droit d'écrire à l'autre).
     */
    public static function canSendInConversation(User $user, Conversation $conversation): bool
    {
        if (!static::canAccessConversation($user, $conversation)) {
            return false;
        }
        $other = $conversation->user1_id === $user->id ? $conversation->user2 : $conversation->user1;
        return static::canSendTo($user, $other);
    }
}
