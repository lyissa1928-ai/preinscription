<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class InboxMessageAttachment extends Model
{
    protected $table = 'inbox_message_attachments';

    protected $fillable = ['inbox_message_id', 'filename', 'path', 'mime_type', 'size'];

    public function message(): BelongsTo
    {
        return $this->belongsTo(InboxMessage::class, 'inbox_message_id');
    }

    /**
     * Lien de téléchargement sécurisé (via contrôleur).
     */
    public function getDownloadUrlAttribute(): string
    {
        return route('inbox.attachment.download', $this);
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type ?? '', 'image/');
    }

    public function isPdf(): bool
    {
        return ($this->mime_type ?? '') === 'application/pdf';
    }

    public function isAudio(): bool
    {
        return str_starts_with($this->mime_type ?? '', 'audio/');
    }
}
