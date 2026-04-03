@extends('layouts.app')

@section('title', $campus->name . ' - ESEBAT')
@section('page-title', $campus->name)

@section('content')
<div class="row mb-4">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Informations du campus</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr><th>Nom</th><td>{{ $campus->name }}</td></tr>
                    <tr><th>Code</th><td><code>{{ $campus->code }}</code></td></tr>
                    <tr><th>Localisation / Ville</th><td>{{ $campus->city ?? '—' }}</td></tr>
                    <tr><th>Adresse</th><td>{{ $campus->address ?? '—' }}</td></tr>
                    <tr><th>Responsable de commande</th><td>{{ $campus->orderResponsible->name ?? '—' }}</td></tr>
                    <tr><th>Statut</th><td>@if($campus->is_active)<span class="badge bg-success">Actif</span>@else<span class="badge bg-secondary">Inactif</span>@endif</td></tr>
                </table>
                @if (auth()->user()->hasRole('super_admin'))
                <a href="{{ route('campuses.edit', $campus) }}" class="btn btn-sm btn-outline-primary">Modifier</a>
                @endif
            </div>
        </div>
    </div>
</div>
@if (isset($staff) && $staff->isNotEmpty())
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">Staff du campus</div>
            <div class="card-body">
                <ul class="list-group list-group-flush">
                    @foreach ($staff as $u)
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>{{ $u->name }}</span>
                        <span class="badge bg-secondary">{{ $u->roles->first()?->name ?? '—' }}</span>
                    </li>
                    @endforeach
                </ul>
            </div>
        </div>
    </div>
</div>
@endif
<div class="card">
    <div class="card-header">Demandes de ce campus</div>
    <div class="card-body">
        @if ($campus->materialRequests->count() > 0)
            <ul class="list-group list-group-flush">
                @foreach ($campus->materialRequests->take(10) as $req)
                    <li class="list-group-item d-flex justify-content-between">
                        <a href="{{ route('material-requests.show', $req) }}">{{ $req->request_number }}</a>
                        <span class="badge bg-secondary">{{ $req->status }}</span>
                    </li>
                @endforeach
            </ul>
            @if ($campus->materialRequests->count() > 10)
                <p class="mb-0 mt-2"><a href="{{ route('material-requests.index') }}">Voir toutes les demandes</a></p>
            @endif
        @else
            <p class="text-muted mb-0">Aucune demande pour ce campus.</p>
        @endif
    </div>
</div>
@endsection
