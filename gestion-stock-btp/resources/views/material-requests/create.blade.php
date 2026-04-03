@extends('layouts.app')

@section('title', 'Nouvelle demande de matériel - ESEBAT')
@section('page-title', 'Nouvelle demande de matériel')

@section('content')
<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0">Créer une demande de matériel</h6>
            </div>
            <div class="card-body">
                <form action="{{ route('material-requests.store') }}" method="POST" id="demande-form">
                    @csrf

                    <h6 class="border-bottom pb-2 mb-3">Informations générales</h6>

                    <div class="mb-3">
                        <label class="form-label">Type de demande</label>
                        <div class="d-flex gap-3">
                            <label class="form-check">
                                <input type="radio" name="request_type" value="individual" class="form-check-input" {{ old('request_type', 'individual') === 'individual' ? 'checked' : '' }}>
                                <span class="form-check-label">Demande individuelle</span>
                            </label>
                            <label class="form-check">
                                <input type="radio" name="request_type" value="grouped" class="form-check-input" {{ old('request_type') === 'grouped' ? 'checked' : '' }}>
                                <span class="form-check-label">Demande groupée</span>
                            </label>
                        </div>
                        <small class="text-muted">Une demande groupée permet à plusieurs membres du staff du même campus d'ajouter leurs besoins.</small>
                    </div>

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="campus_id" class="form-label">Campus <span class="text-danger">*</span></label>
                            <select class="form-select @error('campus_id') is-invalid @enderror" id="campus_id" name="campus_id" required>
                                <option value="">-- Choisir un campus --</option>
                                @foreach ($campuses as $campus)
                                    <option value="{{ $campus->id }}" {{ old('campus_id') == $campus->id ? 'selected' : '' }}>
                                        {{ $campus->name }}
                                    </option>
                                @endforeach
                            </select>
                            @error('campus_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-md-6">
                            <label for="department_id" class="form-label">Service / Département</label>
                            <select class="form-select @error('department_id') is-invalid @enderror" id="department_id" name="department_id">
                                <option value="">-- Optionnel --</option>
                                @foreach ($campuses as $campus)
                                    @foreach ($campus->departments()->active()->orderBy('name')->get() as $dept)
                                        <option value="{{ $dept->id }}" data-campus="{{ $campus->id }}" {{ old('department_id') == $dept->id ? 'selected' : '' }}>
                                            {{ $campus->name }} — {{ $dept->name }}
                                        </option>
                                    @endforeach
                                @endforeach
                            </select>
                            @error('department_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                    </div>

                    <div class="mb-3 mt-3">
                        <label for="subject" class="form-label">Objet de la demande <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('subject') is-invalid @enderror" id="subject" name="subject"
                               value="{{ old('subject') }}" placeholder="Ex. Équipement salle de formation" maxlength="255" required>
                        @error('subject')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>

                    <div class="mb-3">
                        <label for="justification" class="form-label">Motif / justification <span class="text-danger">*</span></label>
                        <textarea class="form-control @error('justification') is-invalid @enderror" id="justification" name="justification" rows="3" maxlength="5000" required>{{ old('justification') }}</textarea>
                        @error('justification')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="needed_by_date" class="form-label">Date souhaitée <span class="text-danger">*</span></label>
                            <input type="date" class="form-control @error('needed_by_date') is-invalid @enderror" id="needed_by_date" name="needed_by_date" value="{{ old('needed_by_date') }}" required>
                            @error('needed_by_date')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-md-6">
                            <label for="notes" class="form-label">Notes complémentaires</label>
                            <input type="text" class="form-control @error('notes') is-invalid @enderror" id="notes" name="notes" value="{{ old('notes') }}" placeholder="Optionnel">
                            @error('notes')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                    </div>

                    <h6 class="border-bottom pb-2 mb-3 mt-4">Détail des matériels</h6>

                    <div id="lines-container">
                        <div class="table-responsive">
                            <table class="table table-sm" id="lines-table">
                                <thead>
                                    <tr>
                                        <th style="width: 45%;">Matériel demandé <span class="text-danger">*</span></th>
                                        <th style="width: 15%;">Quantité <span class="text-danger">*</span></th>
                                        <th style="width: 40px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="lines-tbody">
                                    <tr class="line-row" data-index="0">
                                        <td>
                                            <label class="form-label small text-muted mb-0">Type</label>
                                            <select class="form-select form-select-sm line-type" name="lines[0][type]" data-index="0">
                                                <option value="catalog">Matériel du référentiel (liste répertoriée par le point focal)</option>
                                                <option value="free">Matériel non répertorié</option>
                                            </select>
                                            <label class="form-label small text-muted mb-0 mt-1 d-block line-item-label">Matériel</label>
                                            <select class="form-select form-select-sm line-item" name="lines[0][item_id]" data-index="0" required>
                                                <option value="">-- Choisir un matériel dans la liste --</option>
                                                @foreach ($items as $item)
                                                    <option value="{{ $item->id }}">{{ $item->category ? $item->category->name . ' – ' : '' }}{{ $item->description ?: $item->name }}{{ $item->code ? ' (' . $item->code . ')' : '' }}</option>
                                                @endforeach
                                            </select>
                                            <input type="text" class="form-control form-control-sm mt-1 line-designation d-none" name="lines[0][designation]" placeholder="Décrivez le matériel (sera proposé au point focal pour intégration)" data-index="0" maxlength="500">
                                        </td>
                                        <td>
                                            <input type="number" class="form-control form-control-sm line-qty" name="lines[0][quantity]" min="1" max="9999" value="1" required>
                                        </td>
                                        <td>
                                            <button type="button" class="btn btn-sm btn-outline-danger remove-line" title="Supprimer" disabled><i class="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p class="text-danger small mt-1" id="lines-error" style="display: none;">Ajoutez au moins un matériel avec une désignation ou un article du catalogue et une quantité.</p>
                    </div>

                    <div class="mt-2">
                        <button type="button" class="btn btn-outline-primary btn-sm" id="add-line">
                            <i class="bi bi-plus-circle"></i> Ajouter un matériel
                        </button>
                    </div>

                    <div class="d-flex gap-2 mt-4">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-circle"></i> Créer la demande
                        </button>
                        <a href="{{ route('material-requests.index') }}" class="btn btn-outline-secondary">Annuler</a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <div class="card">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-info-circle"></i> Instructions</h6></div>
            <div class="card-body">
                <ol class="small" style="line-height: 1.8;">
                    <li>Choisissez votre <strong>campus</strong> et éventuellement le <strong>service</strong>.</li>
                    <li>Renseignez l’<strong>objet</strong> et le <strong>motif</strong> de la demande.</li>
                    <li><strong>Matériels :</strong> privilégiez une sélection dans le <strong>référentiel (catalogue)</strong>. Si le matériel n’y figure pas, choisissez « Matériel non répertorié » et décrivez-le ; la ligne sera signalée au point focal pour intégration au catalogue.</li>
                    <li>Ajoutez au moins une ligne avec une <strong>quantité</strong>.</li>
                    <li>La demande est créée en <strong>brouillon</strong> ; vous pourrez la soumettre ensuite.</li>
                </ol>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const tbody = document.getElementById('lines-tbody');
    const addBtn = document.getElementById('add-line');
    const form = document.getElementById('demande-form');
    const campusSelect = document.getElementById('campus_id');
    const departmentSelect = document.getElementById('department_id');
    const items = @json($items->map(fn($i) => ['id' => $i->id, 'description' => ($i->category ? $i->category->name . ' – ' : '') . ($i->description ?: $i->name), 'code' => $i->code]));

    let lineIndex = 1;

    function filterDepartments() {
        const campusId = campusSelect.value;
        Array.from(departmentSelect.options).forEach(opt => {
            if (opt.value === '') { opt.style.display = ''; return; }
            const dataCampus = opt.getAttribute('data-campus');
            opt.style.display = dataCampus === campusId ? '' : 'none';
        });
        if (departmentSelect.value) {
            const opt = departmentSelect.querySelector('option[value="' + departmentSelect.value + '"]');
            if (opt && opt.style.display === 'none') departmentSelect.value = '';
        }
    }
    campusSelect.addEventListener('change', filterDepartments);
    filterDepartments();

    function toggleLineInputs(row) {
        const typeSelect = row.querySelector('.line-type');
        const itemSelect = row.querySelector('.line-item');
        const designationInput = row.querySelector('.line-designation');
        const itemLabel = row.querySelector('.line-item-label');
        const idx = row.getAttribute('data-index');
        if (typeSelect.value === 'catalog') {
            if (itemSelect) itemSelect.classList.remove('d-none');
            if (itemLabel) itemLabel.classList.remove('d-none');
            if (itemSelect) {
                itemSelect.name = 'lines[' + idx + '][item_id]';
                itemSelect.required = true;
            }
            if (designationInput) {
                designationInput.classList.add('d-none');
                designationInput.name = 'lines[' + idx + '][designation]';
                designationInput.removeAttribute('required');
                designationInput.value = '';
            }
        } else {
            if (itemSelect) {
                itemSelect.classList.add('d-none');
                itemSelect.name = 'lines[' + idx + '][_item_id]';
                itemSelect.removeAttribute('required');
                itemSelect.value = '';
            }
            if (itemLabel) itemLabel.classList.add('d-none');
            if (designationInput) {
                designationInput.classList.remove('d-none');
                designationInput.name = 'lines[' + idx + '][designation]';
                designationInput.required = true;
            }
        }
    }

    function addRow() {
        const row = document.createElement('tr');
        row.className = 'line-row';
        row.setAttribute('data-index', lineIndex);
        row.innerHTML = '<td>' +
            '<label class="form-label small text-muted mb-0">Type</label>' +
            '<select class="form-select form-select-sm line-type" name="lines[' + lineIndex + '][type]" data-index="' + lineIndex + '"><option value="catalog">Matériel du référentiel (liste répertoriée par le point focal)</option><option value="free">Matériel non répertorié</option></select>' +
            '<label class="form-label small text-muted mb-0 mt-1 d-block line-item-label">Matériel</label>' +
            '<select class="form-select form-select-sm line-item" name="lines[' + lineIndex + '][item_id]" data-index="' + lineIndex + '"><option value="">-- Choisir un matériel dans la liste --</option>' +
            items.map(i => '<option value="' + i.id + '">' + (i.description || '') + (i.code ? ' (' + i.code + ')' : '') + '</option>').join('') + '</select>' +
            '<input type="text" class="form-control form-control-sm mt-1 line-designation d-none" name="lines[' + lineIndex + '][designation]" placeholder="Précisez le matériel" data-index="' + lineIndex + '" maxlength="500">' +
            '</td><td><input type="number" class="form-control form-control-sm line-qty" name="lines[' + lineIndex + '][quantity]" min="1" max="9999" value="1" required></td>' +
            '<td><button type="button" class="btn btn-sm btn-outline-danger remove-line" title="Supprimer"><i class="bi bi-trash"></i></button></td>';
        tbody.appendChild(row);
        row.querySelector('.line-type').addEventListener('change', function() { toggleLineInputs(row); });
        row.querySelector('.remove-line').addEventListener('click', function() { row.remove(); updateRemoveButtons(); });
        toggleLineInputs(row);
        lineIndex++;
        updateRemoveButtons();
    }

    function updateRemoveButtons() {
        const rows = tbody.querySelectorAll('.line-row');
        rows.forEach((r, i) => {
            const btn = r.querySelector('.remove-line');
            btn.disabled = rows.length <= 1;
        });
    }

    tbody.querySelectorAll('.line-row').forEach(row => {
        row.querySelector('.line-type').addEventListener('change', function() { toggleLineInputs(row); });
        row.querySelector('.remove-line').addEventListener('click', function() { row.remove(); updateRemoveButtons(); });
        toggleLineInputs(row);
    });

    addBtn.addEventListener('click', addRow);

    form.addEventListener('submit', function(e) {
        const rows = tbody.querySelectorAll('.line-row');
        let valid = true;
        rows.forEach(row => {
            const type = row.querySelector('.line-type').value;
            const qty = row.querySelector('.line-qty').value;
            if (!qty || parseInt(qty, 10) < 1) valid = false;
            if (type === 'catalog' && !row.querySelector('.line-item').value) valid = false;
            if (type === 'free' && !row.querySelector('.line-designation').value.trim()) valid = false;
        });
        if (rows.length === 0 || !valid) {
            e.preventDefault();
            document.getElementById('lines-error').style.display = 'block';
            return false;
        }
        document.getElementById('lines-error').style.display = 'none';
    });
});
</script>
@endsection
