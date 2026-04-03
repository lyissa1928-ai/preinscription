@extends('layouts.app')

@section('title', $user->display_name . ' - ESEBAT')
@section('page-title', 'Fiche utilisateur')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 class="mb-0">Fiche de {{ $user->display_name }}</h5>
            <div>
                @if (auth()->user()->hasRole('super_admin'))
                <a href="{{ route('users.edit', $user) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i> Modifier</a>
                @if ($user->id !== auth()->id())
                    <form action="{{ route('users.destroy', $user) }}" method="POST" class="d-inline" onsubmit="return confirm('Supprimer cet utilisateur ?');">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i> Supprimer</button>
                    </form>
                @endif
                @endif
                <a href="{{ route('users.index') }}" class="btn btn-sm btn-outline-secondary">Liste</a>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Identité et contact</div>
            <div class="card-body">
                <div class="d-flex gap-3 mb-3">
                    @if ($user->profile_photo_url)
                        <img src="{{ asset($user->profile_photo_url) }}" alt="Photo de profil" class="rounded" style="width: 80px; height: 80px; object-fit: cover;">
                    @else
                        <div class="rounded bg-light d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;"><i class="bi bi-person fs-2 text-muted"></i></div>
                    @endif
                    <div class="flex-grow-1">
                        <h6 class="mb-1">{{ $user->first_name }} {{ $user->last_name }}</h6>
                        @if ($user->matricule)
                            <span class="badge bg-secondary">Matricule : {{ $user->matricule }}</span>
                        @endif
                    </div>
                </div>
                <table class="table table-sm table-borderless mb-0">
                    <tr><th style="width: 38%;">Prénom</th><td>{{ $user->first_name ?? '—' }}</td></tr>
                    <tr><th>Nom</th><td>{{ $user->last_name ?? '—' }}</td></tr>
                    <tr><th>Matricule</th><td>{{ $user->matricule ?? '—' }}</td></tr>
                    <tr><th>Email</th><td>{{ $user->email }}</td></tr>
                    <tr><th>Téléphone</th><td>{{ $user->phone ?? '—' }}</td></tr>
                    <tr><th>Adresse</th><td>{{ $user->address ? nl2br(e($user->address)) : '—' }}</td></tr>
                    <tr><th>Campus d'affectation</th><td>{{ $user->campus->name ?? '—' }}</td></tr>
                    <tr><th>Profil</th><td><span class="badge bg-secondary">{{ \App\Http\Controllers\UserController::roleLabels()[$user->roles->first()?->name] ?? $user->roles->first()?->name }}</span></td></tr>
                    <tr><th>Statut</th><td>@if ($user->is_active)<span class="badge bg-success">Actif</span>@else<span class="badge bg-secondary">Inactif</span>@endif</td></tr>
                    <tr><th>Créé le</th><td>{{ $user->created_at->format('d/m/Y H:i') }}</td></tr>
                </table>
            </div>
        </div>
    </div>
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Demandes récentes ({{ $user->submittedRequests->count() }} affichées)</div>
            <div class="card-body">
                @if ($user->submittedRequests->isNotEmpty())
                    <ul class="list-group list-group-flush">
                        @foreach ($user->submittedRequests as $req)
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                <a href="{{ route('material-requests.show', $req) }}">{{ $req->request_number }}</a>
                                <span class="badge bg-{{ $req->status === 'submitted' ? 'warning' : ($req->status === 'approved' ? 'success' : 'secondary') }}">{{ $req->status }}</span>
                            </li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-muted mb-0">Aucune demande créée par cet utilisateur.</p>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
