@extends('layouts.app')

@section('title', 'Messagerie - ESEBAT')
@section('page-title', 'Messagerie')
@section('page-subtitle', 'Conversations')

@section('styles')
<link rel="stylesheet" href="{{ asset('css/inbox-whatsapp.css') }}">
@endsection

@section('content')
<div class="inbox-app">
    {{-- Colonne gauche : liste des conversations --}}
    <aside class="inbox-sidebar" id="inbox-sidebar">
        @include('inbox.partials.conversation-list', ['currentConversation' => $currentConversation ?? null])
    </aside>

    {{-- Zone droite : bienvenue (aucune conversation sélectionnée) --}}
    <main class="inbox-main">
        <div class="inbox-welcome">
            <svg class="inbox-welcome__icon" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M130 130c0-71.6 58.4-130 130-130 0 71.6-58.4 130-130 130C130 58.4 71.6 0 0 0c0 71.6 58.4 130 130 130z" fill="currentColor"/>
                <path d="M130 70v120M70 130h120" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
            </svg>
            <h2 class="inbox-welcome__title">Messagerie ESEBAT</h2>
            <p class="inbox-welcome__text">Sélectionnez une conversation dans la liste ou démarrez une nouvelle discussion. Les échanges respectent les règles de votre profil.</p>
            <a href="{{ route('inbox.create') }}" class="btn btn-primary btn-lg rounded-pill px-4">
                <i class="bi bi-chat-square-text me-2"></i> Nouvelle conversation
            </a>
        </div>
    </main>
</div>
@endsection

@section('scripts')
<script>
(function() {
    var search = document.getElementById('inbox-search');
    var list = document.getElementById('inbox-conversations-list');
    if (!search || !list) return;
    search.addEventListener('input', function() {
        var q = this.value.trim().toLowerCase();
        var items = list.querySelectorAll('.inbox-conv');
        items.forEach(function(el) {
            var name = (el.getAttribute('data-conv-name') || '').toLowerCase();
            el.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
        });
    });
})();
</script>
@endsection
