{{-- Liste des conversations (colonne gauche) - type WhatsApp --}}
<div class="inbox-sidebar__header">
    <div class="inbox-sidebar__search-wrap">
        <i class="bi bi-search"></i>
        <input type="text" id="inbox-search" class="form-control" placeholder="Rechercher une conversation" aria-label="Rechercher">
    </div>
    <a href="{{ route('inbox.create') }}" class="inbox-sidebar__new-btn" title="Nouvelle conversation">
        <i class="bi bi-chat-square-text"></i>
    </a>
</div>

<div class="inbox-conversations" id="inbox-conversations-list">
    @forelse ($conversations as $conv)
        @php
            $other = $conv->user1_id === $user->id ? $conv->user2 : $conv->user1;
            $lastMsg = $conv->messages->first();
            $lastPreview = $lastMsg ? (trim($lastMsg->body ?? '') ? Str::limit($lastMsg->body, 40) : '📎 Fichier(s)') : '';
            $isActive = isset($currentConversation) && $currentConversation && (int) $currentConversation->id === (int) $conv->id;
            $unread = (int) ($conv->unread_count ?? 0) > 0;
        @endphp
        <a href="{{ route('inbox.show', $conv) }}" class="inbox-conv {{ $isActive ? 'active' : '' }}" data-conv-name="{{ strtolower($other->display_name ?? $other->name) }}">
            <div class="inbox-conv__avatar">
                @if (!empty($other->profile_photo_url))
                    <img src="{{ $other->profile_photo_url }}" alt="">
                @else
                    {{ strtoupper(mb_substr($other->display_name ?? $other->name, 0, 1)) }}
                @endif
            </div>
            <div class="inbox-conv__body">
                <div class="inbox-conv__top">
                    <span class="inbox-conv__name">{{ $other->display_name ?? $other->name }}</span>
                    @if ($lastMsg)
                        <span class="inbox-conv__time">{{ $lastMsg->created_at->diffForHumans(null, true) }}</span>
                    @endif
                </div>
                @if ($lastMsg)
                    <div class="inbox-conv__preview {{ $unread ? 'inbox-conv__preview--unread' : '' }}">
                        {{ $lastPreview }}
                    </div>
                @endif
            </div>
            @if ($unread)
                <span class="inbox-conv__badge">{{ $conv->unread_count > 99 ? '99+' : $conv->unread_count }}</span>
            @endif
        </a>
    @empty
        <div class="text-center text-muted py-5 px-3">
            <i class="bi bi-chat-dots d-block fs-1 mb-2 opacity-50"></i>
            <p class="mb-0 small">Aucune conversation</p>
            <a href="{{ route('inbox.create') }}" class="btn btn-sm btn-outline-primary mt-3">Nouvelle conversation</a>
        </div>
    @endforelse
</div>
