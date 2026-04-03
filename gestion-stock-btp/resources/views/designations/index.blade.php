@extends('layouts.app')

@section('title', 'Tableau de gestion des articles - ESEBAT')
@section('page-title', 'Tableau de gestion des articles')
@section('page-subtitle', 'Catalogue et prix')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Gestion des articles et des prix</h1>
        <p class="page-hero-subtitle mb-0">Catalogue des désignations et référentiel des prix</p>
    </div>
    @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
    <div class="d-flex gap-2">
        <a href="{{ route('designations.proposed') }}" class="btn btn-outline-warning btn-sm">
            <i class="bi bi-inbox me-1"></i> Matériels non répertoriés
        </a>
        <a href="{{ route('designations.create') }}" class="btn btn-primary btn-sm">
            <i class="bi bi-plus-circle me-1"></i> Nouvel article
        </a>
    </div>
    @endif
</div>

@if (session('success'))
    <div class="alert alert-success">{{ session('success') }}</div>
@endif
@if (session('error'))
    <div class="alert alert-danger">{{ session('error') }}</div>
@endif
<div class="alert alert-light border mb-3">
    <strong>Point focal :</strong> ce tableau permet d’enregistrer les articles dans le catalogue, d’attribuer ou modifier les prix, de mettre à jour les informations et de supprimer un ou plusieurs articles (suppression par lot).<br>
    <strong>Directeur :</strong> consultation de la vue d’ensemble des prix par catégorie pour le contrôle et la supervision des coûts.
</div>
<p class="text-muted small mb-3">Le catalogue sert de référentiel simple des désignations : les demandeurs voient les noms des articles classés par catégorie lors de la saisie d’une commande, sans voir les prix.</p>

<!-- Filtres -->
<form method="GET" class="card mb-4">
    <div class="card-header"><i class="bi bi-funnel"></i> Filtres</div>
    <div class="card-body row g-3">
        <div class="col-md-4">
            <label for="q" class="form-label">Recherche</label>
            <input type="text" name="q" id="q" class="form-control form-control-sm" value="{{ request('q') }}" placeholder="Nom, code ou description">
        </div>
        <div class="col-md-3">
            <label for="category_id" class="form-label">Catégorie</label>
            <select name="category_id" id="category_id" class="form-select form-select-sm">
                <option value="">Toutes</option>
                @foreach ($categories as $c)
                    <option value="{{ $c->id }}" {{ request('category_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                @endforeach
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
            <a href="{{ route('designations.index') }}" class="btn btn-sm btn-outline-secondary">Réinitialiser</a>
        </div>
    </div>
</form>

<!-- Liste -->
<div class="card">
    <div class="card-header"><i class="bi bi-table"></i> Liste des articles</div>
    <div class="card-body p-0">
        @if ($items->isEmpty())
            <div class="p-4 text-center text-muted">
                Aucun article.@if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin')) <a href="{{ route('designations.create') }}">Ajouter un article</a>.@endif
            </div>
        @else
            @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
            <form id="form-batch-designations" action="{{ route('designations.batch-destroy') }}" method="POST">
                @csrf
                <div class="card-body border-bottom d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="select-all-designations">Tout sélectionner</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="select-none-designations">Tout désélectionner</button>
                    <button type="submit" class="btn btn-sm btn-danger" id="btn-batch-delete" form="form-batch-designations" onclick="return confirm('Supprimer les articles sélectionnés ?');" disabled>
                        <i class="bi bi-trash"></i> Supprimer la sélection
                    </button>
                </div>
            </form>
            @endif
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                            <th style="width: 40px;"><input type="checkbox" id="check-all-designations" class="form-check-input" title="Tout sélectionner"></th>
                            @endif
                            <th>Code</th>
                            <th>Nom / Désignation</th>
                            <th>Catégorie</th>
                            <th class="text-end">Prix unitaire (FCFA)</th>
                            <th>Statut</th>
                            @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                            <th class="text-end">Actions</th>
                            @endif
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($items as $item)
                            <tr>
                                @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                                <td><input type="checkbox" name="ids[]" value="{{ $item->id }}" form="form-batch-designations" class="form-check-input designation-check"></td>
                                @endif
                                <td><code>{{ $item->code }}</code></td>
                                <td>
                                    <strong>{{ $item->name }}</strong>
                                    @if ($item->description)
                                        <br><small class="text-muted">{{ Str::limit($item->description, 60) }}</small>
                                    @endif
                                </td>
                                <td>{{ $item->category?->name ?? '—' }}</td>
                                <td class="text-end">{{ number_format($item->unit_cost ?? 0, 0, ',', ' ') }}</td>
                                <td>
                                    @if ($item->is_active)
                                        <span class="badge bg-success">Actif</span>
                                    @else
                                        <span class="badge bg-secondary">Inactif</span>
                                    @endif
                                </td>
                                @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                                <td class="text-end">
                                    <a href="{{ route('designations.edit', $item) }}" class="btn btn-sm btn-outline-primary">Modifier</a>
                                    <form action="{{ route('designations.destroy', $item) }}" method="POST" class="d-inline" onsubmit="return confirm('Supprimer cet article ?');">
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
            @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
            <script>
            document.addEventListener('DOMContentLoaded', function() {
                var checkAll = document.getElementById('check-all-designations');
                var checks = document.querySelectorAll('.designation-check');
                var btnBatch = document.getElementById('btn-batch-delete');
                function updateBatchButton() {
                    btnBatch.disabled = !document.querySelectorAll('.designation-check:checked').length;
                }
                if (checkAll) {
                    checkAll.addEventListener('change', function() {
                        checks.forEach(function(c) { c.checked = checkAll.checked; });
                        updateBatchButton();
                    });
                }
                checks.forEach(function(c) {
                    c.addEventListener('change', updateBatchButton);
                });
                document.getElementById('select-all-designations')?.addEventListener('click', function() {
                    checks.forEach(function(c) { c.checked = true; });
                    if (checkAll) checkAll.checked = true;
                    updateBatchButton();
                });
                document.getElementById('select-none-designations')?.addEventListener('click', function() {
                    checks.forEach(function(c) { c.checked = false; });
                    if (checkAll) checkAll.checked = false;
                    updateBatchButton();
                });
            });
            </script>
            @endif
            @if ($items->hasPages())
                <div class="p-3 border-top">
                    {{ $items->links('pagination::bootstrap-5') }}
                </div>
            @endif
        @endif
    </div>
</div>
@endsection
