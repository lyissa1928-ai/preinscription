@extends('layouts.app')

@section('title', 'Actifs - ESEBAT')
@section('page-title', 'Gestion des actifs')
@section('page-subtitle', 'Inventaire et statuts')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Tous les actifs</h1>
        <p class="page-hero-subtitle mb-0">En service, maintenance et réformés</p>
    </div>
    @if (auth()->user()->can('create', App\Models\Asset::class))
        <a href="{{ route('assets.create') }}" class="btn btn-primary btn-sm">
            <i class="bi bi-plus-circle me-1"></i> Enregistrer un actif
        </a>
    @endif
</div>

<!-- Filters & Tabs -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-funnel"></i> Filtres (campus, statut)</div>
            <div class="card-body">
                <form method="GET" class="d-flex gap-2 align-items-center flex-wrap mb-3">
                    <label for="campus_filter" class="form-label mb-0">Campus :</label>
                    <select class="form-select" name="campus" id="campus_filter" onchange="this.form.submit()" style="max-width: 250px;">
                        <option value="">-- Tous les campus --</option>
                        @foreach ($campuses as $campus)
                            <option value="{{ $campus->id }}" {{ request('campus') == $campus->id ? 'selected' : '' }}>
                                {{ $campus->name }}
                            </option>
                        @endforeach
                    </select>

                    <label for="status_filter" class="form-label mb-0 ms-2">Statut :</label>
                    <select class="form-select" name="status" id="status_filter" onchange="this.form.submit()" style="max-width: 200px;">
                        <option value="">-- Tous --</option>
                        <option value="en_service" {{ request('status') === 'en_service' ? 'selected' : '' }}>En service</option>
                        <option value="maintenance" {{ request('status') === 'maintenance' ? 'selected' : '' }}>En maintenance</option>
                        <option value="reformé" {{ request('status') === 'reformé' ? 'selected' : '' }}>Réformé</option>
                    </select>
                </form>

                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab', 'all') === 'all' ? 'active' : '' }}" 
                           href="{{ route('assets.index', ['tab' => 'all']) }}">
                            Tous <span class="badge bg-secondary">{{ $stats['total'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'active' ? 'active' : '' }}" 
                           href="{{ route('assets.index', ['tab' => 'active']) }}">
                            En service <span class="badge bg-success">{{ $stats['in_service'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'maintenance' ? 'active' : '' }}" 
                           href="{{ route('assets.index', ['tab' => 'maintenance']) }}">
                            En maintenance <span class="badge bg-warning">{{ $stats['in_maintenance'] ?? 0 }}</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {{ request('tab') === 'decommissioned' ? 'active' : '' }}" 
                           href="{{ route('assets.index', ['tab' => 'decommissioned']) }}">
                            Réformés <span class="badge bg-danger">{{ $stats['decommissioned'] ?? 0 }}</span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Assets Table -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header"><i class="bi bi-list-ul"></i> Liste des actifs</div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead style="background-color: #f8f9fa;">
                            <tr>
                                <th>N° série</th>
                                <th>Description</th>
                                <th>Catégorie</th>
                                <th>Emplacement</th>
                                <th>Date d'acquisition</th>
                                <th>Statut</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse ($assets as $asset)
                                @php
                                    $statusBadge = $asset->lifecycle_status === 'en_service' ? 'bg-success' :
                                                  ($asset->lifecycle_status === 'maintenance' ? 'bg-warning text-dark' : 'bg-danger');
                                @endphp
                                <tr>
                                    <td>
                                        <strong style="font-size: 13px;">{{ $asset->serial_number }}</strong>
                                    </td>
                                    <td style="font-size: 13px;">
                                        {{ $asset->description }}<br>
                                        <small class="text-muted">{{ $asset->category->name }}</small>
                                    </td>
                                    <td style="font-size: 13px;">
                                        <span class="badge bg-light text-dark">{{ $asset->category->name }}</span>
                                    </td>
                                    <td style="font-size: 13px;">
                                        {{ $asset->currentCampus->name ?? '—' }}<br>
                                        <small class="text-muted">{{ $asset->currentWarehouse->name ?? '—' }}</small>
                                    </td>
                                    <td style="font-size: 13px;">
                                        {{ $asset->acquisition_date->format('M d, Y') }}
                                    </td>
                                    <td>
                                        <span class="badge {{ $statusBadge }}" style="font-size: 11px;">
                                            {{ ucfirst(str_replace('_', ' ', $asset->lifecycle_status)) }}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <a href="{{ route('assets.show', $asset) }}" class="btn btn-sm btn-outline-primary">
                                            <i class="bi bi-eye"></i>
                                        </a>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="7" class="text-center text-muted py-4">Aucun actif</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                @if (method_exists($assets, 'links'))
                    <div class="d-flex justify-content-center mt-4">
                        {{ $assets->links('pagination::bootstrap-5') }}
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
