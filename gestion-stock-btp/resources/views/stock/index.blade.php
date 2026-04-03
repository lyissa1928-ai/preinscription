@extends('layouts.app')

@section('title', 'Catalogue matériel')
@section('page-title', 'Catalogue matériel')

@section('content')
<!-- Filters -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <form method="GET" class="d-flex gap-2 align-items-center flex-wrap">
                    <label for="category_filter" class="form-label mb-0">Catégorie :</label>
                    <select class="form-select" name="category" id="category_filter" onchange="this.form.submit()" style="max-width: 250px;">
                        <option value="">-- Toutes --</option>
                        @foreach ($categories as $category)
                            <option value="{{ $category->id }}" {{ request('category') == $category->id ? 'selected' : '' }}>
                                {{ $category->name }}
                            </option>
                        @endforeach
                    </select>

                    <label for="status_filter" class="form-label mb-0 ms-2">Statut :</label>
                    <select class="form-select" name="status" id="status_filter" onchange="this.form.submit()" style="max-width: 200px;">
                        <option value="">-- Tous --</option>
                        <option value="in-stock" {{ request('status') === 'in-stock' ? 'selected' : '' }}>En stock</option>
                        <option value="low-stock" {{ request('status') === 'low-stock' ? 'selected' : '' }}>Stock bas</option>
                        <option value="out-of-stock" {{ request('status') === 'out-of-stock' ? 'selected' : '' }}>Rupture</option>
                    </select>

                    @if ($suppliers->isNotEmpty())
                    <label for="supplier_filter" class="form-label mb-0 ms-2">Fournisseur :</label>
                    <select class="form-select" name="supplier" id="supplier_filter" onchange="this.form.submit()" style="max-width: 250px;">
                        <option value="">-- Tous --</option>
                        @foreach ($suppliers as $supplier)
                            <option value="{{ $supplier->id }}" {{ request('supplier') == $supplier->id ? 'selected' : '' }}>
                                {{ $supplier->name }}
                            </option>
                        @endforeach
                    </select>
                    @endif
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Items Table -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <p class="text-muted small mb-3">Ce catalogue est un référentiel simple des articles répertoriés : vous pouvez les visualiser par catégorie et les sélectionner lors de la création d’une commande. Les prix ne sont pas affichés ici.</p>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead style="background-color: #f8f9fa;">
                            <tr>
                                <th>Désignation / Code</th>
                                <th class="text-center">Catégorie</th>
                                <th class="text-center">Stock actuel</th>
                                @if ($canSeePrices ?? true)
                                <th class="text-center">Seuil alerte</th>
                                <th class="text-center">Prix unitaire</th>
                                @endif
                                <th>Statut</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse ($items as $item)
                                @php
                                    $stockStatus = $item->current_stock > $item->reorder_threshold ? 'in-stock' :
                                                  ($item->current_stock > 0 ? 'low-stock' : 'out-of-stock');
                                    $badgeClass = $stockStatus === 'in-stock' ? 'bg-success' :
                                                 ($stockStatus === 'low-stock' ? 'bg-warning text-dark' : 'bg-danger');
                                    $designation = $item->description ?: $item->name;
                                @endphp
                                <tr>
                                    <td>
                                        <div>
                                            <strong style="font-size: 13px;">{{ $designation }}</strong><br>
                                            <small class="text-muted">{{ $item->code }}</small>
                                        </div>
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        <span class="badge bg-light text-dark">{{ optional($item->category)->name ?? '—' }}</span>
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        <strong>{{ $item->current_stock }} {{ $item->unit_of_measure }}</strong>
                                    </td>
                                    @if ($canSeePrices ?? true)
                                    <td class="text-center" style="font-size: 13px;">
                                        {{ $item->reorder_threshold }} {{ $item->unit_of_measure }}
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        {{ number_format($item->unit_price, 2) }} XOF
                                    </td>
                                    @endif
                                    <td>
                                        <span class="badge {{ $badgeClass }}" style="font-size: 11px;">
                                            @if ($stockStatus === 'in-stock') En stock
                                            @elseif ($stockStatus === 'low-stock') Stock bas
                                            @else Rupture
                                            @endif
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <a href="{{ route('stock.show', $item) }}" class="btn btn-sm btn-outline-primary">
                                            <i class="bi bi-eye"></i>
                                        </a>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="{{ ($canSeePrices ?? true) ? 7 : 5 }}" class="text-center text-muted py-4">Aucun matériel dans le catalogue.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                @if (method_exists($items, 'links'))
                    <div class="d-flex justify-content-center mt-4">
                        {{ $items->links('pagination::bootstrap-5') }}
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
