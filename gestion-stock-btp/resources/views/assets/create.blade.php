@extends('layouts.app')

@section('title', 'Enregistrer un actif')
@section('page-title', 'Nouvel actif')

@section('content')
<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">Enregistrement d'actif</div>
            <div class="card-body">
                @if ($errors->any())
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Erreur :</strong> Veuillez corriger les champs ci-dessous.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                <form action="{{ route('assets.store') }}" method="POST">
                    @csrf

                    <div class="mb-3">
                        <label for="serial_number" class="form-label">Numéro de série <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('serial_number') is-invalid @enderror" 
                               id="serial_number" name="serial_number" 
                               value="{{ old('serial_number') }}" required>
                        @error('serial_number')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description <span class="text-danger">*</span></label>
                        <textarea class="form-control @error('description') is-invalid @enderror" 
                                  id="description" name="description" rows="3" required>{{ old('description') }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="category_id" class="form-label">Catégorie <span class="text-danger">*</span></label>
                        <select class="form-select @error('category_id') is-invalid @enderror" 
                                id="category_id" name="category_id" required>
                            <option value="">— Choisir une catégorie —</option>
                            @foreach ($categories as $category)
                                <option value="{{ $category->id }}" {{ old('category_id') == $category->id ? 'selected' : '' }}>
                                    {{ $category->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('category_id')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="acquisition_date" class="form-label">Date d'acquisition <span class="text-danger">*</span></label>
                            <input type="date" class="form-control @error('acquisition_date') is-invalid @enderror" 
                                   id="acquisition_date" name="acquisition_date" 
                                   value="{{ old('acquisition_date') }}" required>
                            @error('acquisition_date')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="acquisition_cost" class="form-label">Coût d'acquisition (XOF) <span class="text-danger">*</span></label>
                            <input type="number" class="form-control @error('acquisition_cost') is-invalid @enderror" 
                                   id="acquisition_cost" name="acquisition_cost" 
                                   value="{{ old('acquisition_cost') }}" step="0.01" min="0" required>
                            @error('acquisition_cost')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="campus_id" class="form-label">Campus <span class="text-danger">*</span></label>
                            <select class="form-select @error('campus_id') is-invalid @enderror" 
                                    id="campus_id" name="campus_id" required>
                                <option value="">— Choisir un campus —</option>
                                @foreach ($campuses as $campus)
                                    <option value="{{ $campus->id }}" {{ old('campus_id') == $campus->id ? 'selected' : '' }}>
                                        {{ $campus->name }}
                                    </option>
                                @endforeach
                            </select>
                            @error('campus_id')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="warehouse_id" class="form-label">Entrepôt <span class="text-danger">*</span></label>
                            <select class="form-select @error('warehouse_id') is-invalid @enderror" 
                                    id="warehouse_id" name="warehouse_id" required>
                                <option value="">-- Select Warehouse --</option>
                            </select>
                            @error('warehouse_id')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="warranty_expiry" class="form-label">Fin de garantie</label>
                        <input type="date" class="form-control @error('warranty_expiry') is-invalid @enderror" 
                               id="warranty_expiry" name="warranty_expiry" 
                               value="{{ old('warranty_expiry') }}">
                        @error('warranty_expiry')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-circle"></i> Enregistrer l'actif
                        </button>
                        <a href="{{ route('assets.index') }}" class="btn btn-outline-secondary">
                            <i class="bi bi-x-circle"></i> Annuler
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Sidebar: Instructions -->
    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">Instructions</div>
            <div class="card-body">
                <div style="font-size: 13px;">
                    <h6>Étapes d'enregistrement</h6>
                    <ol style="padding-left: 20px;">
                        <li>Saisir le numéro de série unique</li>
                        <li>Renseigner la description de l'actif</li>
                        <li>Choisir la catégorie</li>
                        <li>Indiquer la date et le coût d'acquisition</li>
                        <li>Affecter au campus et à l'entrepôt</li>
                        <li>Ajouter la garantie si disponible</li>
                        <li>Enregistrer</li>
                    </ol>

                    <hr>

                    <h6>Informations clés</h6>
                    <ul style="padding-left: 20px;">
                        <li><strong>Numéro de série :</strong> Identifiant unique</li>
                        <li><strong>Statut :</strong> Mis automatiquement à « En service »</li>
                        <li><strong>Emplacement :</strong> Campus + Entrepôt</li>
                        <li><strong>Cycle de vie :</strong> Suivi des transferts et de la maintenance</li>
                    </ul>

                    <hr>

                    <div class="alert alert-success" style="font-size: 12px;">
                        <i class="bi bi-info-circle"></i> La liste des entrepôts se met à jour selon le campus choisi.
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const campusSelect = document.getElementById('campus_id');
    const warehouseSelect = document.getElementById('warehouse_id');
    const warehouseData = @json($warehouses);

    campusSelect.addEventListener('change', function() {
        const campusId = this.value;
        warehouseSelect.innerHTML = '<option value="">— Choisir un entrepôt —</option>';

        if (campusId) {
            const campusWarehouses = warehouseData.filter(w => w.campus_id == campusId);
            campusWarehouses.forEach(warehouse => {
                const option = document.createElement('option');
                option.value = warehouse.id;
                option.textContent = warehouse.name;
                warehouseSelect.appendChild(option);
            });
        }
    });

    // Trigger change on load to populate warehouses if campus was pre-selected
    campusSelect.dispatchEvent(new Event('change'));
});
</script>
@endsection
