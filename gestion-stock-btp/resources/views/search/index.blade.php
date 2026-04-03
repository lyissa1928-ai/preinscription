@extends('layouts.app')

@section('title', 'Recherche — ' . $q . ' - ESEBAT')
@section('page-title', 'Recherche')
@section('page-subtitle', 'Résultats pour « ' . e($q) . ' »')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Résultats de recherche</h1>
        <p class="page-hero-subtitle mb-0">Demandes, commandes et utilisateurs pour « {{ e($q) }} »</p>
    </div>
    <a href="{{ route('dashboard') }}" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-speedometer2 me-1"></i> Tableau de bord
    </a>
</div>

@php
    $statusLabels = [
        'draft' => 'Brouillon',
        'submitted' => 'Soumise',
        'pending_director' => 'Transmise au directeur',
        'director_approved' => 'Approuvée directeur',
        'in_treatment' => 'En cours',
        'approved' => 'Validée',
        'aggregated' => 'Regroupée',
        'received' => 'Réceptionnée',
        'delivered' => 'Livrée',
        'cancelled' => 'Rejetée',
    ];
@endphp

<div class="row g-4">
    {{-- Demandes --}}
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-file-text"></i> Demandes de matériel</div>
            <div class="card-body">
                @if ($demandes->isEmpty())
                    <p class="text-muted mb-0">Aucune demande trouvée.</p>
                @else
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>N° demande</th>
                                    <th>Sujet</th>
                                    <th>Campus</th>
                                    <th>Statut</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($demandes as $req)
                                    <tr>
                                        <td><strong>{{ $req->request_number }}</strong></td>
                                        <td>{{ Str::limit($req->subject ?? '—', 50) }}</td>
                                        <td>{{ $req->campus->name ?? '—' }}</td>
                                        <td>
                                            <span class="badge bg-{{ $req->status === 'approved' || $req->status === 'delivered' || $req->status === 'received' ? 'success' : ($req->status === 'cancelled' ? 'danger' : ($req->status === 'submitted' ? 'warning text-dark' : 'secondary')) }}">
                                                {{ $statusLabels[$req->status] ?? ucfirst($req->status) }}
                                            </span>
                                        </td>
                                        <td>
                                            <a href="{{ route('material-requests.show', $req) }}" class="btn btn-sm btn-outline-primary">Voir</a>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </div>
        </div>
    </div>

    @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-truck"></i> Commandes groupées</div>
            <div class="card-body">
                @if ($commandes->isEmpty())
                    <p class="text-muted mb-0">Aucune commande trouvée.</p>
                @else
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>N° commande</th>
                                    <th>Fournisseur</th>
                                    <th>Statut</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($commandes as $order)
                                    <tr>
                                        <td><strong>{{ $order->po_number }}</strong></td>
                                        <td>{{ $order->supplier->name ?? '—' }}</td>
                                        <td>
                                            <span class="badge bg-{{ $order->status === 'received' ? 'success' : ($order->status === 'confirmed' ? 'info' : 'secondary') }}">
                                                {{ $order->status === 'draft' ? 'Brouillon' : ($order->status === 'confirmed' ? 'Confirmée' : ($order->status === 'received' ? 'Réceptionnée' : ucfirst($order->status))) }}
                                            </span>
                                        </td>
                                        <td>
                                            <a href="{{ route('aggregated-orders.show', $order) }}" class="btn btn-sm btn-outline-primary">Voir</a>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </div>
        </div>
    </div>
    @endif

    @if (auth()->user()->hasAnyRole(['director', 'super_admin']))
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-people"></i> Utilisateurs</div>
            <div class="card-body">
                @if ($utilisateurs->isEmpty())
                    <p class="text-muted mb-0">Aucun utilisateur trouvé.</p>
                @else
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Email</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($utilisateurs as $u)
                                    <tr>
                                        <td><strong>{{ $u->name }}</strong></td>
                                        <td>{{ $u->email }}</td>
                                        <td>
                                            <a href="{{ route('users.show', $u) }}" class="btn btn-sm btn-outline-primary">Voir</a>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </div>
        </div>
    </div>
    @endif
</div>
@endsection
