@extends('layouts.app')

@section('title', 'Créer une commande fournisseur - ESEBAT')
@section('page-title', 'Créer une commande fournisseur')

@section('content')
<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">Nouvelle commande fournisseur</div>
            <div class="card-body">
                @if ($errors->any())
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Erreur :</strong> Veuillez corriger les champs ci-dessous.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                <form action="{{ route('aggregated-orders.store') }}" method="POST" id="createOrderForm">
                    @csrf

                    <div class="mb-3">
                        <label for="supplier_id" class="form-label">Fournisseur <span class="text-danger">*</span></label>
                        <select class="form-select @error('supplier_id') is-invalid @enderror" 
                                id="supplier_id" name="supplier_id" required>
                            <option value="">— Choisir un fournisseur —</option>
                            @foreach ($suppliers as $supplier)
                                <option value="{{ $supplier->id }}" {{ old('supplier_id') == $supplier->id ? 'selected' : '' }}>
                                    {{ $supplier->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('supplier_id')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Lignes de demande <span class="text-danger">*</span></label>
                        <div id="itemsContainer" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
                            @forelse ($pendingItems as $item)
                                <div class="form-check mb-2">
                                    <input class="form-check-input request-item -label" type="checkbox" 
                                           name="request_item_ids[]" value="{{ $item->id }}"
                                           data-supplier="{{ $item->materialRequest->campus->id }}"
                                           id="item_{{ $item->id }}"
                                           {{ in_array($item->id, old('request_item_ids', [])) ? 'checked' : '' }}>
                                    <label class="form-check-label" for="item_{{ $item->id }}" style="font-size: 13px;">
                                        <strong>{{ $item->item->description }}</strong> 
                                        ({{ $item->requested_quantity }} {{ $item->item->unit_of_measure }})
                                        <br>
                                        <small class="text-muted">
                                            Demande : {{ $item->materialRequest->request_number }} | 
                                            Campus : {{ $item->materialRequest->campus?->name ?? '—' }} |
                                            Fournisseur : {{ $item->item->supplier?->name ?? '—' }}
                                        </small>
                                    </label>
                                </div>
                            @empty
                                <p class="text-muted text-center py-3">Aucune ligne en attente pour regroupement.</p>
                            @endforelse
                        </div>
                        @error('request_item_ids')
                            <div class="invalid-feedback d-block">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="expected_delivery_date" class="form-label">Livraison prévue <span class="text-danger">*</span></label>
                        <input type="date" class="form-control @error('expected_delivery_date') is-invalid @enderror" 
                               id="expected_delivery_date" name="expected_delivery_date" 
                               value="{{ old('expected_delivery_date') }}" required>
                        @error('expected_delivery_date')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes</label>
                        <textarea class="form-control @error('notes') is-invalid @enderror" 
                                  id="notes" name="notes" rows="3">{{ old('notes') }}</textarea>
                        @error('notes')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-circle"></i> Créer la commande
                        </button>
                        <a href="{{ route('aggregated-orders.index') }}" class="btn btn-outline-secondary">
                            <i class="bi bi-x-circle"></i> Annuler
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">Instructions</div>
            <div class="card-body">
                <div style="font-size: 13px;">
                    <h6>Workflow de regroupement</h6>
                    <ol style="padding-left: 20px;">
                        <li>Choisir un fournisseur dans la liste</li>
                        <li>Cocher les lignes en attente à regrouper</li>
                        <li>Saisir la date de livraison prévue</li>
                        <li>Cliquer sur « Créer la commande » pour enregistrer</li>
                    </ol>

                    <hr>

                    <h6>Points clés</h6>
                    <ul style="padding-left: 20px;">
                        <li><strong>Multi-campus :</strong> Regrouper des demandes de tous les campus</li>
                        <li><strong>Traçabilité :</strong> Lien vers les demandes d’origine</li>
                        <li><strong>Suivi :</strong> Statut de réception par ligne</li>
                    </ul>

                    <hr>

                    <div class="alert alert-info" style="font-size: 12px;">
                        <strong>Statuts :</strong> Brouillon → Confirmée → Réceptionnée
                    </div>
                </div>
            </div>
        </div>

        @if ($pendingItems->count() > 0)
            <div class="card mt-3">
                <div class="card-header">Résumé</div>
                <div class="card-body">
                    <table class="table table-sm table-borderless">
                        <tr>
                            <th>Lignes sélectionnées</th>
                            <td id="itemCount">0</td>
                        </tr>
                        <tr>
                            <th>Valeur estimée</th>
                            <td id="estimatedValue">0 XOF</td>
                        </tr>
                    </table>
                </div>
            </div>
        @endif
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createOrderForm');
    const checkboxes = document.querySelectorAll('.request-item');
    const itemCountEl = document.getElementById('itemCount');
    const estimatedValueEl = document.getElementById('estimatedValue');

    function updateSummary() {
        let count = 0;
        let value = 0;

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                count++;
            }
        });

        itemCountEl.textContent = count;
        estimatedValueEl.textContent = '0 XOF';
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSummary);
    });

    updateSummary();
});
</script>
@endsection
