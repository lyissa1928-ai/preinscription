@extends('layouts.app')

@section('title', 'Budget ' . $budget->campus->name . ' FY' . $budget->fiscal_year)
@section('page-title', $budget->campus->name . ' Budget FY' . $budget->fiscal_year)

@section('content')
@if ($readOnly ?? false)
<div class="alert alert-info mb-3">
    <i class="bi bi-eye me-2"></i> <strong>Mode lecture seule.</strong> Les montants (dépensé, restant) sont synchronisés avec les commandes validées : chaque demande de matériel validée par le point focal enregistre automatiquement la dépense sur ce budget.
</div>
@endif

<div class="row mb-3">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5>{{ $budget->campus->name }} - Fiscal Year {{ $budget->fiscal_year }}</h5>
                <small class="text-muted">Created: {{ $budget->created_at->format('M d, Y') }}</small>
            </div>
            <div>
                @if ($budget->status === 'draft')
                    <span class="badge bg-secondary" style="font-size: 14px;">Brouillon</span>
                @elseif ($budget->status === 'approved')
                    <span class="badge bg-warning text-dark" style="font-size: 14px;">Approuvé</span>
                @elseif ($budget->status === 'active')
                    <span class="badge bg-success" style="font-size: 14px;">Actif</span>
                @elseif ($budget->status === 'closed')
                    <span class="badge bg-dark" style="font-size: 14px;">Clôturé</span>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Budget Overview -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Total Budget</small>
                <h4 style="color: #2563eb;">{{ number_format($budget->total_budget, 0) }} FCFA</h4>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Allocated</small>
                <h4 style="color: #059669;">{{ number_format($budget->allocated_amount, 0) }} FCFA</h4>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Dépensé</small>
                <h4 style="color: #f59e0b;">{{ number_format($budget->spent_amount, 0) }} FCFA</h4>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Remaining</small>
                @php
                    $remaining = $budget->total_budget - $budget->spent_amount;
                    $remainingColor = $remaining >= 0 ? '#198754' : '#dc3545';
                @endphp
                <h4 style="color: {{ $remainingColor }};">{{ number_format($remaining, 0) }} FCFA</h4>
            </div>
        </div>
    </div>
</div>

<!-- Utilization Bar -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong>Budget Utilization</strong>
                    @php
                        $total = (float) $budget->total_budget;
                        $utilization = $total > 0 ? (($budget->spent_amount / $total) * 100) : 0;
                    @endphp
                    <span style="font-size: 16px; color: #2563eb;"><strong>{{ number_format($utilization, 1) }}%</strong></span>
                </div>
                <div class="progress" style="height: 25px;">
                    @php
                        $totalBudget = (float) $budget->total_budget;
                        $allocatedPercent = $totalBudget > 0 ? (($budget->allocated_amount / $totalBudget) * 100) : 0;
                        $spentPercent = $totalBudget > 0 ? (($budget->spent_amount / $totalBudget) * 100) : 0;
                    @endphp
                    <div class="progress-bar" style="width: {{ $spentPercent }}%; background-color: #f59e0b;"></div>
                    <div class="progress-bar" style="width: {{ $allocatedPercent - $spentPercent }}%; background-color: #93c5fd;"></div>
                </div>
                <div style="font-size: 12px; margin-top: 8px;">
                    <span style="color: #f59e0b;">■</span> Spent | 
                    <span style="color: #93c5fd;">■</span> Allocated (not spent)
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Gestion par campus uniquement (pas d'allocation par département) -->
<div class="alert alert-light border mb-4">
    <i class="bi bi-info-circle me-2"></i>
    <strong>Budget par campus.</strong> Le suivi des montants (total, dépensé, restant) est fait au niveau du campus. Les dépenses sont enregistrées via les demandes de matériel validées.
</div>

<!-- Ajouter du budget (déblocage même année) -->
@if (in_array($budget->status, ['active', 'approved']) && auth()->user()->hasAnyRole(['director', 'super_admin']))
<div class="card mb-4 border-primary" id="add-budget">
    <div class="card-body">
        <h6 class="card-title text-primary"><i class="bi bi-plus-circle me-2"></i>Ajouter du budget (déblocage)</h6>
        <p class="small text-muted mb-3">En cas de blocage (solde insuffisant), vous pouvez ajouter du budget pour la même année et le même campus sans créer un nouveau budget.</p>
        <form action="{{ route('budgets.add-amount', $budget) }}" method="POST" class="row g-2 align-items-end">
            @csrf
            <div class="col-auto">
                <label for="add_amount" class="form-label mb-0 small">Montant à ajouter (FCFA)</label>
                <input type="number" name="amount" id="add_amount" class="form-control form-control-sm" min="1" max="999999999" step="1" placeholder="Ex. 500000" required>
            </div>
            <div class="col-auto">
                <button type="submit" class="btn btn-primary btn-sm">
                    <i class="bi bi-plus-lg"></i> Ajouter au budget
                </button>
            </div>
        </form>
    </div>
</div>
@endif

<!-- Action Buttons (cachés en lecture seule pour le point focal) -->
@if (!($readOnly ?? false))
<div class="card">
    <div class="card-body">
        <div class="d-flex gap-2 flex-wrap">
            @if ($budget->status === 'draft' && ($canApprove ?? false))
                <form action="{{ route('budgets.approve', $budget) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-warning"
                            onclick="return confirm('Approuver ce budget ?')">
                        <i class="bi bi-check-circle"></i> Approuver le budget
                    </button>
                </form>
            @endif

            @if ($budget->status === 'approved' && ($canActivate ?? false))
                <form action="{{ route('budgets.activate', $budget) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-success"
                            onclick="return confirm('Activer ce budget ?')">
                        <i class="bi bi-play-circle"></i> Activer le budget
                    </button>
                </form>
            @endif

            @if ($canCloseAndRollover ?? false)
                <form action="{{ route('budgets.close-and-rollover', $budget) }}" method="POST" class="d-inline">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-outline-primary"
                            onclick="return confirm('Clôturer l\'exercice {{ $budget->fiscal_year }} et reporter le solde vers l\'exercice {{ $nextFiscalYear }} ? Cette action est irréversible.');">
                        <i class="bi bi-arrow-repeat"></i> Clôturer l'exercice et reporter le solde vers {{ $nextFiscalYear }}
                    </button>
                </form>
            @endif

            @if ($canDelete ?? false)
                <form action="{{ route('budgets.destroy', $budget) }}" method="POST" class="d-inline"
                      onsubmit="return confirm('Supprimer ce budget ? Aucune dépense ne doit être enregistrée.');">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash"></i> Supprimer ce budget
                    </button>
                </form>
            @endif

            <a href="{{ route('budgets.index') }}" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Retour
            </a>
        </div>
    </div>
</div>
@else
<div class="card">
    <div class="card-body">
        <a href="{{ route('budgets.index') }}" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> Retour
        </a>
    </div>
</div>
@endif

@endsection
