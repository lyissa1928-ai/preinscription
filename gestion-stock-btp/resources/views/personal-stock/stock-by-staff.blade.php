@extends('layouts.app')

@section('title', 'Niveau de stock par staff - ESEBAT')
@section('page-title', 'Niveau de stock par staff')

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <h5 class="mb-0"><i class="bi bi-people me-2"></i> Stock de chaque membre du staff</h5>
    <form method="get" action="{{ route('personal-stock.stock-by-staff') }}" class="d-flex gap-2 align-items-center">
        <label class="form-label mb-0 small text-muted">Campus</label>
        <select name="campus_id" class="form-select form-select-sm" style="width: auto;" onchange="this.form.submit()">
            <option value="">Tous les campus</option>
            @foreach ($campuses as $c)
                <option value="{{ $c->id }}" {{ (string)($selectedCampusId ?? '') === (string)$c->id ? 'selected' : '' }}>{{ $c->name }}</option>
            @endforeach
        </select>
    </form>
</div>

<p class="text-muted small mb-4">Consultez le niveau de stock de chaque membre du staff sans accéder à leur tableau de bord. Filtrez par campus si besoin.</p>

@if (empty($staffStock))
    <div class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i> Aucun utilisateur (staff) avec campus trouvé.
    </div>
@else
    <div class="accordion accordion-flush" id="accordionStaffStock">
        @foreach ($staffStock as $index => $item)
            @php $u = $item['user']; $summary = $item['summary']; $totalRemaining = $item['total_remaining']; @endphp
            <div class="accordion-item border rounded-3 mb-2 overflow-hidden">
                <h2 class="accordion-header">
                    <button class="accordion-button {{ $index === 0 ? '' : 'collapsed' }} py-3" type="button" data-bs-toggle="collapse" data-bs-target="#staff-{{ $u->id }}" aria-expanded="{{ $index === 0 ? 'true' : 'false' }}" aria-controls="staff-{{ $u->id }}">
                        <span class="d-flex align-items-center gap-3 w-100">
                            <span class="fw-semibold">{{ $u->name }}</span>
                            <span class="badge bg-secondary">{{ $u->campus->name ?? '—' }}</span>
                            <span class="ms-auto small text-muted">{{ $summary->count() }} article(s) · Restant total : <strong>{{ number_format($totalRemaining, 0, ',', ' ') }}</strong></span>
                        </span>
                    </button>
                </h2>
                <div id="staff-{{ $u->id }}" class="accordion-collapse collapse {{ $index === 0 ? 'show' : '' }}" data-bs-parent="#accordionStaffStock">
                    <div class="accordion-body pt-0">
                        @if ($summary->isEmpty())
                            <p class="text-muted small mb-0">Aucun stock enregistré pour ce membre.</p>
                        @else
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>Désignation</th>
                                            <th>Catégorie</th>
                                            <th class="text-end">Reçu</th>
                                            <th class="text-end">Distribué</th>
                                            <th class="text-end">Restant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($summary as $row)
                                            <tr>
                                                <td>{{ $row->designation }}</td>
                                                <td>{{ $row->category_name ?? '—' }}</td>
                                                <td class="text-end">{{ number_format($row->quantity_received, 0, ',', ' ') }}</td>
                                                <td class="text-end">{{ number_format($row->quantity_distributed, 0, ',', ' ') }}</td>
                                                <td class="text-end"><strong>{{ number_format($row->quantity_remaining, 0, ',', ' ') }}</strong></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        @endforeach
    </div>
@endif
@endsection
