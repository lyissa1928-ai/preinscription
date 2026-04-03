@extends('layouts.app')

@section('title', 'Stock et référentiel - ESEBAT')
@section('page-title', 'Stock et référentiel')
@section('page-subtitle', 'Référentiel, stock et réceptions')

@section('content')
<div class="page-hero">
    <h1 class="page-hero-title">Stock et référentiel</h1>
    <p class="page-hero-subtitle mb-0">Référentiel des matériels, niveaux de stock et stock par staff</p>
</div>
@if (!$canManage)
{{-- Staff : uniquement son propre stock — pas le stock du point focal, pas les prix --}}
<p class="text-muted mb-4">Consultez et gérez <strong>votre stock personnel</strong> : quantités reçues (après livraison, via « Stocker » sur la demande), utilisées ou distribuées, et restantes. Les prix ne vous concernent pas.</p>
<div class="row g-4">
    <div class="col-md-6 col-lg-4">
        <div class="card h-100 border-primary">
            <div class="card-body">
                <h6 class="card-title text-primary"><i class="bi bi-person-badge me-2"></i>Mon stock personnel</h6>
                <p class="card-text small text-muted">Votre stock : reçu, utilisé/distribué, restant. Synchronisé avec les commandes livrées (Stocker) et les utilisations que vous enregistrez.</p>
                <a href="{{ route('personal-stock.index') }}" class="btn btn-primary btn-sm">Ouvrir mon stock</a>
            </div>
        </div>
    </div>
</div>
@else
<p class="text-muted mb-4">Référentiel des matériels, stock et réceptions. Enregistrez les réceptions ; consultez le stock par staff (reçus, utilisés, restants).</p>
<div class="row g-4 app-grid">
    <div class="col-md-6 col-lg-4">
        <div class="card h-100 border-primary">
            <div class="card-body">
                <h6 class="card-title text-primary"><i class="bi bi-box-seam me-2"></i>Référentiel des matériels</h6>
                <p class="card-text small text-muted">Catalogue (image, catégorie, nom) et gestion des articles.</p>
                <a href="{{ route('referentiel.index') }}" class="btn btn-outline-primary btn-sm">Ouvrir le référentiel</a>
            </div>
        </div>
    </div>
    <div class="col-md-6 col-lg-4">
        <div class="card h-100">
            <div class="card-body">
                <h6 class="card-title"><i class="bi bi-boxes me-2"></i>Stock / Inventaire</h6>
                <p class="card-text small text-muted">Niveaux de stock par article, alertes.</p>
                <a href="{{ route('stock.dashboard') }}" class="btn btn-outline-secondary btn-sm">Ouvrir le stock</a>
            </div>
        </div>
    </div>
    @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
    <div class="col-md-6 col-lg-4">
        <div class="card h-100">
            <div class="card-body">
                <h6 class="card-title"><i class="bi bi-people me-2"></i>Stock par staff</h6>
                <p class="card-text small text-muted">Par membre du staff : reçus, utilisés/distribués, restants (synchronisés avec « Stocker » et utilisations).</p>
                <a href="{{ route('personal-stock.stock-by-staff') }}" class="btn btn-outline-secondary btn-sm">Ouvrir</a>
            </div>
        </div>
    </div>
    <div class="col-md-6 col-lg-4">
        <div class="card h-100 border-success">
            <div class="card-body">
                <h6 class="card-title text-success"><i class="bi bi-box-arrow-in-down me-2"></i>Enregistrer une réception</h6>
                <p class="card-text small text-muted">Stocker une nouvelle acquisition : catégorie, article (créé si besoin) et quantité reçue.</p>
                <a href="{{ route('personal-stock.record-receipt-form') }}" class="btn btn-success btn-sm">Stocker une réception</a>
            </div>
        </div>
    </div>
    @endif
</div>
@endif
@endsection
