<?php

namespace App\Policies;

use App\Models\InboxMessage;
use App\Models\User;
use App\Services\MessagingService;

class InboxMessagePolicy
{
    /** Seul l'expéditeur peut supprimer son message (pour lui ou pour tous). */
    public function delete(User $user, InboxMessage $message): bool
    {
        return (int) $message->sender_id === (int) $user->id;
    }
}
