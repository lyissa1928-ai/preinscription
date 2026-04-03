@extends('layouts.app')

@section('title', 'Demande ' . $materialRequest->request_number . ' - ESEBAT')
@section('page-title', 'Demande ' . $materialRequest->request_number)
@section('page-subtitle', 'Créée le ' . $materialRequest->created_at->format('d/m/Y'))

@section('content')
<div class="page-hero d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
    <div>
        <h1 class="page-hero-title">{{ $materialRequest->request_number }}</h1>
        <p class="page-hero-subtitle mb-0">Détails, articles et suivi de la demande</p>
    </div>
    <div>
                @if ($materialRequest->status === 'draft')
                    <span class="badge bg-secondary">Brouillon</span>
                @elseif ($materialRequest->status === 'submitted')
                    <span class="badge bg-warning text-dark">Soumise</span>
                @elseif ($materialRequest->status === 'pending_director')
                    <span class="badge bg-primary">Transmise au directeur</span>
                @elseif ($materialRequest->status === 'director_approved')
                    <span class="badge bg-info">Approuvée par le directeur</span>
                @elseif ($materialRequest->status === 'in_treatment')
                    <span class="badge bg-info">En cours de traitement</span>
                @elseif ($materialRequest->status === 'approved')
                    <span class="badge bg-success">Validée</span>
                @elseif ($materialRequest->status === 'aggregated')
                    <span class="badge bg-info">Regroupée</span>
                @elseif (in_array($materialRequest->status, ['received', 'delivered']))
                    <span class="badge bg-success">{{ $materialRequest->status === 'delivered' ? 'Livrée / clôturée' : 'Réceptionnée' }}</span>
                @elseif ($materialRequest->status === 'cancelled')
                    <span class="badge bg-danger">Rejetée</span>
                @else
                    <span class="badge bg-secondary">{{ ucfirst($materialRequest->status) }}</span>
                @endif
    </div>
</div>

<!-- Request Details Card -->
<div class="row mb-4">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header"><i class="bi bi-info-circle"></i> Détails de la demande</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <th style="width: 40%;">Type</th>
                        <td>
                            @if (($materialRequest->request_type ?? 'individual') === 'grouped')
                                <span class="badge bg-info">Demande groupée</span>
                            @else
                                <span class="badge bg-secondary">Demande individuelle</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <th style="width: 40%;">Campus</th>
                        <td>{{ $materialRequest->campus?->name ?? '—' }}</td>
                    </tr>
                    @if ($materialRequest->department)
                    <tr>
                        <th>Service / Département</th>
                        <td>{{ $materialRequest->department->name }}</td>
                    </tr>
                    @endif
                    <tr>
                        <th>Demandeur</th>
                        <td>{{ $materialRequest->requester?->name ?? 'Utilisateur supprimé' }}{!! $materialRequest->requester && $materialRequest->requester->matricule ? ' <small class="text-muted">(' . e($materialRequest->requester->matricule) . ')</small>' : '' !!}</td>
                    </tr>
                    @if ($materialRequest->participants && $materialRequest->participants->isNotEmpty())
                    <tr>
                        <th>Participants (demande groupée)</th>
                        <td>
                            <ul class="mb-0 ps-3">
                                @foreach ($materialRequest->participants as $p)
                                    <li>
                                        {{ $p->display_name }}{!! $p->matricule ? ' <small class="text-muted">(' . e($p->matricule) . ')</small>' : '' !!}
                                        @if (!empty($canManageParticipants))
                                            <form action="{{ route('material-requests.participants.remove', [$materialRequest, $p]) }}" method="POST" class="d-inline ms-2">
                                                @csrf
                                                @method('DELETE')
                                                <button type="submit" class="btn btn-link btn-sm text-danger p-0" onclick="return confirm('Retirer ce participant ?');">Retirer</button>
                                            </form>
                                        @endif
                                    </li>
                                @endforeach
                            </ul>
                        </td>
                    </tr>
                    @endif
                    @if (!empty($canManageParticipants) && $staffForParticipants->isNotEmpty())
                    <tr>
                        <th>Ajouter un participant</th>
                        <td>
                            <form action="{{ route('material-requests.participants.add', $materialRequest) }}" method="POST" class="d-inline-flex align-items-center gap-2">
                                @csrf
                                <select name="user_id" class="form-select form-select-sm" style="width: auto;">
                                    <option value="">— Choisir un staff (même campus) —</option>
                                    @foreach ($staffForParticipants as $s)
                                        @if (!$materialRequest->participants->contains('id', $s->id))
                                            <option value="{{ $s->id }}">{{ $s->display_name }}{!! $s->matricule ? ' (' . e($s->matricule) . ')' : '' !!}</option>
                                        @endif
                                    @endforeach
                                </select>
                                <button type="submit" class="btn btn-sm btn-outline-primary">Ajouter</button>
                            </form>
                        </td>
                    </tr>
                    @endif
                    @if ($materialRequest->subject)
                    <tr>
                        <th>Objet</th>
                        <td>{{ $materialRequest->subject }}</td>
                    </tr>
                    @endif
                    @if ($materialRequest->justification)
                    <tr>
                        <th>Motif / justification</th>
                        <td>{{ $materialRequest->justification }}</td>
                    </tr>
                    @endif
                    <tr>
                        <th>Date souhaitée</th>
                        <td>{{ $materialRequest->needed_by_date ? $materialRequest->needed_by_date->format('d/m/Y') : '—' }}</td>
                    </tr>
                    <tr>
                        <th>Statut</th>
                        <td>
                            @if ($materialRequest->status === 'draft')
                                <span class="badge bg-secondary">Brouillon</span>
                            @elseif ($materialRequest->status === 'submitted')
                                <span class="badge bg-warning text-dark">Soumise</span>
                            @elseif ($materialRequest->status === 'pending_director')
                                <span class="badge bg-primary">Transmise au directeur</span>
                            @elseif ($materialRequest->status === 'director_approved')
                                <span class="badge bg-info">Approuvée par le directeur</span>
                            @elseif ($materialRequest->status === 'in_treatment')
                                <span class="badge bg-info">En cours de traitement</span>
                            @elseif ($materialRequest->status === 'approved')
                                <span class="badge bg-success">Validée</span>
                            @elseif ($materialRequest->status === 'cancelled')
                                <span class="badge bg-danger">Rejetée</span>
                            @elseif ($materialRequest->status === 'delivered')
                                <span class="badge bg-success">Livrée / clôturée</span>
                            @else
                                <span class="badge bg-secondary">{{ ucfirst($materialRequest->status) }}</span>
                            @endif
                        </td>
                    </tr>
                    @if ($materialRequest->rejected_at)
                        <tr>
                            <th>Rejetée par</th>
                            <td>{{ $materialRequest->rejectedBy->name ?? '—' }}</td>
                        </tr>
                        <tr>
                            <th>Date du rejet</th>
                            <td>{{ $materialRequest->rejected_at->format('d/m/Y H:i') }}</td>
                        </tr>
                        <tr>
                            <th>Motif du rejet</th>
                            <td>{{ $materialRequest->rejection_reason ?? '—' }}</td>
                        </tr>
                    @endif
                    @if ($materialRequest->transmitted_at)
                        <tr>
                            <th>Transmise au directeur par</th>
                            <td>{{ $materialRequest->transmittedBy->name ?? '—' }}</td>
                        </tr>
                        <tr>
                            <th>Date de transmission</th>
                            <td>{{ $materialRequest->transmitted_at->format('d/m/Y H:i') }}</td>
                        </tr>
                    @endif
                    @if ($materialRequest->director_approved_at)
                        <tr>
                            <th>Approuvée par le directeur</th>
                            <td>{{ $materialRequest->directorApprovedBy->name ?? '—' }}</td>
                        </tr>
                        <tr>
                            <th>Date d'approbation (directeur)</th>
                            <td>{{ $materialRequest->director_approved_at->format('d/m/Y H:i') }}</td>
                        </tr>
                    @endif
                    @if ($materialRequest->approved_at)
                        <tr>
                            <th>Validée par (point focal)</th>
                            <td>{{ $materialRequest->approvedBy->name ?? '—' }}</td>
                        </tr>
                        <tr>
                            <th>Date de validation</th>
                            <td>{{ $materialRequest->approved_at->format('d/m/Y H:i') }}</td>
                        </tr>
                    @endif
                </table>
                @if ($materialRequest->treatment_notes)
                    <div class="mt-2 pt-2 border-top">
                        <strong>Observation du point focal</strong>
                        <p class="mb-0 small text-muted">{{ $materialRequest->treatment_notes }}</p>
                    </div>
                @endif
            </div>
        </div>
    </div>

    <div class="col-md-6">
        @php $canSeePrices = auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']); @endphp
        @if ($canSeePrices && isset($campusBudgetRemaining) && $campusBudgetRemaining !== null && in_array($materialRequest->status, ['submitted', 'in_treatment', 'director_approved']))
            @php
                $itemsForCost = $materialRequest->status === 'director_approved'
                    ? $materialRequest->requestItems->where('director_approved', true)
                    : $materialRequest->requestItems;
                $requestTotalCost = $itemsForCost->sum(function ($i) use ($materialRequest) {
                    $up = (float)($i->unit_price ?? 0);
                    if ($up <= 0 && $materialRequest->status === 'director_approved' && $i->item_id && $i->item) {
                        $up = (float)$i->item->unit_cost;
                    }
                    return $up * $i->requested_quantity;
                });
            @endphp
            <div class="card mb-3 border-primary">
                <div class="card-body py-2">
                    <strong class="text-primary"><i class="bi bi-wallet2"></i> Budget campus (année {{ now()->year }})</strong>
                    <p class="mb-0 small">Solde disponible : <strong>{{ number_format($campusBudgetRemaining, 0, ',', ' ') }} FCFA</strong></p>
                    <small class="text-muted">Le prix unitaire est récupéré automatiquement depuis le référentiel (modifiable si besoin). Vérifiez la quantité disponible ; en cas de rupture, la ligne concernée ne pourra pas être validée.</small>
                </div>
            </div>
            @if ($requestTotalCost > 0 && $requestTotalCost > $campusBudgetRemaining)
                <div class="alert alert-warning mb-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Attention — budget insuffisant :</strong> le montant total de cette demande (<strong>{{ number_format($requestTotalCost, 0, ',', ' ') }} FCFA</strong>) est supérieur au solde budgétaire du campus (<strong>{{ number_format($campusBudgetRemaining, 0, ',', ' ') }} FCFA</strong>). La demande ne pourra pas être approuvée sans un complément de budget par le directeur (Ajouter du budget sur la fiche du budget du campus). Vous pouvez rejeter la demande ou demander au demandeur de réduire les quantités ou les articles.
                </div>
            @endif
        @endif
        @if (in_array($materialRequest->status, ['delivered', 'received']) && $materialRequest->requester_user_id === auth()->id())
            <div class="alert alert-info py-2 mb-3 small">
                <i class="bi bi-info-circle me-1"></i>
                @if ($materialRequest->status === 'delivered')
                    Enregistrez la réception via <strong>« Enregistrer la réception »</strong> pour constater les quantités effectivement reçues.
                @else
                    Réception enregistrée. Les quantités <strong>reçue / stockée / utilisée</strong> ci-dessous sont issues de votre enregistrement. <a href="{{ route('personal-stock.index') }}">Consulter « Mon stock »</a> pour la synthèse et le détail des mouvements.
                @endif
            </div>
        @endif
        @if ($materialRequest->status === 'received' && $materialRequest->requestItems->sum('quantity_received') == 0 && auth()->user()->can('storeStorage', $materialRequest))
            <div class="alert alert-warning py-2 mb-3 small">
                <i class="bi bi-exclamation-triangle me-1"></i>
                <strong>Incohérence détectée :</strong> la réception est marquée enregistrée mais les quantités reçues sont à zéro. <a href="{{ route('material-requests.store-storage-form', $materialRequest) }}" class="alert-link">Ré-enregistrer la réception</a> pour corriger.
            </div>
        @endif
        @if ($materialRequest->status === 'director_approved' && ($canApprove ?? false) && $materialRequest->requestItems->where('director_approved', false)->count() > 0)
            <div class="alert alert-warning py-2 mb-3 small">
                <i class="bi bi-info-circle me-1"></i>
                {{ $materialRequest->requestItems->where('director_approved', false)->count() }} ligne(s) non approuvée(s) par le directeur — seules les lignes approuvées seront validées et livrées.
            </div>
        @endif
        <div class="card">
            <div class="card-header">Articles ({{ $materialRequest->requestItems->count() }})</div>
            <div class="card-body">
                @if ($materialRequest->requestItems->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Article</th>
                                    <th>Qté demandée</th>
                                    @if (in_array($materialRequest->status, ['delivered', 'received']))
                                        <th class="text-end">Qté reçue</th>
                                        @if ($materialRequest->status === 'received')
                                            <th class="text-end">Qté stockée</th>
                                            <th class="text-end">Qté utilisée</th>
                                        @endif
                                    @endif
                                    @if ($canApprove && $materialRequest->status === 'director_approved')
                                        <th class="text-end">Qté disponible</th>
                                        <th>Prix unitaire (FCFA)</th>
                                        <th>Total ligne</th>
                                    @elseif ($canSeePrices && $materialRequest->requestItems->sum(fn($i) => (float)($i->unit_price ?? 0)) > 0)
                                        <th>Prix unitaire</th>
                                        <th>Total ligne</th>
                                    @endif
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($materialRequest->requestItems as $item)
                                    @php
                                        $unitPrice = (float)($item->unit_price ?? 0);
                                        $refUnitPrice = $item->item_id && $item->item ? (float)$item->item->unit_cost : 0;
                                        $displayUnitPrice = $unitPrice > 0 ? $unitPrice : $refUnitPrice;
                                        $lineTotal = $displayUnitPrice * $item->requested_quantity;
                                        $stockAvailable = $item->item_id && $item->item ? (int)$item->item->stock_quantity : null;
                                        $inRupture = $stockAvailable !== null && $stockAvailable < $item->requested_quantity;
                                    @endphp
                                    <tr class="{{ $inRupture ? 'table-warning' : '' }}">
                                        <td>
                                            <small>{{ $item->display_label }}</small>
                                            @if ($item->is_unlisted_material)
                                                <span class="badge bg-warning text-dark ms-1" style="font-size: 10px;">Non répertorié</span>
                                            @endif
                                        </td>
                                        <td>
                                            <small>{{ $item->requested_quantity }} {{ $item->item?->unit_of_measure ?? 'unité(s)' }}</small>
                                        </td>
                                        @if (in_array($materialRequest->status, ['delivered', 'received']))
                                            <td class="text-end">{{ number_format($item->quantity_received ?? 0, 0, ',', ' ') }}</td>
                                            @if ($materialRequest->status === 'received')
                                                <td class="text-end">{{ number_format($item->quantity_available ?? 0, 0, ',', ' ') }}</td>
                                                <td class="text-end">{{ number_format($item->quantity_used ?? 0, 0, ',', ' ') }}</td>
                                            @endif
                                        @endif
                                        @if ($canApprove && $materialRequest->status === 'director_approved')
                                            <td class="text-end">
                                                @if ($item->director_approved ?? true)
                                                    @if ($stockAvailable !== null)
                                                        <span class="{{ $inRupture ? 'text-danger fw-bold' : '' }}" title="{{ $inRupture ? 'Rupture : stock insuffisant pour valider cette ligne' : '' }}">{{ number_format($stockAvailable, 0, ',', ' ') }}</span>
                                                        @if ($inRupture)
                                                            <br><small class="text-danger">Rupture</small>
                                                        @endif
                                                    @else
                                                        <span class="text-muted">—</span>
                                                    @endif
                                                @else
                                                    <span class="text-muted">—</span>
                                                @endif
                                            </td>
                                            <td>
                                                @if ($item->director_approved ?? true)
                                                    <input type="number" step="0.01" min="0" value="{{ $displayUnitPrice > 0 ? $displayUnitPrice : '' }}" class="form-control form-control-sm unit-price-input" style="width: 100px;" placeholder="0"
                                                           data-request-item-id="{{ $item->id }}" data-qty="{{ $item->requested_quantity }}" title="Prix utilisé à la validation">
                                                @else
                                                    <span class="badge bg-secondary" style="font-size: 10px;">Non approuvé (directeur)</span>
                                                @endif
                                            </td>
                                            <td>
                                                @if ($item->director_approved ?? true)
                                                    <small class="line-total" data-request-item-id="{{ $item->id }}" data-qty="{{ $item->requested_quantity }}">{{ $lineTotal > 0 ? number_format($lineTotal, 0, ',', ' ') : '—' }}</small>
                                                @else
                                                    —
                                                @endif
                                            </td>
                                        @elseif ($canSeePrices && $unitPrice > 0)
                                            <td><small>{{ number_format($unitPrice, 0, ',', ' ') }} FCFA</small></td>
                                            <td><small>{{ number_format($lineTotal, 0, ',', ' ') }} FCFA</small></td>
                                        @endif
                                        <td>
                                            @if ($item->status === 'pending')
                                                <span class="badge bg-secondary" style="font-size: 11px;">En attente</span>
                                            @elseif ($item->status === 'aggregated')
                                                <span class="badge bg-info" style="font-size: 11px;">Regroupé</span>
                                            @elseif ($item->status === 'received')
                                                <span class="badge bg-success" style="font-size: 11px;">Réceptionné</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center py-3">Aucun article ajouté</p>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Action Buttons -->
<div class="card">
    <div class="card-body">
        <div class="d-flex gap-2 flex-wrap">
            @if ($materialRequest->status === 'draft' && $canEdit)
                <a href="{{ route('material-requests.edit', $materialRequest) }}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-pencil"></i> Modifier la demande
                </a>
                <a href="{{ route('material-requests.request-items.create', $materialRequest) }}" class="btn btn-sm btn-success">
                    <i class="bi bi-plus-circle"></i> Ajouter un article
                </a>
                <form action="{{ route('material-requests.submit', $materialRequest) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-primary"
                            onclick="return confirm('Soumettre la demande pour approbation ?')">
                        <i class="bi bi-arrow-up-circle"></i> Soumettre pour approbation
                    </button>
                </form>
                <form action="{{ route('material-requests.destroy', $materialRequest) }}" method="POST" style="display: inline;">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-sm btn-outline-danger"
                            onclick="return confirm('Supprimer la demande ?')">
                        <i class="bi bi-trash"></i> Supprimer
                    </button>
                </form>
            @endif

            @if ($canTransmit ?? false)
                <form action="{{ route('material-requests.transmit', $materialRequest) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-primary" onclick="return confirm('Transmettre cette demande au directeur ?');">
                        <i class="bi bi-send"></i> Transmettre au directeur
                    </button>
                </form>
                <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#rejectModal">
                    <i class="bi bi-x-circle"></i> Rejeter
                </button>
                <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#treatmentNotesModal">
                    <i class="bi bi-chat-text"></i> Observation
                </button>
            @endif
            @if ($canDirectorApprove ?? false)
                <button type="button" class="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#directorApproveModal">
                    <i class="bi bi-check-circle"></i> Approuver (directeur)
                </button>
                <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#directorRejectModal">
                    <i class="bi bi-x-circle"></i> Rejeter
                </button>
            @endif
            @can('treat', $materialRequest)
                @if (($materialRequest->status === 'director_approved') && ($canApprove ?? false))
                    <button type="button" class="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#approveModal">
                        <i class="bi bi-check-circle"></i> Valider la commande
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#treatmentNotesModal">
                        <i class="bi bi-chat-text"></i> Observation
                    </button>
                @endif
                @if (in_array($materialRequest->status, ['approved', 'received', 'aggregated', 'partially_received']))
                    <form action="{{ route('material-requests.set-delivered', $materialRequest) }}" method="POST" style="display: inline;">
                        @csrf
                        <button type="submit" class="btn btn-sm btn-outline-success" onclick="return confirm('Clôturer / marquer comme livrée ?')">
                            <i class="bi bi-box-seam"></i> Clôturer / Livrée
                        </button>
                    </form>
                @endif
            @endcan
            @if (in_array($materialRequest->status, ['delivered', 'received']) && auth()->user()->can('viewStorage', $materialRequest))
                @if (auth()->user()->can('storeStorage', $materialRequest))
                    <a href="{{ route('material-requests.store-storage-form', $materialRequest) }}" class="btn btn-sm btn-primary">
                        <i class="bi bi-box-arrow-in-down"></i> Enregistrer la réception
                    </a>
                @else
                    <a href="{{ route('material-requests.store-storage-form', $materialRequest) }}" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-eye"></i> Voir la réception
                    </a>
                @endif
            @endif

            <a href="{{ route('material-requests.index') }}" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Retour
            </a>
        </div>
    </div>
</div>

<!-- Historique de la commande -->
@if (isset($requestHistory) && $requestHistory->isNotEmpty())
<div class="card mt-4">
    <div class="card-header">Historique de la commande</div>
    <div class="card-body">
        <ul class="list-group list-group-flush">
            @foreach ($requestHistory as $log)
                <li class="list-group-item d-flex justify-content-between align-items-start">
                    <div>
                        <span class="badge bg-light text-dark me-2">{{ $log->action }}</span>
                        {{ $log->description }}
                        @if ($log->user)
                            <small class="text-muted">— {{ $log->user->name }}</small>
                        @endif
                    </div>
                    <small class="text-muted">{{ $log->created_at->format('d/m/Y H:i') }}</small>
                </li>
            @endforeach
        </ul>
    </div>
</div>
@endif

@if ($materialRequest->status === 'director_approved' && ($canApprove ?? false))
<script>
document.addEventListener('DOMContentLoaded', function() {
    function formatNum(n) { return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }); }
    function updateLineTotals() {
        document.querySelectorAll('.unit-price-input').forEach(function(inp) {
            var id = inp.dataset.requestItemId;
            var qty = parseInt(inp.dataset.qty || 0, 10);
            var val = parseFloat(inp.value) || 0;
            var totalEl = document.querySelector('.line-total[data-request-item-id="' + id + '"]');
            if (totalEl) totalEl.textContent = val > 0 ? formatNum(val * qty) : '—';
        });
    }
    document.querySelectorAll('.unit-price-input').forEach(function(inp) {
        inp.addEventListener('input', updateLineTotals);
        inp.addEventListener('change', updateLineTotals);
    });
    updateLineTotals();

    // Bouton Valider : copier les prix du tableau vers les champs cachés puis envoyer le formulaire
    var form = document.getElementById('form-approve-request');
    var btn = document.getElementById('btn-validate-request');
    if (form && btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.unit-price-input').forEach(function(inp) {
                var id = inp.getAttribute('data-request-item-id');
                if (!id) return;
                var hidden = document.getElementById('approve-unit-price-' + id);
                if (hidden) hidden.value = inp.value !== '' ? inp.value : '';
            });
            if (!confirm('Valider la demande ? Le montant sera déduit du budget du campus.')) return;
            btn.disabled = true;
            form.submit();
        });
    }
});
</script>
@endif
@endsection

@section('modals')
{{-- Modals rendus hors de .main-content (voir layout) pour overlay, z-index et scroll corrects --}}
@if ($materialRequest->status === 'director_approved' && ($canApprove ?? false))
<div class="modal fade" id="approveModal" tabindex="-1" aria-labelledby="approveModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form id="form-approve-request" action="{{ route('material-requests.approve', $materialRequest) }}" method="POST">
                @csrf
                @foreach ($materialRequest->requestItems->where('director_approved', true) as $ri)
                    @php $pu = (float)($ri->unit_price ?? 0); if ($pu <= 0 && $ri->item_id && $ri->item) { $pu = (float)$ri->item->unit_cost; } @endphp
                    <input type="hidden" name="unit_prices[{{ $ri->id }}]" id="approve-unit-price-{{ $ri->id }}" value="{{ $pu > 0 ? $pu : '' }}">
                @endforeach
                <div class="modal-header">
                    <h6 class="modal-title" id="approveModalLabel">Valider la demande</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>
                <div class="modal-body">
                    <p class="small text-muted">Les prix unitaires sont récupérés depuis le référentiel (modifiables dans le tableau). En cas de rupture de stock, la ligne concernée ne pourra pas être validée.</p>
                    @if ($campusBudgetRemaining !== null)
                        <p class="small mb-2"><strong>Solde disponible :</strong> {{ number_format($campusBudgetRemaining, 0, ',', ' ') }} FCFA</p>
                    @endif
                    <label for="approval_notes_modal" class="form-label small">Notes (optionnel)</label>
                    <textarea class="form-control form-control-sm" id="approval_notes_modal" name="approval_notes" rows="2" placeholder="Commentaire éventuel..."></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="button" class="btn btn-success" id="btn-validate-request"><i class="bi bi-check-circle"></i> Valider la demande</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif

@if (($materialRequest->status === 'submitted') && (auth()->user()->can('reject', $materialRequest)))
<div class="modal fade" id="rejectModal" tabindex="-1" aria-labelledby="rejectModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title" id="rejectModalLabel">Rejeter la demande</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <form action="{{ route('material-requests.reject', $materialRequest) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <label for="rejection_reason" class="form-label">Motif du rejet</label>
                    <textarea class="form-control" id="rejection_reason" name="rejection_reason" rows="3" required></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-danger">Rejeter la demande</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif

@if ($canDirectorApprove ?? false)
<div class="modal fade" id="directorApproveModal" tabindex="-1" aria-labelledby="directorApproveModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <form action="{{ route('material-requests.director-approve', $materialRequest) }}" method="POST">
                @csrf
                <div class="modal-header">
                    <h6 class="modal-title" id="directorApproveModalLabel">Approuver la demande (directeur)</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>
                <div class="modal-body">
                    <p class="small text-muted">Cochez les articles à approuver. Seules les lignes cochées pourront être validées et livrées par le point focal.</p>
                    <div class="mb-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" id="director-approve-select-all">Tout sélectionner</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" id="director-approve-deselect-all">Tout désélectionner</button>
                    </div>
                    <ul class="list-group list-group-flush">
                        @foreach ($materialRequest->requestItems as $item)
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <label class="mb-0 d-flex align-items-center gap-2 flex-grow-1">
                                    <input type="checkbox" name="approved_items[]" value="{{ $item->id }}" class="form-check-input director-approve-cb" checked>
                                    <span><strong>{{ $item->display_label }}</strong> — {{ $item->requested_quantity }} {{ $item->item?->unit_of_measure ?? 'unité(s)' }}</span>
                                </label>
                            </li>
                        @endforeach
                    </ul>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-success" onclick="return confirm('Approuver la demande pour les lignes cochées ?');"><i class="bi bi-check-circle"></i> Approuver la demande (lignes cochées)</button>
                </div>
            </form>
        </div>
    </div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
    var selectAll = document.getElementById('director-approve-select-all');
    var deselectAll = document.getElementById('director-approve-deselect-all');
    var cbs = document.querySelectorAll('.director-approve-cb');
    if (selectAll) selectAll.addEventListener('click', function() { cbs.forEach(function(cb) { cb.checked = true; }); });
    if (deselectAll) deselectAll.addEventListener('click', function() { cbs.forEach(function(cb) { cb.checked = false; }); });
});
</script>
@endif

@if (($canDirectorReject ?? false))
<div class="modal fade" id="directorRejectModal" tabindex="-1" aria-labelledby="directorRejectModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title" id="directorRejectModalLabel">Rejeter la demande (directeur)</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <form action="{{ route('material-requests.director-reject', $materialRequest) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <label for="director_rejection_reason" class="form-label">Motif du rejet</label>
                    <textarea class="form-control" id="director_rejection_reason" name="rejection_reason" rows="3" required></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-danger">Rejeter la demande</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif

@can('treat', $materialRequest)
<div class="modal fade" id="treatmentNotesModal" tabindex="-1" aria-labelledby="treatmentNotesModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form action="{{ route('material-requests.update-treatment-notes', $materialRequest) }}" method="POST">
                @csrf
                @method('PUT')
                <div class="modal-header">
                    <h6 class="modal-title" id="treatmentNotesModalLabel">Observation / commentaire</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>
                <div class="modal-body">
                    <textarea class="form-control" name="treatment_notes" rows="4" placeholder="Commentaire ou observation du point focal...">{{ $materialRequest->treatment_notes }}</textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endcan
@endsection
