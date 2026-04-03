@extends('layouts.app')

@section('title', 'Ajouter un article - ' . $materialRequest->request_number . ' - ESEBAT')
@section('page-title', 'Ajouter un article')

@section('content')
<div class="row mb-3">
    <div class="col-12">
        <p class="text-muted mb-0">
            Demande <strong>{{ $materialRequest->request_number }}</strong>
            — <a href="{{ route('material-requests.show', $materialRequest) }}">Retour à la demande</a>
        </p>
    </div>
</div>

<div class="card">
    <div class="card-header">Choisir un article</div>
    <div class="card-body">
        @if ($errors->any())
            <div class="alert alert-danger">
                <ul class="mb-0">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        @if ($items->isEmpty())
            <p class="text-muted mb-0">Tous les articles actifs sont déjà dans cette demande, ou aucun article n'est disponible.</p>
            <a href="{{ route('material-requests.show', $materialRequest) }}" class="btn btn-outline-secondary mt-3">Retour</a>
        @else
            <form action="{{ route('material-requests.request-items.store', $materialRequest) }}" method="POST">
                @csrf
                <div class="row g-3">
                    <div class="col-md-12">
                        <label for="item_id" class="form-label">Article <span class="text-danger">*</span></label>
                        <select class="form-select @error('item_id') is-invalid @enderror" id="item_id" name="item_id" required>
                            <option value="">— Choisir un article —</option>
                            @foreach ($items as $item)
                                @php $available = $item->available_stock ?? $item->getAvailableStock(); @endphp
                                <option value="{{ $item->id }}" {{ old('item_id') == $item->id ? 'selected' : '' }}
                                    data-unit="{{ $item->unit ?? '' }}"
                                    data-available="{{ $available }}">
                                    {{ $item->description ?? $item->name }} ({{ $item->code ?? $item->id }})@if ($available <= 0) — Rupture de stock @endif
                                </option>
                            @endforeach
                        </select>
                        <div id="stock-alert" class="alert alert-warning mt-2 d-none" role="alert">
                            <i class="bi bi-exclamation-triangle me-2"></i><strong>Rupture de stock :</strong> ce matériel n'est plus disponible en stock. La demande pourra être traitée lors d'une prochaine livraison.
                        </div>
                        @error('item_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-6">
                        <label for="requested_quantity" class="form-label">Quantité demandée <span class="text-danger">*</span></label>
                        <input type="number" class="form-control @error('requested_quantity') is-invalid @enderror"
                               id="requested_quantity" name="requested_quantity" min="1" max="99999"
                               value="{{ old('requested_quantity', 1) }}" required>
                        @error('requested_quantity')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-6">
                        <label for="unit_price" class="form-label">Prix unitaire prévu (optionnel)</label>
                        <input type="number" step="0.01" min="0" class="form-control @error('unit_price') is-invalid @enderror"
                               id="unit_price" name="unit_price" value="{{ old('unit_price') }}" placeholder="0.00">
                        @error('unit_price')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-12">
                        <label for="notes" class="form-label">Notes (optionnel)</label>
                        <textarea class="form-control @error('notes') is-invalid @enderror" id="notes" name="notes" rows="2" maxlength="500">{{ old('notes') }}</textarea>
                        @error('notes')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                </div>
                <div class="mt-4">
                    <button type="submit" class="btn btn-primary"><i class="bi bi-plus-circle"></i> Ajouter à la demande</button>
                    <a href="{{ route('material-requests.show', $materialRequest) }}" class="btn btn-outline-secondary">Annuler</a>
                </div>
            </form>
        @endif
    </div>
</div>
@if ($items->isNotEmpty())
<script>
document.addEventListener('DOMContentLoaded', function() {
    var sel = document.getElementById('item_id');
    var alertEl = document.getElementById('stock-alert');
    if (!sel || !alertEl) return;
    function toggleStockAlert() {
        var opt = sel.options[sel.selectedIndex];
        var available = opt ? parseInt(opt.getAttribute('data-available'), 10) : -1;
        if (available === 0) {
            alertEl.classList.remove('d-none');
        } else {
            alertEl.classList.add('d-none');
        }
    }
    sel.addEventListener('change', toggleStockAlert);
    toggleStockAlert();
});
</script>
@endif
@endsection
