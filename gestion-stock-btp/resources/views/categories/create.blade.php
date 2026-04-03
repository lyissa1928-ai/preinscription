@extends('layouts.app')

@section('title', 'Nouvelle catégorie - ESEBAT')
@section('page-title', 'Nouvelle catégorie')

@section('content')
<div class="row justify-content-center">
    <div class="col-lg-6">
        <div class="card">
            <div class="card-header">Créer une catégorie</div>
            <div class="card-body">
                <form action="{{ route('categories.store', request()->only('return_to')) }}" method="POST">
                    @csrf
                    @if (request('return_to'))
                        <input type="hidden" name="return_to" value="{{ request('return_to') }}">
                    @endif
                    <div class="mb-3">
                        <label for="name" class="form-label">Nom <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('name') is-invalid @enderror" id="name" name="name"
                               value="{{ old('name') }}" required maxlength="100" placeholder="Ex. Fournitures de bureau">
                        @error('name')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>
                    <div class="mb-3">
                        <label for="code" class="form-label">Code <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('code') is-invalid @enderror" id="code" name="code"
                               value="{{ old('code') }}" required maxlength="20" placeholder="Ex. FOURN">
                        @error('code')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>
                    <div class="mb-3">
                        <label for="type" class="form-label">Type <span class="text-danger">*</span></label>
                        <select class="form-select @error('type') is-invalid @enderror" id="type" name="type" required>
                            <option value="consommable" {{ old('type', 'consommable') === 'consommable' ? 'selected' : '' }}>Consommable</option>
                            <option value="asset" {{ old('type') === 'asset' ? 'selected' : '' }}>Actif</option>
                        </select>
                        @error('type')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>
                    <div class="mb-3">
                        <label for="description" class="form-label">Description</label>
                        <textarea class="form-control @error('description') is-invalid @enderror" id="description" name="description"
                                  rows="2" maxlength="500">{{ old('description') }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>
                    <div class="mb-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="is_active" id="is_active" value="1" {{ old('is_active', true) ? 'checked' : '' }}>
                            <label class="form-check-label" for="is_active">Catégorie active</label>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i> Enregistrer</button>
                        <a href="{{ route('categories.index') }}" class="btn btn-outline-secondary">Annuler</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
