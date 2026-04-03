<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use App\Services\MessagingService;

class ConversationPolicy
{
    /**
     * Voir une conversation : uniquement si on en est participant.
     */
    public function view(User $user, Conversation $conversation): bool
    {
        return MessagingService::canAccessConversation($user, $conversation);
    }

    /**
     * Envoyer un message dans une conversation : participant + droit d'envoyer à l'autre.
     */
    public function sendMessage(User $user, Conversation $conversation): bool
    {
        return MessagingService::canSendInConversation($user, $conversation);
    }

    /**
     * Supprimer la conversation pour moi (masquer de ma liste, style WhatsApp).
     */
    public function deleteForMe(User $user, Conversation $conversation): bool
    {
        return MessagingService::canAccessConversation($user, $conversation);
    }
}
