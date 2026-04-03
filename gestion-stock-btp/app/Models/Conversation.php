<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Conversation 1-1 entre deux utilisateurs.
 * user1_id < user2_id pour unicité.
 * user1_hidden_at / user2_hidden_at : "supprimer la conversation" pour moi (style WhatsApp).
 */
class Conversation extends Model
{
    protected $table = 'conversations';

    protected $fillable = ['user1_id', 'user2_id', 'user1_hidden_at', 'user2_hidden_at'];

    protected function casts(): array
    {
        return [
            'user1_hidden_at' => 'datetime',
            'user2_hidden_at' => 'datetime',
        ];
    }

    public function user1(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user1_id');
    }

    public function user2(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user2_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(InboxMessage::class, 'conversation_id')->orderBy('created_at');
    }

    /**
     * L'autre participant par rapport à $user.
     */
    public function otherUser(User $user): User
    {
        return (int) $this->user1_id === (int) $user->id ? $this->user2 : $this->user1;
    }

    /**
     * Trouve ou crée la conversation entre deux utilisateurs (user1_id < user2_id).
     */
    public static function findOrCreateBetween(User $userA, User $userB): self
    {
        $id1 = min($userA->id, $userB->id);
        $id2 = max($userA->id, $userB->id);

        return static::firstOrCreate(
            ['user1_id' => $id1, 'user2_id' => $id2],
            ['user1_id' => $id1, 'user2_id' => $id2]
        );
    }

    /**
     * La conversation est-elle masquée (supprimée) pour cet utilisateur ?
     */
    public function isHiddenFor(User $user): bool
    {
        if ((int) $this->user1_id === (int) $user->id) {
            return $this->user1_hidden_at !== null;
        }
        if ((int) $this->user2_id === (int) $user->id) {
            return $this->user2_hidden_at !== null;
        }
        return false;
    }

    /**
     * Masquer la conversation pour cet utilisateur ("supprimer la conversation" côté utilisateur).
     */
    public function markHiddenFor(User $user): void
    {
        if ((int) $this->user1_id === (int) $user->id) {
            $this->update(['user1_hidden_at' => now()]);
            return;
        }
        if ((int) $this->user2_id === (int) $user->id) {
            $this->update(['user2_hidden_at' => now()]);
        }
    }

    /**
     * Réafficher la conversation pour cet utilisateur (ex. nouveau message reçu).
     */
    public function markVisibleFor(User $user): void
    {
        if ((int) $this->user1_id === (int) $user->id) {
            $this->update(['user1_hidden_at' => null]);
            return;
        }
        if ((int) $this->user2_id === (int) $user->id) {
            $this->update(['user2_hidden_at' => null]);
        }
    }
}
