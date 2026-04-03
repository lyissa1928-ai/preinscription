@extends('layouts.app')

@section('title', 'Commandes groupées - ESEBAT')
@section('page-title', 'Commandes')
@section('page-subtitle', 'Commandes groupées et réceptions')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Toutes les commandes</h1>
        <p class="page-hero-subtitle mb-0">Brouillons, confirmées et réceptionnées</p>
    </div>
    @if (auth()->user()->can('create', App\Models\AggregatedOrder::class))
        <a href="{{ route('aggregated-orders.create') }}" class="btn btn-primary btn-sm">
            <i class="bi bi-plus-circle me-1"></i> Nouvelle commande
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
                           href="{{ route('aggregated-orders.index', ['tab' => 'all']) }}">
                            Toutes <span class="badge bg-secondary">{{ $stats['total'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'draft' ? 'active' : '' }}" 
                           href="{{ route('aggregated-orders.index', ['tab' => 'draft']) }}">
                            Brouillon <span class="badge bg-light text-dark">{{ $stats['draft'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'confirmed' ? 'active' : '' }}" 
                           href="{{ route('aggregated-orders.index', ['tab' => 'confirmed']) }}">
                            Confirmées <span class="badge bg-info">{{ $stats['confirmed'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'received' ? 'active' : '' }}" 
                           href="{{ route('aggregated-orders.index', ['tab' => 'received']) }}">
                            Réceptionnées <span class="badge bg-success">{{ $stats['received'] ?? 0 }}</span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Orders Table -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-list-ul"></i> Liste des commandes</div>
            <div class="card-body">
                @forelse ($aggregatedOrders as $order)
                    <div class="row align-items-center border-bottom py-3">
                        <div class="col-md-4">
                            <div>
                                <strong>{{ $order->po_number }}</strong>
                                <div style="font-size: 13px; color: #666;">
                                    {{ $order->supplier->name }}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div style="font-size: 13px;">
                                <strong>Articles :</strong><br>
                                <span class="badge bg-light text-dark">{{ $order->aggregatedOrderItems->count() }}</span>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div style="font-size: 13px;">
                                <strong>Montant :</strong><br>
                                <span style="color: #2563eb;">{{ number_format($order->getTotalValue(), 2) }} XOF</span>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div>
                                @if ($order->status === 'draft')
                                    <span class="badge bg-secondary">Brouillon</span>
                                @elseif ($order->status === 'confirmed')
                                    <span class="badge bg-info">Confirmée</span>
                                @elseif ($order->status === 'received')
                                    <span class="badge bg-success">Réceptionnée</span>
                                @endif
                            </div>
                        </div>
                        <div class="col-md-2 text-end">
                            <a href="{{ route('aggregated-orders.show', $order) }}" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-eye"></i> Voir
                            </a>
                        </div>
                    </div>
                @empty
                    <div class="text-center py-5">
                        <p class="text-muted">Aucune commande</p>
                    </div>
                @endforelse
            </div>
        </div>

        <!-- Pagination -->
        @if (method_exists($aggregatedOrders, 'links'))
            <div class="d-flex justify-content-center mt-4">
                {{ $aggregatedOrders->links('pagination::bootstrap-5') }}
            </div>
        @endif
    </div>
</div>
@endsection
