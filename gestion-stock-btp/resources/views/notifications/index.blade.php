@extends('layouts.app')

@section('title', 'Notifications - ESEBAT')
@section('page-title', 'Centre de notifications')

@section('content')
<div class="row mb-3">
    <div class="col-12 d-flex justify-content-between align-items-center">
        <h5>Vos notifications</h5>
        @if ($notifications->whereNull('read_at')->count() > 0)
            <form action="{{ route('notifications.mark-all-read') }}" method="POST" class="d-inline">
                @csrf
                <button type="submit" class="btn btn-sm btn-outline-secondary">Tout marquer comme lu</button>
            </form>
        @endif
    </div>
</div>
<div class="card">
    <div class="list-group list-group-flush">
        @forelse ($notifications as $n)
            <div class="list-group-item {{ $n->read_at ? '' : 'bg-light' }}">
                <div class="d-flex justify-content-between">
                    <div>
                        <strong>{{ $n->title }}</strong>
                        <p class="mb-1 small text-muted">{{ $n->message }}</p>
                        <small class="text-muted">{{ $n->created_at->format('d/m/Y H:i') }}</small>
                    </div>
                    @if (!$n->read_at)
                        <form action="{{ route('notifications.mark-read', $n) }}" method="POST">
                            @csrf
                            <button type="submit" class="btn btn-sm btn-outline-primary">Marquer lu</button>
                        </form>
                    @endif
                </div>
                @if (!empty($n->data['material_request_id']))
                    <a href="{{ route('material-requests.show', $n->data['material_request_id']) }}" class="btn btn-sm btn-link p-0 mt-1">Voir la demande</a>
                @endif
                @if (isset($n->type) && $n->type === 'inbox_message' && !empty($n->data['conversation_id']))
                    <a href="{{ route('inbox.show', $n->data['conversation_id']) }}" class="btn btn-sm btn-link p-0 mt-1">Voir la conversation</a>
                @endif
            </div>
        @empty
            <div class="list-group-item text-center text-muted py-5">Aucune notification.</div>
        @endforelse
    </div>
</div>
@if ($notifications->hasPages())
    <div class="d-flex justify-content-center mt-4">{{ $notifications->links() }}</div>
@endif
@endsection
