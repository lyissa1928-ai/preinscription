@extends('layouts.app')

@section('title', 'Créer un budget')
@section('page-title', 'Nouveau budget')

@section('content')
<div class="alert alert-info mb-4">
    <i class="bi bi-info-circle me-2"></i>
    <strong>Un seul budget par campus et par année.</strong> Si un budget existe déjà pour un campus et une année, vous ne pouvez pas en créer un second. En cas d'épuisement du solde, utilisez « Ajouter du budget » (déblocage) sur la fiche du budget existant.
</div>

<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">Nouveau budget</div>
            <div class="card-body">
                @if ($errors->any())
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Erreur :</strong>
                        @if ($errors->has('fiscal_year'))
                            {{ $errors->first('fiscal_year') }}
                        @elseif ($errors->has('error'))
                            {{ $errors->first('error') }}
                        @else
                            Veuillez corriger les champs ci-dessous.
                        @endif
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                <form action="{{ route('budgets.store') }}" method="POST">
                    @csrf

                    <div class="mb-3">
                        <label for="campus_id" class="form-label">Campus <span class="text-danger">*</span></label>
                        <select class="form-select @error('campus_id') is-invalid @enderror" 
                                id="campus_id" name="campus_id" required>
                            <option value="">-- Select Campus --</option>
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

                    <div class="mb-3">
                        <label for="fiscal_year" class="form-label">Année fiscale <span class="text-danger">*</span></label>
                        <input type="number" class="form-control @error('fiscal_year') is-invalid @enderror" 
                               id="fiscal_year" name="fiscal_year" 
                               value="{{ old('fiscal_year', date('Y')) }}" 
                               min="2024" max="2100" required>
                        <small class="form-text text-muted">Ex. 2026. Un seul budget par campus et par année ; pour augmenter le montant, utilisez « Ajouter du budget » sur la fiche du budget existant.</small>
                        @error('fiscal_year')
                            <div class="invalid-feedback d-block">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="total_budget_amount" class="form-label">Montant total du budget (FCFA) <span class="text-danger">*</span></label>
                        <div class="input-group">
                            <input type="number" class="form-control @error('total_budget_amount') is-invalid @enderror" 
                                   id="total_budget_amount" name="total_budget_amount" 
                                   value="{{ old('total_budget_amount') }}" 
                                   placeholder="0" min="1" required>
                            <span class="input-group-text">FCFA</span>
                        </div>
                        @error('total_budget_amount')
                            <div class="invalid-feedback d-block">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description</label>
                        <textarea class="form-control @error('description') is-invalid @enderror" 
                                  id="description" name="description" rows="3">{{ old('description') }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="alert alert-light border" style="font-size: 13px;">
                        <strong>Statuts :</strong> Brouillon → Approuvé (directeur) → Actif. Une fois actif, le budget peut être complété via « Ajouter du budget » en cas d'épuisement.
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-circle"></i> Créer le budget
                        </button>
                        <a href="{{ route('budgets.index') }}" class="btn btn-outline-secondary">
                            <i class="bi bi-x-circle"></i> Annuler
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Sidebar: Règles -->
    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">Règles</div>
            <div class="card-body">
                <div style="font-size: 13px;">
                    <h6>Un budget par campus et par année</h6>
                    <ul style="padding-left: 20px;">
                        <li>Chaque campus ne peut avoir qu’<strong>un seul budget par année fiscale</strong>.</li>
                        <li>Pour augmenter le budget en cours d’année (solde épuisé), utilisez <strong>« Ajouter du budget »</strong> sur la fiche du budget existant (déblocage).</li>
                        <li>Ne créez pas un deuxième budget pour le même campus et la même année.</li>
                    </ul>

                    <hr>

                    <h6>Création</h6>
                    <ol style="padding-left: 20px;">
                        <li>Choisir le campus et l’année fiscale</li>
                        <li>Saisir le montant initial</li>
                        <li>Le directeur approuve puis active le budget</li>
                    </ol>

                    <div class="alert alert-success mt-2" style="font-size: 12px;">
                        <i class="bi bi-plus-circle"></i> Après création : faire approuver puis activer. En cas de besoin, compléter avec « Ajouter du budget ».
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
