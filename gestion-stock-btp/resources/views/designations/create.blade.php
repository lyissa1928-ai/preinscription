@extends('layouts.app')

@section('title', 'Nouvelle désignation - ESEBAT')
@section('page-title', 'Nouvelle désignation')

@section('content')
<div class="row justify-content-center">
    <div class="col-lg-8">
        @if ($proposedLabel ?? null)
        <div class="alert alert-info mb-3">
            <strong>Intégration d’un matériel non répertorié.</strong> La désignation proposée par le demandeur a été reprise ci‑dessous. Complétez le code, la catégorie et le prix unitaire puis enregistrez pour l’ajouter au catalogue.
        </div>
        @endif
        <div class="card">
            <div class="card-header">{{ ($proposedLabel ?? null) ? 'Intégrer la désignation au référentiel' : 'Ajouter une désignation au référentiel' }}</div>
            <div class="card-body">
                <form action="{{ route('designations.store') }}" method="POST" enctype="multipart/form-data">
                    @csrf
                    @if ($proposedLabel ?? null)
                        <input type="hidden" name="from_proposed" value="1">
                    @endif
                    @if (request('return_to'))
                        <input type="hidden" name="return_to" value="{{ request('return_to') }}">
                    @endif

                    <div class="mb-3">
                        <label for="name" class="form-label">Nom du matériel <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('name') is-invalid @enderror" id="name" name="name"
                               value="{{ old('name', $proposedLabel ?? '') }}" required maxlength="150" placeholder="Ex. Bureau standard">
                        @error('name')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="code" class="form-label">Code <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('code') is-invalid @enderror" id="code" name="code"
                               value="{{ old('code') }}" required maxlength="30" placeholder="Ex. BUR-01">
                        <small class="text-muted">Code unique pour identifier le matériel.</small>
                        @error('code')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description</label>
                        <textarea class="form-control @error('description') is-invalid @enderror" id="description" name="description"
                                  rows="2" maxlength="500">{{ old('description', ($proposedLabel ?? null) ?: '') }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="image" class="form-label">Image du matériel (catalogue)</label>
                        <input type="file" class="form-control @error('image') is-invalid @enderror" id="image" name="image"
                               accept="image/jpeg,image/png,image/gif,image/webp">
                        <small class="text-muted">Optionnel. Upload (JPG, PNG, GIF, WebP, max 2 Mo) ou URL ci-dessous.</small>
                        @error('image')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                        <input type="text" class="form-control mt-2 @error('image_path') is-invalid @enderror" id="image_path" name="image_path"
                               value="{{ old('image_path') }}" maxlength="500" placeholder="Ou indiquer une URL (ex. https://…)">
                        <small class="text-muted">Optionnel. URL ou chemin vers l’image pour le catalogue.</small>
                        @error('image_path')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="category_id" class="form-label">Catégorie <span class="text-danger">*</span></label>
                            <select class="form-select @error('category_id') is-invalid @enderror" id="category_id" name="category_id" required>
                                <option value="">— Choisir —</option>
                                @foreach ($categories as $c)
                                    <option value="{{ $c->id }}" {{ old('category_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                                @endforeach
                            </select>
                            <small class="text-muted">Pas la bonne catégorie ? <a href="{{ route('categories.create', ['return_to' => 'designations.create']) }}">Créer une catégorie</a>, puis revenez ici.</small>
                            @error('category_id')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="unit" class="form-label">Unité <span class="text-danger">*</span></label>
                            <input type="text" class="form-control @error('unit') is-invalid @enderror" id="unit" name="unit"
                                   value="{{ old('unit', 'unité') }}" required maxlength="20" placeholder="ex. pièce, rame">
                            @error('unit')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="unit_cost" class="form-label">Prix unitaire (FCFA) <span class="text-danger">*</span></label>
                        <input type="number" class="form-control @error('unit_cost') is-invalid @enderror" id="unit_cost" name="unit_cost"
                               value="{{ old('unit_cost') }}" required min="0" step="0.01" placeholder="0">
                        @error('unit_cost')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="is_active" id="is_active" value="1" {{ old('is_active', true) ? 'checked' : '' }}>
                            <label class="form-check-label" for="is_active">Désignation active (visible dans les listes)</label>
                        </div>
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-lg me-1"></i> {{ ($proposedLabel ?? null) ? 'Intégrer au référentiel' : 'Enregistrer' }}
                        </button>
                        <a href="{{ ($proposedLabel ?? null) ? route('designations.proposed') : route('designations.index') }}" class="btn btn-outline-secondary">Annuler</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
