<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InboxMessageDeletion extends Model
{
    protected $table = 'inbox_message_deletions';

    protected $fillable = ['user_id', 'inbox_message_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(InboxMessage::class, 'inbox_message_id');
    }
}
