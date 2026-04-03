@extends('layouts.app')

@section('title', 'Tickets de maintenance - ESEBAT')
@section('page-title', 'Tickets de maintenance')
@section('page-subtitle', 'Suivi des interventions')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Tous les tickets</h1>
        <p class="page-hero-subtitle mb-0">Ouverts, en cours et résolus</p>
    </div>
    @if (auth()->user()->can('create', App\Models\MaintenanceTicket::class))
        <a href="{{ route('maintenance-tickets.create') }}" class="btn btn-primary btn-sm">
            <i class="bi bi-plus-circle me-1"></i> Nouveau ticket
        </a>
    @endif
</div>

<!-- Filter & Tabs -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-funnel"></i> Filtres par statut</div>
            <div class="card-body">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab', 'all') === 'all' ? 'active' : '' }}" 
                           href="{{ route('maintenance-tickets.index', ['tab' => 'all']) }}">
                            Tous <span class="badge bg-secondary">{{ $stats['total'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'open' ? 'active' : '' }}" 
                           href="{{ route('maintenance-tickets.index', ['tab' => 'open']) }}">
                            Ouverts <span class="badge bg-danger">{{ $stats['open'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'in-progress' ? 'active' : '' }}" 
                           href="{{ route('maintenance-tickets.index', ['tab' => 'in-progress']) }}">
                            En cours <span class="badge bg-info">{{ $stats['in_progress'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'resolved' ? 'active' : '' }}" 
                           href="{{ route('maintenance-tickets.index', ['tab' => 'resolved']) }}">
                            Résolus <span class="badge bg-success">{{ $stats['resolved'] ?? 0 }}</span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Tickets Table -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-list-ul"></i> Liste des tickets</div>
            <div class="card-body">
                @forelse ($tickets as $ticket)
                    <div class="row align-items-center border-bottom py-3">
                        <div class="col-md-5">
                            <div>
                                <strong style="font-size: 14px;">{{ $ticket->title }}</strong>
                                <div style="font-size: 13px; color: #666;">
                                    Actif : {{ $ticket->asset->serial_number }}<br>
                                    Créé le : {{ $ticket->created_at->format('d/m/Y') }}
                                </div>
                            </div>
                        </div>

                        <div class="col-md-2">
                            @if ($ticket->assigned_to_id)
                                <div style="font-size: 13px;">
                                    <strong>Assigné à :</strong><br>
                                    {{ $ticket->assignedTo->name }}
                                </div>
                            @else
                                <span class="badge bg-light text-dark">Non assigné</span>
                            @endif
                        </div>

                        <div class="col-md-2">
                            <div>
                                @if ($ticket->status === 'open')
                                    <span class="badge bg-danger">Ouvert</span>
                                @elseif ($ticket->status === 'in_progress')
                                    <span class="badge bg-info">En cours</span>
                                @elseif ($ticket->status === 'resolved')
                                    <span class="badge bg-success">Résolu</span>
                                @elseif ($ticket->status === 'closed')
                                    <span class="badge bg-secondary">Clôturé</span>
                                @endif
                            </div>
                        </div>

                        <div class="col-md-3 text-end">
                            <a href="{{ route('maintenance-tickets.show', $ticket) }}" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-eye"></i> Voir
                            </a>
                        </div>
                    </div>
                @empty
                    <div class="text-center py-5">
                        <p class="text-muted">Aucun ticket de maintenance</p>
                    </div>
                @endforelse
            </div>
        </div>

        <!-- Pagination -->
        @if (method_exists($tickets, 'links'))
            <div class="d-flex justify-content-center mt-4">
                {{ $tickets->links('pagination::bootstrap-5') }}
            </div>
        @endif
    </div>
</div>
@endsection
