@extends('layouts.app')

@section('title', 'Tableau de suivi logistique — Dashboard DG')
@section('page-title', 'Tableau de suivi logistique (Dashboard DG)')
@section('page-subtitle', 'Inventaires et indicateurs')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Tableau de suivi logistique</h1>
        <p class="page-hero-subtitle mb-0">Inventaires liés et indicateurs — Vue direction</p>
    </div>
    <a href="{{ route('tableau-suivi-logistique.export') }}" class="btn btn-success">
        <i class="bi bi-file-earmark-spreadsheet me-1"></i> Exporter (CSV / Excel)
    </a>
</div>

<!-- Synthèse en cartes -->
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card border-primary">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Demandes totales</small>
                        <h4 class="mb-0">{{ \App\Models\MaterialRequest::count() }}</h4>
                    </div>
                    <i class="bi bi-file-text text-primary" style="font-size: 2rem;"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card border-info">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Commandes</small>
                        <h4 class="mb-0">{{ \App\Models\AggregatedOrder::count() }}</h4>
                    </div>
                    <i class="bi bi-truck text-info" style="font-size: 2rem;"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card border-success">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Articles en stock</small>
                        <h4 class="mb-0">{{ $inventaireResume['total_items'] ?? 0 }}</h4>
                    </div>
                    <i class="bi bi-boxes text-success" style="font-size: 2rem;"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card {{ ($inventaireResume['low_stock_count'] ?? 0) > 0 ? 'border-warning' : 'border-secondary' }}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Alerte stock faible</small>
                        <h4 class="mb-0">{{ $inventaireResume['low_stock_count'] ?? 0 }}</h4>
                    </div>
                    <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <!-- Demandes par campus -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-building"></i> Demandes par campus</span>
                <a href="{{ route('material-requests.index') }}" class="btn btn-sm btn-outline-primary">Voir tout</a>
            </div>
            <div class="card-body">
                @php
                    $mainStatuses = ['draft' => 'Brouillon', 'submitted' => 'Soumise', 'in_treatment' => 'En cours', 'approved' => 'Validée', 'cancelled' => 'Rejetée', 'delivered' => 'Livrée'];
                @endphp
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Campus</th>
                                @foreach ($mainStatuses as $code => $label)
                                    <th class="text-center">{{ $label }}</th>
                                @endforeach
                                <th class="text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($campuses as $campus)
                                @php
                                    $byStatus = $demandesParCampus->get($campus->id)?->keyBy('status') ?? collect();
                                    $totalCampus = $byStatus->sum('total');
                                @endphp
                                <tr>
                                    <td><strong>{{ $campus->name }}</strong></td>
                                    @foreach ($mainStatuses as $code => $label)
                                        <td class="text-center">{{ $byStatus->get($code)?->total ?? 0 }}</td>
                                    @endforeach
                                    <td class="text-center fw-bold">{{ $totalCampus }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Demandes par statut (global) -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header"><i class="bi bi-pie-chart"></i> Demandes par statut (global)</div>
            <div class="card-body">
                <div class="row g-2">
                    @foreach ($demandesParStatut as $status => $total)
                        <div class="col-6 col-md-4">
                            <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light">
                                <span>{{ $statusLabels[$status] ?? $status }}</span>
                                <span class="badge bg-primary">{{ $total }}</span>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Inventaires liés : lignes de demandes en attente -->
<div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="bi bi-link-45deg"></i> Inventaires liés — Lignes de demandes en attente</span>
        <a href="{{ route('material-requests.index') }}" class="btn btn-sm btn-outline-primary">Demandes</a>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>N° demande</th>
                        <th>Campus</th>
                        <th>Matériel</th>
                        <th class="text-center">Quantité</th>
                        <th>Demandeur</th>
                        <th>Statut</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($lignesDemandesEnAttente as $line)
                        <tr>
                            <td><strong>{{ $line->materialRequest?->request_number ?? '—' }}</strong></td>
                            <td>{{ $line->materialRequest?->campus?->name ?? '—' }}</td>
                            <td>{{ $line->designation ?: ($line->item?->description ?? $line->item?->name ?? '—') }}</td>
                            <td class="text-center">{{ $line->requested_quantity }}</td>
                            <td>{{ $line->materialRequest?->requester?->name ?? '—' }}</td>
                            <td><span class="badge bg-secondary">{{ $line->status }}</span></td>
                            <td>
                                @if ($line->materialRequest)
                                    <a href="{{ route('material-requests.show', $line->materialRequest) }}" class="btn btn-sm btn-outline-primary">Voir</a>
                                @else
                                    <span class="text-muted">—</span>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" class="text-center text-muted py-3">Aucune ligne en attente</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="row">
    <!-- Demandes récentes -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-clock-history"></i> Demandes récentes</span>
                <a href="{{ route('material-requests.index') }}" class="btn btn-sm btn-outline-primary">Tout</a>
            </div>
            <div class="card-body p-0">
                <ul class="list-group list-group-flush">
                    @forelse ($demandesRecentes as $d)
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>{{ $d->request_number }}</strong>
                                <small class="d-block text-muted">{{ $d->campus?->name ?? '—' }} — {{ $d->requester?->name ?? '—' }}</small>
                            </div>
                            <div>
                                <span class="badge bg-secondary">{{ $statusLabels[$d->status] ?? $d->status }}</span>
                                <a href="{{ route('material-requests.show', $d) }}" class="btn btn-sm btn-link p-0 ms-1">Voir</a>
                            </div>
                        </li>
                    @empty
                        <li class="list-group-item text-muted text-center">Aucune demande</li>
                    @endforelse
                </ul>
            </div>
        </div>
    </div>

    <!-- Commandes récentes -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-truck"></i> Commandes récentes</span>
                <a href="{{ route('aggregated-orders.index') }}" class="btn btn-sm btn-outline-primary">Tout</a>
            </div>
            <div class="card-body p-0">
                <ul class="list-group list-group-flush">
                    @forelse ($commandesRecentes as $o)
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>{{ $o->po_number }}</strong>
                                <small class="d-block text-muted">{{ $o->supplier->name ?? '—' }}</small>
                            </div>
                            <span class="badge bg-info">{{ $orderStatusLabels[$o->status] ?? $o->status }}</span>
                        </li>
                    @empty
                        <li class="list-group-item text-muted text-center">Aucune commande</li>
                    @endforelse
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Stock faible (inventaire) -->
<div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="bi bi-exclamation-triangle text-warning"></i> Inventaire — Stock faible</span>
        <a href="{{ route('stock.index') }}" class="btn btn-sm btn-outline-primary">Stock</a>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-sm table-hover mb-0">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Désignation</th>
                        <th>Catégorie</th>
                        <th class="text-center">Stock</th>
                        <th class="text-center">Seuil</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($itemsLowStock as $i)
                        <tr>
                            <td>{{ $i->code ?? '—' }}</td>
                            <td>{{ $i->description ?? $i->name ?? '—' }}</td>
                            <td>{{ $i->category->name ?? '—' }}</td>
                            <td class="text-center {{ $i->stock_quantity <= 0 ? 'text-danger fw-bold' : '' }}">{{ $i->stock_quantity }}</td>
                            <td class="text-center">{{ $i->reorder_threshold ?? '—' }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="text-center text-muted py-3">Aucun article en stock faible</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
