@extends('layouts.app')

@section('title', 'Budgets - ESEBAT')
@section('page-title', 'Gestion des budgets')
@section('page-subtitle', 'Budgets par campus et exercice')

@section('content')
@if ($readOnly ?? false)
<div class="alert alert-info mb-4">
    <i class="bi bi-eye me-2"></i> <strong>Mode lecture seule.</strong> En tant que point focal, vous consultez les budgets et l’état des dépenses. Les montants sont synchronisés avec les commandes (demandes de matériel) validées : chaque validation enregistre la dépense sur le budget du campus.
</div>
@endif

<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">{{ ($readOnly ?? false) ? 'Budgets (consultation)' : 'Tous les budgets' }}</h1>
        <p class="page-hero-subtitle mb-0">Gestion des budgets par campus et exercice fiscal</p>
    </div>
    @if (!($readOnly ?? false) && auth()->user()->can('create', App\Models\Budget::class))
        <a href="{{ route('budgets.create') }}" class="btn btn-primary btn-sm">
            <i class="bi bi-plus-circle me-1"></i> Nouveau budget
        </a>
    @endif
</div>

<!-- Tabs -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab', 'all') === 'all' ? 'active' : '' }}" 
                           href="{{ route('budgets.index', ['tab' => 'all']) }}">
                            Tous <span class="badge bg-secondary">{{ $stats['total'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'draft' ? 'active' : '' }}" 
                           href="{{ route('budgets.index', ['tab' => 'draft']) }}">
                            Brouillon <span class="badge bg-light text-dark">{{ $stats['draft'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'approved' ? 'active' : '' }}" 
                           href="{{ route('budgets.index', ['tab' => 'approved']) }}">
                            Approuvés <span class="badge bg-warning">{{ $stats['approved'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'active' ? 'active' : '' }}" 
                           href="{{ route('budgets.index', ['tab' => 'active']) }}">
                            Actifs <span class="badge bg-success">{{ $stats['active'] ?? 0 }}</span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Budgets List -->
<div class="row">
    <div class="col-12">
        @forelse ($budgets as $budget)
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-5">
                            <h6 style="margin-bottom: 5px;">{{ $budget->campus->name }} - FY {{ $budget->fiscal_year }}</h6>
                            <div style="font-size: 13px; color: #666;">
                                Créé le : {{ $budget->created_at->format('d/m/Y') }}
                                @if ($budget->approved_at)
                                    | Approuvé le : {{ $budget->approved_at->format('d/m/Y') }}
                                @endif
                            </div>
                        </div>

                        <div class="col-md-3">
                            <div style="font-size: 13px;">
                                <div style="margin-bottom: 8px;">
                                    @php
                                        $totalBudget = (float) $budget->total_budget;
                                        $utilization = $totalBudget > 0 ? (($budget->spent_amount / $totalBudget) * 100) : 0;
                                        $alertClass = $utilization >= 90 ? 'bg-danger' : ($utilization >= 75 ? 'bg-warning' : 'bg-success');
                                    @endphp
                                    <strong>Utilisation : {{ number_format($utilization, 1) }} %</strong>
                                </div>
                                <div class="progress" style="height: 20px;">
                                    <div class="progress-bar {{ str_replace('bg-', '', $alertClass) }}" 
                                         style="width: {{ min($utilization, 100) }}%; background-color: {{ $alertClass === 'bg-danger' ? '#dc3545' : ($alertClass === 'bg-warning' ? '#ffc107' : '#198754') }};">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-2">
                            <div style="font-size: 13px;">
                                <strong>Montant</strong><br>
                                {{ number_format($budget->total_budget, 0) }} FCFA<br>
                                <small class="text-muted">Dépensé : {{ number_format($budget->spent_amount, 0) }} FCFA</small>
                            </div>
                        </div>

                        <div class="col-md-2 text-end">
                            <div class="mb-2">
                                @if ($budget->status === 'draft')
                                    <span class="badge bg-secondary">Brouillon</span>
                                @elseif ($budget->status === 'approved')
                                    <span class="badge bg-warning text-dark">Approuvé</span>
                                @elseif ($budget->status === 'active')
                                    <span class="badge bg-success">Actif</span>
                                @elseif ($budget->status === 'closed')
                                    <span class="badge bg-dark">Clôturé</span>
                                @endif
                            </div>
                            <a href="{{ route('budgets.show', $budget) }}" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-eye"></i> Voir
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        @empty
            <div class="card">
                <div class="card-body text-center py-5">
                    <p class="text-muted">Aucun budget</p>
                </div>
            </div>
        @endforelse

        <!-- Pagination -->
        @if (method_exists($budgets, 'links'))
            <div class="d-flex justify-content-center mt-4">
                {{ $budgets->links('pagination::bootstrap-5') }}
            </div>
        @endif
    </div>
</div>
@endsection
