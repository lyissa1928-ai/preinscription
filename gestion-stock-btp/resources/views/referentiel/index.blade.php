@extends('layouts.app')

@section('title', 'Référentiel des matériels - ESEBAT')
@section('page-title', 'Référentiel des matériels')

@section('content')
@if (session('success'))
    <div class="alert alert-success">{{ session('success') }}</div>
@endif
@if (session('error'))
    <div class="alert alert-danger">{{ session('error') }}</div>
@endif

<p class="text-muted small mb-3">Catalogue des matériels, catégories et gestion des articles (prix) en un seul endroit.</p>

<ul class="nav nav-tabs mb-4" role="tablist">
    <li class="nav-item" role="presentation">
        <a class="nav-link {{ $tab === 'catalogue' ? 'active' : '' }}" href="{{ route('referentiel.index', array_merge(request()->query(), ['tab' => 'catalogue'])) }}" role="tab">Catalogue des matériels</a>
    </li>
    @if ($canManage)
    <li class="nav-item" role="presentation">
        <a class="nav-link {{ $tab === 'categories' ? 'active' : '' }}" href="{{ route('referentiel.index', array_merge(request()->query(), ['tab' => 'categories'])) }}" role="tab">Catégories</a>
    </li>
    <li class="nav-item" role="presentation">
        <a class="nav-link {{ $tab === 'gestion' ? 'active' : '' }}" href="{{ route('referentiel.index', array_merge(request()->query(), ['tab' => 'gestion'])) }}" role="tab">Gestion des matériels</a>
    </li>
    @endif
</ul>

{{-- Onglet Catalogue des matériels --}}
@if ($tab === 'catalogue')
<div class="tab-content">
    <div class="tab-pane active">
        <form method="GET" class="card mb-4">
            <input type="hidden" name="tab" value="catalogue">
            <div class="card-body row g-3">
                <div class="col-md-4">
                    <label for="search" class="form-label">Recherche</label>
                    <input type="text" name="search" id="search" class="form-control form-control-sm" value="{{ request('search') }}" placeholder="Nom, code ou description">
                </div>
                <div class="col-md-3">
                    <label for="category" class="form-label">Catégorie</label>
                    <select name="category" id="category" class="form-select form-select-sm">
                        <option value="">Toutes</option>
                        @foreach ($categoriesDropdown as $c)
                            <option value="{{ $c->id }}" {{ request('category') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <button type="submit" class="btn btn-sm btn-outline-primary me-2">Filtrer</button>
                    <a href="{{ route('referentiel.index', ['tab' => 'catalogue']) }}" class="btn btn-sm btn-outline-secondary">Réinitialiser</a>
                </div>
            </div>
        </form>
        <div class="card">
            <div class="card-body">
                <p class="text-muted small mb-3">Catalogue : image (à uploader en gestion), catégorie et nom du matériel. Pas de quantité ni de prix ici.</p>
                @if ($itemsCatalogue->isEmpty())
                    <p class="text-center text-muted mb-0">Aucun matériel dans le catalogue.</p>
                @else
                    <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 80px;">Image</th>
                                    <th>Nom du matériel</th>
                                    <th class="text-center">Catégorie</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($itemsCatalogue as $item)
                                <tr>
                                    <td class="align-middle">
                                        @if (!empty($item->image_path))
                                            <img src="{{ str_starts_with($item->image_path, 'http') ? $item->image_path : asset('storage/' . ltrim($item->image_path, '/')) }}" alt="" class="rounded" style="max-width: 60px; max-height: 60px; object-fit: cover;" onerror="this.style.display='none'">
                                        @else
                                            <span class="text-muted small">—</span>
                                        @endif
                                    </td>
                                    <td>
                                        <strong>{{ $item->description ?: $item->name }}</strong><br>
                                        <small class="text-muted">{{ $item->code }}</small>
                                    </td>
                                    <td class="text-center">{{ $item->category?->name ?? '—' }}</td>
                                    <td>
                                        @if ($item->is_active)
                                            <span class="badge bg-success">Actif</span>
                                        @else
                                            <span class="badge bg-secondary">Inactif</span>
                                        @endif
                                    </td>
                                </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                    @if ($itemsCatalogue->hasPages())
                        <div class="d-flex justify-content-center mt-3">
                            {{ $itemsCatalogue->withQueryString()->links('pagination::bootstrap-5') }}
                        </div>
                    @endif
                @endif
            </div>
        </div>
    </div>
</div>
@endif

{{-- Onglet Catégories --}}
@if ($tab === 'categories' && $canManage)
<div class="tab-content">
    <div class="tab-pane active">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
            <h6 class="mb-0"><i class="bi bi-folder me-2"></i> Catégories (consommables & actifs)</h6>
            @if ($canEditReferentiel)
            <a href="{{ route('categories.create', ['return_to' => 'referentiel']) }}" class="btn btn-primary btn-sm">
                <i class="bi bi-plus-circle"></i> Nouvelle catégorie
            </a>
            @endif
        </div>
        <form method="GET" class="card mb-4">
            <input type="hidden" name="tab" value="categories">
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
                    <label for="actif_cat" class="form-label">Statut</label>
                    <select name="actif" id="actif_cat" class="form-select form-select-sm">
                        <option value="">Tous</option>
                        <option value="1" {{ request('actif') === '1' ? 'selected' : '' }}>Actifs</option>
                        <option value="0" {{ request('actif') === '0' ? 'selected' : '' }}>Inactifs</option>
                    </select>
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <button type="submit" class="btn btn-sm btn-outline-primary me-2">Filtrer</button>
                    <a href="{{ route('referentiel.index', ['tab' => 'categories']) }}" class="btn btn-sm btn-outline-secondary">Réinitialiser</a>
                </div>
            </div>
        </form>
        <div class="card">
            <div class="card-body p-0">
                @if ($categoriesPaginated->isEmpty())
                    <div class="p-4 text-center text-muted">
                        Aucune catégorie.@if ($canEditReferentiel) <a href="{{ route('categories.create') }}">Créer une catégorie</a>.@endif
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
                                    @if ($canEditReferentiel)
                                    <th class="text-end">Actions</th>
                                    @endif
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($categoriesPaginated as $category)
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
                                    @if ($canEditReferentiel)
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
                    @if ($categoriesPaginated->hasPages())
                        <div class="p-3 border-top">
                            {{ $categoriesPaginated->withQueryString()->links('pagination::bootstrap-5') }}
                        </div>
                    @endif
                @endif
            </div>
        </div>
    </div>
</div>
@endif

{{-- Onglet Gestion des matériels --}}
@if ($tab === 'gestion' && $canManage)
<div class="tab-content">
    <div class="tab-pane active">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
            <h6 class="mb-0"><i class="bi bi-table me-2"></i> Gestion des articles et des prix</h6>
            @if ($canEditReferentiel)
            <div class="d-flex gap-2">
                <a href="{{ route('designations.proposed') }}" class="btn btn-outline-warning btn-sm">
                    <i class="bi bi-inbox"></i> Matériels non répertoriés
                </a>
                <a href="{{ route('designations.create', ['return_to' => 'referentiel']) }}" class="btn btn-primary btn-sm">
                    <i class="bi bi-plus-circle"></i> Nouvel article
                </a>
            </div>
            @endif
        </div>
        <div class="alert alert-light border mb-3 small">
            <strong>Point focal :</strong> enregistrer les articles, attribuer ou modifier les prix, supprimer par lot. <strong>Directeur :</strong> consultation des prix par catégorie (lecture seule).
        </div>
        <form method="GET" class="card mb-4">
            <input type="hidden" name="tab" value="gestion">
            <div class="card-body row g-3">
                <div class="col-md-4">
                    <label for="q" class="form-label">Recherche</label>
                    <input type="text" name="q" id="q" class="form-control form-control-sm" value="{{ request('q') }}" placeholder="Nom, code ou description">
                </div>
                <div class="col-md-3">
                    <label for="category_id" class="form-label">Catégorie</label>
                    <select name="category_id" id="category_id" class="form-select form-select-sm">
                        <option value="">Toutes</option>
                        @foreach ($categoriesDropdown as $c)
                            <option value="{{ $c->id }}" {{ request('category_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-2">
                    <label for="actif_gest" class="form-label">Statut</label>
                    <select name="actif" id="actif_gest" class="form-select form-select-sm">
                        <option value="">Tous</option>
                        <option value="1" {{ request('actif') === '1' ? 'selected' : '' }}>Actifs</option>
                        <option value="0" {{ request('actif') === '0' ? 'selected' : '' }}>Inactifs</option>
                    </select>
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <button type="submit" class="btn btn-sm btn-outline-primary me-2">Filtrer</button>
                    <a href="{{ route('referentiel.index', ['tab' => 'gestion']) }}" class="btn btn-sm btn-outline-secondary">Réinitialiser</a>
                </div>
            </div>
        </form>
        <div class="card">
            <div class="card-body p-0">
                @if ($itemsGestion->isEmpty())
                    <div class="p-4 text-center text-muted">
                        Aucun article.@if ($canEditReferentiel) <a href="{{ route('designations.create') }}">Ajouter un article</a>.@endif
                    </div>
                @else
                    @if ($canEditReferentiel)
                    <form id="form-batch-designations" action="{{ route('designations.batch-destroy') }}" method="POST">
                        @csrf
                        <input type="hidden" name="return_to" value="referentiel">
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
                                    @if ($canEditReferentiel)
                                    <th style="width: 40px;"><input type="checkbox" id="check-all-designations" class="form-check-input" title="Tout sélectionner"></th>
                                    @endif
                                    <th>Code</th>
                                    <th>Nom / Désignation</th>
                                    <th>Catégorie</th>
                                    <th class="text-end">Quantité reçue (stock)</th>
                                    <th class="text-end">Prix unitaire (FCFA)</th>
                                    <th>Statut</th>
                                    @if ($canEditReferentiel)
                                    <th class="text-end">Actions</th>
                                    @endif
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($itemsGestion as $item)
                                <tr>
                                    @if ($canEditReferentiel)
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
                                    <td class="text-end">{{ number_format($item->stock_quantity ?? 0, 0, ',', ' ') }}</td>
                                    <td class="text-end">{{ number_format($item->unit_cost ?? 0, 0, ',', ' ') }}</td>
                                    <td>
                                        @if ($item->is_active)
                                            <span class="badge bg-success">Actif</span>
                                        @else
                                            <span class="badge bg-secondary">Inactif</span>
                                        @endif
                                    </td>
                                    @if ($canEditReferentiel)
                                    <td class="text-end">
                                        <a href="{{ route('designations.edit', [$item, 'return_to' => 'referentiel']) }}" class="btn btn-sm btn-outline-primary">Modifier</a>
                                        <form action="{{ route('designations.destroy', $item) }}" method="POST" class="d-inline" onsubmit="return confirm('Supprimer cet article ?');">
                                            @csrf
                                            @method('DELETE')
                                            <input type="hidden" name="return_to" value="referentiel">
                                            <button type="submit" class="btn btn-sm btn-outline-danger">Supprimer</button>
                                        </form>
                                    </td>
                                    @endif
                                </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                    @if ($canEditReferentiel)
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
                    @if ($itemsGestion->hasPages())
                        <div class="p-3 border-top">
                            {{ $itemsGestion->withQueryString()->links('pagination::bootstrap-5') }}
                        </div>
                    @endif
                @endif
            </div>
        </div>
    </div>
</div>
@endif
@endsection
