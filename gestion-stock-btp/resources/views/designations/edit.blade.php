@extends('layouts.app')

@section('title', 'Modifier la désignation - ESEBAT')
@section('page-title', 'Modifier la désignation')

@section('content')
<div class="row justify-content-center">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">Modifier « {{ $item->name }} »</div>
            <div class="card-body">
                <form action="{{ route('designations.update', $item) }}" method="POST" enctype="multipart/form-data">
                    @csrf
                    @if (request('return_to'))
                        <input type="hidden" name="return_to" value="{{ request('return_to') }}">
                    @endif

                    <div class="mb-3">
                        <label for="name" class="form-label">Nom du matériel <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('name') is-invalid @enderror" id="name" name="name"
                               value="{{ old('name', $item->name) }}" required maxlength="150">
                        @error('name')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="code" class="form-label">Code <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('code') is-invalid @enderror" id="code" name="code"
                               value="{{ old('code', $item->code) }}" required maxlength="30">
                        @error('code')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description</label>
                        <textarea class="form-control @error('description') is-invalid @enderror" id="description" name="description"
                                  rows="2" maxlength="500">{{ old('description', $item->description) }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="image" class="form-label">Image du matériel (catalogue)</label>
                        @if ($item->image_path)
                            <p class="small mb-1">Image actuelle : @if(str_starts_with($item->image_path, 'http'))
                                <a href="{{ $item->image_path }}" target="_blank" rel="noopener">Lien</a>
                            @else
                                <img src="{{ asset('storage/' . ltrim($item->image_path, '/')) }}" alt="" class="rounded" style="max-height: 50px;" onerror="this.style.display='none'">
                            @endif
                            </p>
                        @endif
                        <input type="file" class="form-control @error('image') is-invalid @enderror" id="image" name="image"
                               accept="image/jpeg,image/png,image/gif,image/webp">
                        <small class="text-muted">Optionnel. Remplacer par un upload (JPG, PNG, GIF, WebP, max 2 Mo) ou modifier l’URL ci-dessous.</small>
                        @error('image')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                        <input type="text" class="form-control mt-2 @error('image_path') is-invalid @enderror" id="image_path" name="image_path"
                               value="{{ old('image_path', $item->image_path) }}" maxlength="500" placeholder="Ou indiquer une URL">
                        @error('image_path')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="category_id" class="form-label">Catégorie <span class="text-danger">*</span></label>
                            <select class="form-select @error('category_id') is-invalid @enderror" id="category_id" name="category_id" required>
                                @foreach ($categories as $c)
                                    <option value="{{ $c->id }}" {{ old('category_id', $item->category_id) == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                                @endforeach
                            </select>
                            @error('category_id')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="unit" class="form-label">Unité <span class="text-danger">*</span></label>
                            <input type="text" class="form-control @error('unit') is-invalid @enderror" id="unit" name="unit"
                                   value="{{ old('unit', $item->unit) }}" required maxlength="20">
                            @error('unit')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="unit_cost" class="form-label">Prix unitaire (FCFA) <span class="text-danger">*</span></label>
                        <input type="number" class="form-control @error('unit_cost') is-invalid @enderror" id="unit_cost" name="unit_cost"
                               value="{{ old('unit_cost', $item->unit_cost) }}" required min="0" step="0.01">
                        @error('unit_cost')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="is_active" id="is_active" value="1" {{ old('is_active', $item->is_active) ? 'checked' : '' }}>
                            <label class="form-check-label" for="is_active">Désignation active (visible dans les listes)</label>
                        </div>
                    </div>

                    <div class="d-flex gap-2 flex-wrap align-items-center">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-lg me-1"></i> Enregistrer
                        </button>
                        <a href="{{ route('designations.index') }}" class="btn btn-outline-secondary">Annuler</a>
                        <form action="{{ route('designations.destroy', $item) }}" method="POST" class="ms-auto" onsubmit="return confirm('Supprimer cette désignation ?');">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn btn-outline-danger">Supprimer</button>
                        </form>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
