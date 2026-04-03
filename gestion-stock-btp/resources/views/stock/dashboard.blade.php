@extends('layouts.app')

@section('title', 'Gestion du stock - ESEBAT')
@section('page-title', 'Tableau de bord stock')

@section('content')
<!-- Low Stock Alerts -->
<div class="row mb-4">
    <div class="col-12">
        @if ($lowStockItems->count() > 0)
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <h5 class="alert-heading">
                    <i class="bi bi-exclamation-triangle"></i> Alerte stock faible
                </h5>
                <p class="mb-2">
                    <strong>{{ $lowStockItems->count() }} article(s)</strong> sous le seuil de réapprovisionnement
                </p>
                <hr>
                <div class="row">
                    @foreach ($lowStockItems->take(3) as $item)
                        <div class="col-md-4">
                            <small>
                                <strong>{{ $item->description ?? $item->name }}</strong><br>
                                Actuel : {{ $item->stock_quantity }} | Seuil : {{ $item->reorder_threshold }}
                            </small>
                        </div>
                    @endforeach
                </div>
                @if ($lowStockItems->count() > 3)
                    <small class="text-muted">... et {{ $lowStockItems->count() - 3 }} autre(s)</small>
                @endif
                <div class="mt-2">
                    <a href="{{ route('stock.lowStockAlert') }}" class="btn btn-sm btn-warning">
                        <i class="bi bi-download"></i> Voir le rapport complet
                    </a>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        @else
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle"></i> Niveaux de stock normaux
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        @endif
    </div>
</div>

<!-- KPI Cards -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <h6 style="color: #666;">Articles au total</h6>
                <h3 style="color: #2563eb;">{{ $stats['total_items'] }}</h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <h6 style="color: #666;">En stock</h6>
                <h3 style="color: #198754;">{{ $stats['in_stock'] }}</h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <h6 style="color: #666;">Stock faible</h6>
                <h3 style="color: #f59e0b;">{{ $stats['low_stock'] }}</h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <h6 style="color: #666;">Rupture</h6>
                <h3 style="color: #dc3545;">{{ $stats['out_of_stock'] }}</h3>
            </div>
        </div>
    </div>
</div>

<!-- Stock Overview by Category -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Stock par catégorie</span>
                <a href="{{ route('stock.index') }}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-eye"></i> Voir tous les articles
                </a>
            </div>
            <div class="card-body">
                @forelse ($categories as $category)
                    @php
                        $categoryItems = $category->items()->get();
                        $threshold = $categoryItems->first()?->reorder_threshold ?? 0;
                        $inStock = $categoryItems->where('stock_quantity', '>', $threshold)->count();
                        $lowStock = $categoryItems->where('stock_quantity', '<=', $threshold)->count();
                    @endphp
                    <div class="row border-bottom py-3 align-items-center">
                        <div class="col-md-3">
                            <strong style="font-size: 13px;">{{ $category->name }}</strong>
                        </div>
                        <div class="col-md-3">
                            <small>Total articles : <strong>{{ $categoryItems->count() }}</strong></small><br>
                            <small>En stock : <strong style="color: #198754;">{{ $inStock }}</strong></small>
                        </div>
                        <div class="col-md-3">
                            <small>Stock faible : <strong style="color: #f59e0b;">{{ $lowStock }}</strong></small>
                        </div>
                        <div class="col-md-3 text-end">
                            <a href="{{ route('stock.index', ['category' => $category->id]) }}" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-eye"></i> Voir les articles
                            </a>
                        </div>
                    </div>
                @empty
                    <div class="text-center py-4">
                        <p class="text-muted">Aucun article</p>
                    </div>
                @endforelse
            </div>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">Actions rapides</div>
            <div class="card-body">
                <div class="d-flex gap-3 flex-wrap">
                    <a href="{{ route('stock.index') }}" class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-list"></i> Tous les articles
                    </a>
                    <a href="{{ route('stock.lowStockAlert') }}" class="btn btn-outline-warning btn-sm">
                        <i class="bi bi-exclamation-circle"></i> Rapport stock faible
                    </a>
                    <a href="{{ route('stock.index', ['view' => 'reorder']) }}" class="btn btn-outline-success btn-sm">
                        <i class="bi bi-download"></i> Liste réapprovisionnement
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
