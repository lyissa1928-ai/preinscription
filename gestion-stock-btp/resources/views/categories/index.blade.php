@extends('layouts.app')

@section('title', 'Catégories - ESEBAT')
@section('page-title', 'Catégories')
@section('page-subtitle', 'Consommables et actifs')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Catégories</h1>
        <p class="page-hero-subtitle mb-0">Consommables et actifs — classement des articles</p>
    </div>
    @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
    <a href="{{ route('categories.create') }}" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-circle me-1"></i> Nouvelle catégorie
    </a>
    @endif
</div>

@if (session('success'))
    <div class="alert alert-success">{{ session('success') }}</div>
@endif
@if (session('error'))
    <div class="alert alert-danger">{{ session('error') }}</div>
@endif

<form method="GET" class="card mb-4">
    <div class="card-header"><i class="bi bi-funnel"></i> Filtres</div>
    <div class="card-body row g-3">
        <div class="col-md-3">
            <label for="type" class="form-label">Type</label>
            <select name="type" id="type" class="form-select form-select-sm">
                <option value="">Tous</option>
                <option value="consommable" {{ request('type') === 'consommable' ? 'selected' : '' }}>Consommable</option>
                <option value="asset" {{ request('type') === 'asset' ? 'selected' : '' }}>Actif</option>
            </select>
        </div>
        <div class="col-md-2">
            <label for="actif" class="form-label">Statut</label>
            <select name="actif" id="actif" class="form-select form-select-sm">
                <option value="">Tous</option>
                <option value="1" {{ request('actif') === '1' ? 'selected' : '' }}>Actifs</option>
                <option value="0" {{ request('actif') === '0' ? 'selected' : '' }}>Inactifs</option>
            </select>
        </div>
        <div class="col-md-2 d-flex align-items-end">
            <button type="submit" class="btn btn-sm btn-outline-primary me-2">Filtrer</button>
            <a href="{{ route('categories.index') }}" class="btn btn-sm btn-outline-secondary">Réinitialiser</a>
        </div>
    </div>
</form>

<div class="card">
    <div class="card-header"><i class="bi bi-folder"></i> Liste des catégories</div>
    <div class="card-body p-0">
        @if ($categories->isEmpty())
            <div class="p-4 text-center text-muted">
                Aucune catégorie.@if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin')) <a href="{{ route('categories.create') }}">Créer une catégorie</a>.@endif
            </div>
        @else
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Statut</th>
                            @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                            <th class="text-end">Actions</th>
                            @endif
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($categories as $category)
                            <tr>
                                <td><code>{{ $category->code }}</code></td>
                                <td>{{ $category->name }}</td>
                                <td>
                                    @if ($category->type === 'consommable')
                                        <span class="badge bg-info">Consommable</span>
                                    @else
                                        <span class="badge bg-secondary">Actif</span>
                                    @endif
                                </td>
                                <td>
                                    @if ($category->is_active)
                                        <span class="badge bg-success">Actif</span>
                                    @else
                                        <span class="badge bg-secondary">Inactif</span>
                                    @endif
                                </td>
                                @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                                <td class="text-end">
                                    <a href="{{ route('categories.edit', $category) }}" class="btn btn-sm btn-outline-primary">Modifier</a>
                                    <form action="{{ route('categories.destroy', $category) }}" method="POST" class="d-inline" onsubmit="return confirm('Supprimer cette catégorie ?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn btn-sm btn-outline-danger">Supprimer</button>
                                    </form>
                                </td>
                                @endif
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if ($categories->hasPages())
                <div class="p-3 border-top">
                    {{ $categories->links('pagination::bootstrap-5') }}
                </div>
            @endif
        @endif
    </div>
</div>
@endsection
