@extends('layouts.app')

@section('title', 'Avec ' . ($other->display_name ?? $other->name) . ' - Messagerie ESEBAT')
@section('page-title', 'Messagerie')
@section('page-subtitle', $other->display_name ?? $other->name)

@section('styles')
<link rel="stylesheet" href="{{ asset('css/inbox-whatsapp.css') }}">
@endsection

@section('content')
<div class="inbox-app">
    {{-- Colonne gauche : liste des conversations --}}
    <aside class="inbox-sidebar inbox-sidebar--hidden-mobile" id="inbox-sidebar">
        @include('inbox.partials.conversation-list', ['currentConversation' => $currentConversation])
    </aside>

    {{-- Zone droite : discussion --}}
    <main class="inbox-main inbox-main--full-mobile">
        {{-- Header conversation --}}
        <header class="inbox-chat__header">
            <a href="{{ route('inbox.index') }}" class="inbox-chat__back" aria-label="Retour aux conversations">
                <i class="bi bi-arrow-left"></i>
            </a>
            <div class="inbox-chat__avatar">
                @if (!empty($other->profile_photo_url))
                    <img src="{{ $other->profile_photo_url }}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                @else
                    {{ strtoupper(mb_substr($other->display_name ?? $other->name, 0, 1)) }}
                @endif
            </div>
            <div class="inbox-chat__info">
                <div class="inbox-chat__name">{{ $other->display_name ?? $other->name }}</div>
                <div class="inbox-chat__meta">{{ \App\Http\Controllers\UserController::roleLabels()[$other->roles->first()?->name] ?? $other->roles->first()?->name }}</div>
            </div>
            <div class="inbox-chat__actions">
                <div class="dropdown">
                    <button type="button" class="btn" data-bs-toggle="dropdown" aria-label="Options"><i class="bi bi-three-dots-vertical"></i></button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <form method="POST" action="{{ route('inbox.destroyForMe', $conversation) }}" onsubmit="return confirm('Supprimer cette conversation de votre liste ?');">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="dropdown-item text-danger"><i class="bi bi-trash me-2"></i>Supprimer la conversation</button>
                            </form>
                        </li>
                    </ul>
                </div>
            </div>
        </header>

        @if (session('success'))
            <div class="alert alert-success alert-dismissible fade show m-2 py-2" role="alert">
                {{ session('success') }}
                <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="alert" aria-label="Fermer"></button>
            </div>
        @endif

        {{-- Zone messages scrollable --}}
        <div class="inbox-chat__messages" id="inbox-messages">
            @forelse ($visibleMessages ?? $conversation->messages as $msg)
                <div class="inbox-msg {{ $msg->sender_id === auth()->id() ? 'inbox-msg--sent' : 'inbox-msg--received' }}" data-msg-id="{{ $msg->id }}">
                    <div class="inbox-msg__bubble">
                        @if ($msg->deleted_at)
                            <div class="inbox-msg__content inbox-msg__content--deleted text-muted fst-italic">
                                <i class="bi bi-trash me-1"></i> Message supprimé
                            </div>
                        @elseif ($msg->shouldShowEphemeralPlaceholder())
                            <div class="inbox-msg__content inbox-msg__content--ephemeral text-muted">
                                <i class="bi bi-clock-history me-1"></i> Message éphémère
                            </div>
                        @else
                            @if ($msg->body)
                                <div class="inbox-msg__content">{{ nl2br(e($msg->body)) }}</div>
                            @endif
                            @if ($msg->attachments->isNotEmpty())
                                <div class="inbox-msg__attachments">
                                    @foreach ($msg->attachments as $att)
                                        @if ($att->isImage())
                                            <a href="{{ route('inbox.attachment.download', $att) }}" target="_blank" rel="noopener">
                                                <img src="{{ route('inbox.attachment.download', $att) }}" alt="{{ $att->filename }}">
                                            </a>
                                        @else
                                            <a href="{{ route('inbox.attachment.download', $att) }}" class="inbox-msg__file-link" download>
                                                <i class="bi bi-file-earmark-arrow-down"></i> {{ Str::limit($att->filename, 28) }}
                                            </a>
                                        @endif
                                    @endforeach
                                </div>
                            @endif
                        @endif
                        <div class="inbox-msg__footer">
                            <span class="inbox-msg__time">{{ $msg->created_at->format('H:i') }}</span>
                            @if ($msg->sender_id === auth()->id() && !$msg->deleted_at)
                                <span class="inbox-msg__status {{ $msg->read_at ? 'inbox-msg__status--read' : '' }}" title="{{ $msg->read_at ? 'Lu' : 'Envoyé' }}">✓✓</span>
                            @endif
                            @if ($msg->sender_id === auth()->id() && !$msg->deleted_at)
                                <div class="dropdown d-inline ms-1">
                                    <button type="button" class="btn btn-link p-0 min-w-0 inbox-msg__menu" data-bs-toggle="dropdown" aria-label="Options du message"><i class="bi bi-three-dots-vertical small"></i></button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li>
                                            <form method="POST" action="{{ route('inbox.message.deleteForMe', [$conversation, $msg->id]) }}" class="d-inline" onsubmit="return confirm('Supprimer ce message pour vous uniquement ?');">
                                                @csrf
                                                @method('DELETE')
                                                <button type="submit" class="dropdown-item"><i class="bi bi-eye-slash me-2"></i>Supprimer pour moi</button>
                                            </form>
                                        </li>
                                        <li>
                                            <form method="POST" action="{{ route('inbox.message.deleteForEveryone', [$conversation, $msg->id]) }}" class="d-inline" onsubmit="return confirm('Supprimer ce message pour tout le monde ?');">
                                                @csrf
                                                @method('DELETE')
                                                <button type="submit" class="dropdown-item text-danger"><i class="bi bi-trash me-2"></i>Supprimer pour tout le monde</button>
                                            </form>
                                        </li>
                                    </ul>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            @empty
                <div class="text-center text-muted py-4 w-100">
                    <p class="mb-0 small">Aucun message. Envoyez le premier.</p>
                </div>
            @endforelse
        </div>

        @if ($canReply)
            @error('body')<div class="alert alert-danger m-2 py-2">{{ $message }}</div>@enderror
            @error('attachments')<div class="alert alert-danger m-2 py-2">{{ $message }}</div>@enderror
            <form method="POST" action="{{ route('inbox.storeMessage', $conversation) }}" enctype="multipart/form-data" id="inbox-form">
                @csrf
                    <div class="inbox-chat__input-wrap">
                    <div class="inbox-chat__input-inner">
                        <div class="inbox-chat__input-actions">
                            <label class="btn mb-0" title="Pièce jointe"><i class="bi bi-paperclip"></i>
                                <input type="file" name="attachments[]" class="d-none" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip">
                            </label>
                        </div>
                        <textarea name="body" id="inbox-body" class="inbox-chat__input-field" rows="1" placeholder="Écrivez un message" maxlength="5000">{{ old('body') }}</textarea>
                        <div class="inbox-chat__input-actions">
                            <button type="submit" class="btn" title="Envoyer"><i class="bi bi-send-fill"></i></button>
                        </div>
                    </div>
                    <div class="inbox-chat__extras mt-2">
                        <label class="mb-0 small d-flex align-items-center gap-1">
                            <input type="checkbox" name="is_ephemeral" value="1" {{ old('is_ephemeral') ? 'checked' : '' }} class="form-check-input">
                            <span>Message éphémère</span>
                        </label>
                    </div>
                </div>
            </form>
        @else
            <div class="inbox-chat__no-reply">Vous ne pouvez pas envoyer de message dans cette conversation (règles de votre profil).</div>
        @endif
    </main>
</div>
@endsection

@section('scripts')
<script>
(function() {
    var messagesEl = document.getElementById('inbox-messages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
})();
</script>
@if ($canReply)
<script>
(function() {
    var form = document.getElementById('inbox-form');
    var bodyEl = document.getElementById('inbox-body');
    if (!form || !bodyEl) return;
    bodyEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.submit();
        }
    });
})();
</script>
@endif
@endsection
