@extends('layouts.app')

@section('title', 'Mon stock personnel - ESEBAT')
@section('page-title', 'Mon stock personnel')
@section('page-subtitle', 'Stock local et sorties')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Inventaire personnel</h1>
        <p class="page-hero-subtitle mb-0">Réceptions enregistrées, synthèse par article et historique des mouvements</p>
    </div>
    <button type="button" class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#distributionModal">
        <i class="bi bi-box-arrow-right me-1"></i> Enregistrer une sortie
    </button>
</div>

@if (session('success'))
    <div class="alert alert-success alert-dismissible fade show" role="alert">
        {{ session('success') }}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
@endif
@if ($errors->any())
    <div class="alert alert-danger alert-dismissible fade show">
        <ul class="mb-0">
            @foreach ($errors->all() as $e)
                <li>{{ $e }}</li>
            @endforeach
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        <button type="button" class="btn btn-sm btn-outline-danger ms-2" data-bs-toggle="modal" data-bs-target="#distributionModal">Rouvrir le formulaire</button>
    </div>
@endif

<p class="text-muted small mb-3"><strong>Stock local (staff) :</strong> Vous voyez ici le stock déjà enregistré (quantité reçue). Après chaque sortie, la <strong>quantité initiale</strong> est décrémentée et le <strong>solde restant</strong> est mis à jour. Chaque sortie exige le <strong>destinataire réel</strong> (obligatoire) et est historisée.</p>

<!-- Tableau des réceptions / commandes enregistrées par le staff -->
<div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span><i class="bi bi-box-seam"></i> Réceptions / commandes enregistrées</span>
        <a href="{{ route('material-requests.index', ['status' => 'delivered']) }}" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-box-seam"></i> Voir mes demandes livrées
        </a>
    </div>
    <div class="card-body p-0">
        @if (($recordedReceptions ?? collect())->isEmpty())
            <div class="p-4">
                <p class="text-muted mb-2"><strong>Vous n'avez encore aucune réception enregistrée.</strong></p>
                <p class="mb-3 small">Pour faire apparaître des lignes ici : une demande dont vous êtes le <strong>demandeur</strong> doit être <strong>« Livrée / clôturée »</strong>. Ouvrez la fiche de la demande, cliquez sur <strong>« Enregistrer la réception »</strong>, constatez les quantités reçues pour chaque ligne, puis enregistrez.</p>
                @if (($pendingReceptionRequests ?? collect())->isNotEmpty())
                    <p class="small mb-2">Demandes livrées en attente d'enregistrement de réception :</p>
                    <ul class="list-unstyled mb-3">
                        @foreach ($pendingReceptionRequests as $req)
                            <li>
                                <a href="{{ route('material-requests.store-storage-form', $req) }}" class="btn btn-sm btn-outline-primary me-1 mb-1">
                                    {{ $req->request_number }}
                                </a>
                                <small class="text-muted">— Enregistrer la réception</small>
                            </li>
                        @endforeach
                    </ul>
                @endif
                <a href="{{ route('material-requests.index', ['status' => 'delivered']) }}" class="btn btn-sm btn-primary">
                    <i class="bi bi-box-seam"></i> Voir mes demandes livrées
                </a>
            </div>
        @else
            @if (($pendingReceptionRequests ?? collect())->isNotEmpty())
                <div class="alert alert-light border mx-4 mt-3 mb-0 small">
                    <strong>En attente d'enregistrement de réception :</strong>
                    @foreach ($pendingReceptionRequests->take(5) as $req)
                        <a href="{{ route('material-requests.store-storage-form', $req) }}" class="btn btn-sm btn-outline-secondary me-1 mb-1">{{ $req->request_number }}</a>
                    @endforeach
                    @if ($pendingReceptionRequests->count() > 5)
                        <span class="text-muted">…</span>
                    @endif
                </div>
            @endif
            <p class="text-muted small px-4 pt-3 mb-0">Chaque ligne correspond à un article d’une de vos demandes livrées ou réceptionnées. Les quantités affichées sont celles que vous avez enregistrées cet enregistrement (quantités reçue, stockée, utilisée, stock restant).</p>
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Date d'enregistrement</th>
                            <th>Réf. demande</th>
                            <th>Catégorie</th>
                            <th>Désignation</th>
                            <th class="text-end">Qté reçue</th>
                            <th class="text-end">Qté stockée</th>
                            <th class="text-end">Qté utilisée</th>
                            <th class="text-end">Stock restant</th>
                            <th>Staff</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($recordedReceptions as $line)
                            @php
                                $designationForKey = trim($line->designation ?? '') ?: ($line->item?->description ?? $line->item?->name ?? '');
                                $key = ($line->item_id ?? 'n') . '|' . $designationForKey;
                                $remaining = isset($remainingByKey) && $remainingByKey->has($key) ? ($remainingByKey->get($key)?->quantity_remaining ?? '—') : '—';
                            @endphp
                            <tr>
                                <td>{{ $line->updated_at->format('d/m/Y H:i') }}</td>
                                <td>
                                    @if ($line->materialRequest)
                                        <a href="{{ route('material-requests.show', $line->materialRequest) }}">{{ $line->materialRequest->request_number ?? '—' }}</a>
                                    @else
                                        —
                                    @endif
                                </td>
                                <td>{{ $line->item?->category?->name ?? '—' }}</td>
                                <td>{{ $line->display_label }}</td>
                                <td class="text-end">{{ number_format($line->quantity_received ?? 0, 0, ',', ' ') }}</td>
                                <td class="text-end">{{ number_format($line->quantity_available ?? 0, 0, ',', ' ') }}</td>
                                <td class="text-end">{{ number_format($line->quantity_used ?? 0, 0, ',', ' ') }}</td>
                                <td class="text-end"><strong>{{ is_numeric($remaining) ? number_format($remaining, 0, ',', ' ') : $remaining }}</strong></td>
                                <td>{{ $line->materialRequest?->requester_user_id === auth()->id() ? 'Vous' : ($line->materialRequest?->requester?->name ?? '—') }}</td>
                                <td>
                                    @if (($line->materialRequest?->status ?? '') === 'delivered')
                                        <span class="badge bg-success">Livrée</span>
                                    @elseif (($line->materialRequest?->status ?? '') === 'received')
                                        <span class="badge bg-success">Réceptionnée</span>
                                    @else
                                        <span class="badge bg-secondary">{{ $line->materialRequest?->status ?? '—' }}</span>
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

<!-- Synthèse par article : stock enregistré avec quantité reçue, puis décrémenté après chaque sortie -->
<div class="card mb-4">
    <div class="card-header">
        <i class="bi bi-pie-chart"></i> Synthèse par article
    </div>
    <div class="card-body p-0">
        @if ($summary->isEmpty())
            <p class="text-muted p-4 mb-0">Aucun stock enregistré pour le moment. Enregistrez la réception via <strong>« Enregistrer la réception »</strong> sur une demande livrée pour faire apparaître ici la synthèse par article et dans le tableau « Réceptions / commandes enregistrées » ci-dessus.</p>
        @else
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Désignation</th>
                            <th>Catégorie</th>
                            <th class="text-end">Quantité reçue (initiale)</th>
                            <th class="text-end">Déjà sortie / utilisée</th>
                            <th class="text-end">Quantité restante (initiale décrémentée)</th>
                            <th>Enregistrer une sortie</th>
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
                                <td>
                                    @if ($row->quantity_remaining > 0)
                                    @php $summaryKey = ($row->item_id ?? 'n') . '|' . ($row->designation ?? ''); @endphp
                                    <button type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#distributionModal"
                                            data-source-type="existing" data-summary-key="{{ $summaryKey }}" data-max-qty="{{ $row->quantity_remaining }}">
                                        <i class="bi bi-box-arrow-right"></i> Enregistrer une sortie
                                    </button>
                                    @else
                                    <span class="text-muted small">—</span>
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

<!-- Historique des mouvements : après chaque sortie on voit la quantité initiale décrémentée (solde) -->
<div class="card">
    <div class="card-header">
        <i class="bi bi-clock-history"></i> Historique des mouvements
    </div>
    <div class="card-body p-0">
        @if ($movements->isEmpty())
            <p class="text-muted p-4 mb-0">Aucun mouvement enregistré.</p>
        @else
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Catégorie</th>
                            <th>Désignation / Nom</th>
                            <th class="text-end">Quantité</th>
                            <th class="text-end">Solde après mouvement</th>
                            <th>Destinataire / Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($movements as $m)
                            <tr>
                                <td>
                                    @if ($m->type === 'distributed' && $m->distributed_at)
                                        {{ $m->distributed_at->format('d/m/Y') }}
                                    @else
                                        {{ $m->created_at->format('d/m/Y H:i') }}
                                    @endif
                                </td>
                                <td>
                                    @if ($m->type === 'received')
                                        <span class="badge bg-success">Reçu</span>
                                    @else
                                        <span class="badge bg-secondary">Sortie</span>
                                    @endif
                                </td>
                                <td>{{ $m->category?->name ?? ($m->item?->category?->name ?? '—') }}</td>
                                <td>{{ $m->designation ?? ($m->item?->description ?? '—') }}</td>
                                <td class="text-end">{{ number_format($m->quantity, 0, ',', ' ') }}</td>
                                <td class="text-end"><strong>{{ isset($m->balance_after) ? number_format($m->balance_after, 0, ',', ' ') : '—' }}</strong></td>
                                <td>
                                    @if ($m->type === 'distributed')
                                        <strong>{{ $m->recipient ? e($m->recipient) : ($m->distributedTo ? $m->distributedTo->name : '—') }}</strong>
                                        @if ($m->notes)
                                            <br><small class="text-muted">{{ Str::limit($m->notes, 50) }}</small>
                                        @endif
                                    @elseif ($m->notes)
                                        <small>{{ Str::limit($m->notes, 40) }}</small>
                                    @else
                                        —
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <div class="p-2">
                {{ $movements->links() }}
            </div>
        @endif
    </div>
</div>
@endsection

@section('modals')
<!-- Modal : Enregistrer une sortie (stock local staff) — rendu dans .modals-outer pour que les clics fonctionnent -->
<div class="modal fade" id="distributionModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form action="{{ route('personal-stock.store-distribution') }}" method="POST" id="distributionForm">
                @csrf
                <input type="hidden" name="source_type" id="dist_source_type" value="{{ old('source_type', 'existing') }}">
                <div class="modal-header">
                    <h6 class="modal-title">Enregistrer une sortie</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    @error('error')
                        <div class="alert alert-danger py-2 small">{{ $message }}</div>
                    @enderror

                    {{-- Bloc 1 — Choix de la source --}}
                    <div class="card bg-light mb-3">
                        <div class="card-body py-2">
                            <label class="form-label small fw-bold mb-2">Bloc 1 — Source de l'article</label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="source_radio" id="source_existing" value="existing" {{ old('source_type', 'existing') === 'existing' ? 'checked' : '' }}>
                                <label class="form-check-label" for="source_existing">Article existant du stock</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="source_radio" id="source_free" value="free" {{ old('source_type') === 'free' ? 'checked' : '' }}>
                                <label class="form-check-label" for="source_free">Désignation libre (exceptionnel)</label>
                            </div>
                        </div>
                    </div>

                    <div id="dist_block_existing" class="mb-3">
                        <label class="form-label">Article existant <span class="text-danger">*</span></label>
                        <select name="summary_key" id="dist_summary_key" class="form-select form-select-sm {{ $errors->has('error') ? 'is-invalid' : '' }}">
                            <option value="">— Choisir une ligne du stock —</option>
                            @foreach ($summary ?? [] as $row)
                                @if (($row->quantity_remaining ?? 0) > 0)
                                @php $sk = ($row->item_id ?? 'n') . '|' . ($row->designation ?? ''); @endphp
                                <option value="{{ $sk }}" data-max="{{ $row->quantity_remaining }}" data-category-name="{{ e($row->category_name ?? '—') }}" {{ old('summary_key') === $sk ? 'selected' : '' }}>
                                    {{ $row->designation }} — {{ $row->category_name ?? '—' }} (restant : {{ $row->quantity_remaining }})
                                </option>
                                @endif
                            @endforeach
                        </select>
                        <div class="small text-muted mt-1" id="dist_category_display">Catégorie et désignation sont celles de la ligne choisie ci‑dessus.</div>
                    </div>

                    <div id="dist_block_free" class="mb-3" style="display: none;">
                        <label class="form-label">Catégorie <span class="text-danger">*</span></label>
                        <select name="category_id" id="dist_category_id" class="form-select form-select-sm">
                            <option value="">— Choisir une catégorie —</option>
                            @foreach ($categories ?? [] as $cat)
                                <option value="{{ $cat->id }}" {{ old('category_id') == $cat->id ? 'selected' : '' }}>{{ $cat->name }}</option>
                            @endforeach
                        </select>
                        <label class="form-label mt-2">Désignation libre <span class="text-danger">*</span></label>
                        <input type="text" name="designation" id="dist_designation" class="form-control form-control-sm" maxlength="500" placeholder="Ex. Câbles USB" value="{{ old('designation') }}">
                        @error('designation')
                            <div class="invalid-feedback d-block">{{ $message }}</div>
                        @enderror
                    </div>

                    {{-- Bloc 2 — Informations de sortie --}}
                    <div class="card bg-light mb-3">
                        <div class="card-body py-2">
                            <label class="form-label small fw-bold mb-2">Bloc 2 — Informations de sortie</label>
                            <div class="mb-2">
                                <label class="form-label small mb-0">Quantité <span class="text-danger">*</span></label>
                                <input type="number" name="quantity" id="dist_quantity" class="form-control form-control-sm {{ $errors->has('quantity') ? 'is-invalid' : '' }}" min="1" max="99999" value="{{ old('quantity', 1) }}" required>
                                @error('quantity')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                                <small class="text-muted" id="dist_qty_hint"></small>
                            </div>
                            <div class="mb-2">
                                <label class="form-label small mb-0">Destinataire réel <span class="text-danger">*</span></label>
                                <input type="text" name="recipient" class="form-control form-control-sm {{ $errors->has('recipient') ? 'is-invalid' : '' }}" maxlength="500" required
                                       value="{{ old('recipient') }}" placeholder="Ex. : Élève Dupont, Classe 3e A">
                                @error('recipient')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>
                            <div class="mb-2">
                                <label class="form-label small mb-0">Date de sortie <span class="text-danger">*</span></label>
                                <input type="date" name="distributed_at" class="form-control form-control-sm {{ $errors->has('distributed_at') ? 'is-invalid' : '' }}" value="{{ old('distributed_at', date('Y-m-d')) }}" required max="{{ date('Y-m-d') }}">
                                @error('distributed_at')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>
                            <div class="mb-2">
                                <label class="form-label small mb-0">Utilisateur du campus (optionnel)</label>
                                <select name="distributed_to_user_id" class="form-select form-select-sm">
                                    <option value="">— Non applicable —</option>
                                    @foreach ($usersSameCampus ?? [] as $u)
                                        <option value="{{ $u->id }}" {{ old('distributed_to_user_id') == $u->id ? 'selected' : '' }}>{{ $u->name }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="mb-0">
                                <label class="form-label small mb-0">Note (optionnel)</label>
                                <textarea name="notes" class="form-control form-control-sm" rows="2" maxlength="1000" placeholder="Précision éventuelle">{{ old('notes') }}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-primary btn-sm">Enregistrer la sortie</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script>
document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('distributionModal');
    var sourceExisting = document.getElementById('source_existing');
    var sourceFree = document.getElementById('source_free');
    var blockExisting = document.getElementById('dist_block_existing');
    var blockFree = document.getElementById('dist_block_free');
    var hiddenSourceType = document.getElementById('dist_source_type');
    var summaryKeySelect = document.getElementById('dist_summary_key');
    var categorySelect = document.getElementById('dist_category_id');
    var designationInput = document.getElementById('dist_designation');
    var quantityInput = document.getElementById('dist_quantity');
    var qtyHint = document.getElementById('dist_qty_hint');

    function setSourceType(value) {
        hiddenSourceType.value = value;
        if (value === 'existing') {
            blockExisting.style.display = 'block';
            blockFree.style.display = 'none';
            summaryKeySelect.removeAttribute('disabled');
            summaryKeySelect.required = true;
            categorySelect.removeAttribute('required');
            designationInput.removeAttribute('required');
        } else {
            blockExisting.style.display = 'none';
            blockFree.style.display = 'block';
            summaryKeySelect.setAttribute('disabled', 'disabled');
            summaryKeySelect.removeAttribute('required');
            summaryKeySelect.value = '';
            categorySelect.required = true;
            designationInput.required = true;
        }
        updateQuantityMax();
    }

    var categoryDisplay = document.getElementById('dist_category_display');

    function updateQuantityMax() {
        var sel = summaryKeySelect.options[summaryKeySelect.selectedIndex];
        var max = sel && sel.getAttribute('data-max') ? parseInt(sel.getAttribute('data-max'), 10) : 99999;
        quantityInput.max = max;
        if (max < 99999) {
            qtyHint.textContent = 'Maximum pour cette ligne : ' + max;
        } else {
            qtyHint.textContent = '';
        }
        if (categoryDisplay) {
            var catName = sel && sel.getAttribute('data-category-name');
            if (sel && sel.value && catName) {
                categoryDisplay.textContent = 'Catégorie (verrouillée) : ' + catName;
            } else {
                categoryDisplay.textContent = 'Catégorie et désignation sont celles de la ligne choisie ci‑dessus.';
            }
        }
    }

    if (sourceExisting) sourceExisting.addEventListener('change', function() { setSourceType('existing'); });
    if (sourceFree) sourceFree.addEventListener('change', function() { setSourceType('free'); });
    if (summaryKeySelect) summaryKeySelect.addEventListener('change', updateQuantityMax);

    if (modal) {
        modal.addEventListener('show.bs.modal', function(ev) {
            var btn = ev.relatedTarget;
            if (btn && btn.getAttribute('data-source-type') === 'existing') {
                var key = btn.getAttribute('data-summary-key');
                var maxQty = btn.getAttribute('data-max-qty');
                if (sourceExisting) sourceExisting.checked = true;
                setSourceType('existing');
                if (summaryKeySelect && key) {
                    summaryKeySelect.value = key;
                    if (maxQty) {
                        quantityInput.max = maxQty;
                        qtyHint.textContent = 'Maximum pour cette ligne : ' + maxQty;
                    }
                    updateQuantityMax();
                }
            } else {
                if (sourceExisting) sourceExisting.checked = true;
                setSourceType('existing');
            }
        });
    }

    setSourceType(hiddenSourceType.value || 'existing');

    @if ($errors->any())
    (function() {
        var m = document.getElementById('distributionModal');
        if (m) {
            var modal = new bootstrap.Modal(m);
            modal.show();
        }
    })();
    @endif
});
</script>
@endsection
