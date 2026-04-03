@extends('layouts.app')

@section('title', 'Tableau de bord budgétaire - ESEBAT')
@section('page-title', 'Tableau de bord budgétaire')

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <h5 class="mb-0"><i class="bi bi-graph-up-arrow me-2"></i> Vue stratégique des budgets par campus</h5>
    <div class="d-flex gap-2 align-items-center">
        <form method="get" class="d-flex align-items-center gap-2">
            <label class="form-label mb-0 small">Année</label>
            <select name="year" class="form-select form-select-sm" style="width: auto;" onchange="this.form.submit()">
                @for ($y = now()->year + 1; $y >= now()->year - 2; $y--)
                    <option value="{{ $y }}" {{ $year == $y ? 'selected' : '' }}>{{ $y }}</option>
                @endfor
            </select>
        </form>
        <a href="{{ route('budgets.create') }}" class="btn btn-primary btn-sm"><i class="bi bi-plus-circle"></i> Nouveau budget</a>
        <a href="{{ route('budgets.index') }}" class="btn btn-outline-secondary btn-sm">Liste des budgets</a>
    </div>
</div>

<!-- Synthèse par campus -->
<div class="card mb-4">
    <div class="card-header">
        <h6 class="mb-0">Budget initial, dépenses et solde par campus (année {{ $year }})</h6>
    </div>
    <div class="card-body p-0">
        @if ($budgets->isEmpty())
            <p class="text-muted p-4 mb-0">Aucun budget pour cette année. Créez un budget par campus depuis « Nouveau budget ».</p>
        @else
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Campus</th>
                            <th>Statut</th>
                            <th class="text-end">Budget initial</th>
                            <th class="text-end">Dépenses</th>
                            <th class="text-end">Solde disponible</th>
                            <th class="text-end">Taux d'utilisation</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($budgets as $budget)
                            @php
                                $remaining = $budget->getRemainingAmount();
                                $pct = $budget->total_budget > 0 ? round(($budget->spent_amount / $budget->total_budget) * 100, 1) : 0;
                            @endphp
                            <tr>
                                <td>{{ $budget->campus->name ?? '—' }}</td>
                                <td>
                                    @if ($budget->status === 'draft')
                                        <span class="badge bg-secondary">Brouillon</span>
                                    @elseif ($budget->status === 'approved')
                                        <span class="badge bg-warning text-dark">Approuvé</span>
                                    @elseif ($budget->status === 'active')
                                        <span class="badge bg-success">Actif</span>
                                    @else
                                        <span class="badge bg-secondary">{{ $budget->status }}</span>
                                    @endif
                                </td>
                                <td class="text-end">{{ number_format($budget->total_budget, 0, ',', ' ') }} FCFA</td>
                                <td class="text-end">{{ number_format($budget->spent_amount, 0, ',', ' ') }} FCFA</td>
                                <td class="text-end"><strong>{{ number_format($remaining, 0, ',', ' ') }} FCFA</strong></td>
                                <td class="text-end">
                                    <span class="{{ $pct >= 80 ? 'text-danger' : '' }}">{{ $pct }} %</span>
                                </td>
                                <td>
                                    <a href="{{ route('budgets.show', $budget) }}" class="btn btn-sm btn-outline-primary">Détail</a>
                                    @if (in_array($budget->status, ['active', 'approved']))
                                        <a href="{{ route('budgets.show', $budget) }}#add-budget" class="btn btn-sm btn-outline-success ms-1" title="Ajouter du budget (déblocage)">+ Budget</a>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    </div>
</div>

<!-- Demandes en attente faute de budget -->
<div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Demandes en attente (budget insuffisant ou à renseigner)</h6>
        @if (count($pendingForBudget) > 0)
            <span class="badge bg-warning">{{ count($pendingForBudget) }}</span>
        @endif
    </div>
    <div class="card-body p-0">
        @if (empty($pendingForBudget))
            <p class="text-muted p-4 mb-0">Aucune demande soumise en attente faute de budget.</p>
        @else
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Demande</th>
                            <th>Campus</th>
                            <th class="text-end">Coût total</th>
                            <th class="text-end">Solde campus</th>
                            <th>Constat</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($pendingForBudget as $row)
                            <tr>
                                <td>
                                    <a href="{{ route('material-requests.show', $row['request']) }}">{{ $row['request']->request_number ?? '#' . $row['request']->id }}</a>
                                </td>
                                <td>{{ $row['request']->campus->name ?? '—' }}</td>
                                <td class="text-end">{{ number_format($row['total_cost'], 0, ',', ' ') }} FCFA</td>
                                <td class="text-end">{{ number_format($row['budget_remaining'], 0, ',', ' ') }} FCFA</td>
                                <td>
                                    @if ($row['insufficient'])
                                        <span class="badge bg-danger">Budget insuffisant</span>
                                    @else
                                        <span class="badge bg-secondary">Prix à renseigner par le point focal</span>
                                    @endif
                                </td>
                                <td>
                                    <a href="{{ route('material-requests.show', $row['request']) }}" class="btn btn-sm btn-outline-primary">Voir</a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    </div>
</div>

<!-- Lien dépenses détaillées -->
<div class="card">
    <div class="card-body">
        <h6 class="mb-2">Rapports et historique</h6>
        <p class="small text-muted mb-0">Consultez le détail des budgets et des dépenses par budget depuis la <a href="{{ route('budgets.index') }}">liste des budgets</a>. Les dépenses liées aux demandes validées par le point focal sont enregistrées automatiquement sur le budget du campus.</p>
    </div>
</div>
@endsection
