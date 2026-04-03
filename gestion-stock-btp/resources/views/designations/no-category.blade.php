@extends('layouts.app')

@section('title', 'Référentiel des désignations - ESEBAT')
@section('page-title', 'Référentiel des désignations')

@section('content')
<div class="row justify-content-center">
    <div class="col-lg-6">
        @if (session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif
        <div class="card border-warning mb-4">
            <div class="card-body text-center py-3">
                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2.5rem;"></i>
                <h5 class="mt-2 mb-1">Aucune catégorie disponible</h5>
                <p class="text-muted small mb-0">Pour ajouter une désignation, une catégorie (type consommable) est requise. Créez-en une ci-dessous.</p>
            </div>
        </div>
        <div class="card">
            <div class="card-header">Créer une catégorie consommable</div>
            <div class="card-body">
                <form action="{{ route('designations.store-category') }}" method="POST">
                    @csrf
                    <div class="mb-3">
                        <label for="name" class="form-label">Nom de la catégorie <span class="text-danger">*</span></label>
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
                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i> Créer la catégorie</button>
                        <a href="{{ route('designations.index') }}" class="btn btn-outline-secondary">Retour à la liste</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
