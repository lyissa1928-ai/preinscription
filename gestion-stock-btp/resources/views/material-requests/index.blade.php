@extends('layouts.app')

@section('title', 'Demandes de matériel - ESEBAT')
@section('page-title', 'Demandes de matériel')
@section('page-subtitle', 'Créer et suivre vos demandes')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Demandes de matériel</h1>
        <p class="page-hero-subtitle mb-0">Liste des demandes, filtres par campus et statut</p>
    </div>
    @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
    <a href="{{ route('material-requests.create') }}" class="btn btn-primary">
        <i class="bi bi-file-earmark-plus me-1"></i> Nouvelle demande
    </a>
    @endif
</div>

@if ($campuses->isNotEmpty())
<!-- Filtres (point focal / directeur) -->
<form method="GET" class="card mb-4">
    <div class="card-header"><i class="bi bi-funnel"></i> Filtres</div>
    <div class="card-body row g-3">
        <div class="col-md-3">
            <label for="campus_id" class="form-label">Campus</label>
            <select name="campus_id" id="campus_id" class="form-select form-select-sm">
                <option value="">Tous les campus</option>
                @foreach ($campuses as $c)
                    <option value="{{ $c->id }}" {{ request('campus_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                @endforeach
            </select>
        </div>
        <div class="col-md-3">
            <label for="status" class="form-label">Statut</label>
            <select name="status" id="status" class="form-select form-select-sm">
                <option value="">Tous</option>
                <option value="draft" {{ request('status') === 'draft' ? 'selected' : '' }}>Brouillon</option>
                <option value="submitted" {{ request('status') === 'submitted' ? 'selected' : '' }}>Soumise</option>
                <option value="pending_director" {{ request('status') === 'pending_director' ? 'selected' : '' }}>Transmise au directeur</option>
                <option value="director_approved" {{ request('status') === 'director_approved' ? 'selected' : '' }}>Approuvée par le directeur</option>
                <option value="in_treatment" {{ request('status') === 'in_treatment' ? 'selected' : '' }}>En cours de traitement</option>
                <option value="approved" {{ request('status') === 'approved' ? 'selected' : '' }}>Validée</option>
                <option value="cancelled" {{ request('status') === 'cancelled' ? 'selected' : '' }}>Rejetée</option>
                <option value="delivered" {{ request('status') === 'delivered' ? 'selected' : '' }}>Livrée / clôturée</option>
            </select>
        </div>
        <div class="col-md-2 d-flex align-items-end">
            <button type="submit" class="btn btn-sm btn-outline-primary">Filtrer</button>
        </div>
    </div>
</form>
@else
<!-- Filtre par statut (staff) -->
<form method="GET" class="card mb-4">
    <div class="card-header"><i class="bi bi-funnel"></i> Filtres</div>
    <div class="card-body row g-3 align-items-end">
        <div class="col-md-4">
            <label for="status_staff" class="form-label">Filtrer par statut</label>
            <select name="status" id="status_staff" class="form-select form-select-sm">
                <option value="">Toutes mes demandes</option>
                <option value="draft" {{ request('status') === 'draft' ? 'selected' : '' }}>Brouillon</option>
                <option value="submitted" {{ request('status') === 'submitted' ? 'selected' : '' }}>Soumise</option>
                <option value="approved" {{ request('status') === 'approved' ? 'selected' : '' }}>Validée</option>
                <option value="delivered" {{ request('status') === 'delivered' ? 'selected' : '' }}>Livrée / clôturée</option>
                <option value="cancelled" {{ request('status') === 'cancelled' ? 'selected' : '' }}>Rejetée</option>
            </select>
        </div>
        <div class="col-md-2">
            <button type="submit" class="btn btn-sm btn-outline-primary">Filtrer</button>
        </div>
    </div>
</form>
@endif

<!-- Requests Table -->
<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="bi bi-list-ul"></i> Liste des demandes</span>
    </div>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead>
                <tr>
                    <th>N° demande</th>
                    <th>Type</th>
                    <th>Campus</th>
                    <th>Objet</th>
                    <th>Demandeur</th>
                    <th>Articles</th>
                    <th>Date souhaitée</th>
                    <th>Statut</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($materialRequests as $request)
                    <tr>
                        <td><strong>{{ $request->request_number }}</strong></td>
                        <td>
                            @if (($request->request_type ?? 'individual') === 'grouped')
                                <span class="badge bg-info">Groupée</span>
                            @else
                                <span class="badge bg-secondary">Individuelle</span>
                            @endif
                        </td>
                        <td>{{ $request->campus?->name ?? '—' }}</td>
                        <td><small>{{ Str::limit($request->subject ?? '—', 40) }}</small></td>
                        <td>{{ $request->requester?->name ?? 'Utilisateur supprimé' }}</td>
                        <td><span class="badge bg-info">{{ $request->requestItems->count() }}</span></td>
                        <td>{{ $request->needed_by_date ? $request->needed_by_date->format('d/m/Y') : '—' }}</td>
                        <td>
                            @if ($request->status === 'draft')
                                <span class="badge bg-secondary">Brouillon</span>
                            @elseif ($request->status === 'submitted')
                                <span class="badge bg-warning text-dark">Soumise</span>
                            @elseif ($request->status === 'pending_director')
                                <span class="badge bg-primary">Transmise au directeur</span>
                            @elseif ($request->status === 'director_approved')
                                <span class="badge bg-info">Approuvée (directeur)</span>
                            @elseif ($request->status === 'in_treatment')
                                <span class="badge bg-info">En cours</span>
                            @elseif ($request->status === 'approved')
                                <span class="badge bg-success">Validée</span>
                            @elseif ($request->status === 'aggregated')
                                <span class="badge bg-info">Regroupée</span>
                            @elseif ($request->status === 'received')
                                <span class="badge bg-success">Réceptionnée</span>
                            @elseif ($request->status === 'delivered')
                                <span class="badge bg-success">Livrée</span>
                            @elseif ($request->status === 'cancelled')
                                <span class="badge bg-danger">Rejetée</span>
                            @else
                                <span class="badge bg-secondary">{{ ucfirst($request->status) }}</span>
                            @endif
                        </td>
                        <td>
                            <a href="{{ route('material-requests.show', $request) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i> Voir</a>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="9" class="text-center py-4 text-muted">
                            <i class="bi bi-inbox"></i> Aucune demande de matériel
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
@if ($materialRequests->hasPages())
    <div class="d-flex justify-content-center mt-4">
        {{ $materialRequests->links() }}
    </div>
@endif
@endsection
