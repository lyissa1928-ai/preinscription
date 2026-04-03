<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class InboxMessage extends Model
{
    protected $table = 'inbox_messages';

    protected $fillable = ['conversation_id', 'sender_id', 'body', 'read_at', 'deleted_at', 'is_ephemeral'];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'deleted_at' => 'datetime',
            'is_ephemeral' => 'boolean',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(InboxMessageAttachment::class, 'inbox_message_id');
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    public function hasAttachments(): bool
    {
        return $this->attachments()->exists();
    }

    public function scopeNotDeletedForEveryone(Builder $query): Builder
    {
        return $query->whereNull('deleted_at');
    }

    /** Le message est-il masqué pour cet utilisateur (supprimé pour lui uniquement) ? */
    public function isDeletedForUser(User $user): bool
    {
        return InboxMessageDeletion::where('user_id', $user->id)
            ->where('inbox_message_id', $this->id)
            ->exists();
    }

    /** Afficher le contenu ou le placeholder éphémère. */
    public function shouldShowEphemeralPlaceholder(): bool
    {
        return $this->is_ephemeral && $this->read_at !== null;
    }
}
