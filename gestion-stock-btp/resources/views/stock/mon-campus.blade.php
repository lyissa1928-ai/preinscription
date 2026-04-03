@extends('layouts.app')

@section('title', 'Stock de mon campus')
@section('page-title', 'Stock de mon campus')
@section('page-subtitle', $pageSubtitle ?? 'Consultation en lecture seule')

@section('content')
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
                    <label for="search" class="form-label mb-0 ms-2">Recherche :</label>
                    <input type="text" class="form-control" name="search" id="search" value="{{ request('search') }}" placeholder="Désignation ou code" style="max-width: 220px;">
                    <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-search"></i></button>
                </form>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <p class="text-muted small mb-3">Vue en lecture seule du stock disponible pour votre campus. Utilisez ce catalogue pour préparer vos demandes de matériel.</p>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead style="background-color: #f8f9fa;">
                            <tr>
                                <th>Désignation / Code</th>
                                <th class="text-center">Catégorie</th>
                                <th class="text-center">Stock actuel</th>
                                <th class="text-center">Seuil alerte</th>
                                <th>Statut</th>
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
                                        <strong>{{ $item->current_stock }} {{ $item->unit_of_measure ?? 'u.' }}</strong>
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        {{ $item->reorder_threshold }} {{ $item->unit_of_measure ?? 'u.' }}
                                    </td>
                                    <td>
                                        <span class="badge {{ $badgeClass }}" style="font-size: 11px;">
                                            @if ($stockStatus === 'in-stock') En stock
                                            @elseif ($stockStatus === 'low-stock') Stock bas
                                            @else Rupture
                                            @endif
                                        </span>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="5" class="text-center text-muted py-4">Aucun matériel dans le catalogue.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

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
