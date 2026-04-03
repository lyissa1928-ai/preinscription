@extends('layouts.app')

@section('title', 'Modifier l\'article - ' . ($materialRequest->request_number ?? $requestItem->materialRequest->request_number ?? '') . ' - ESEBAT')
@section('page-title', 'Modifier l\'article')

@section('content')
@php
    $materialRequest = $materialRequest ?? $requestItem->materialRequest;
@endphp
<div class="row mb-3">
    <div class="col-12">
        <p class="text-muted mb-0">
            Demande <strong>{{ $materialRequest->request_number }}</strong>
            — Article : <strong>{{ $requestItem->item->description ?? $requestItem->item->name }}</strong>
            — <a href="{{ route('material-requests.show', $materialRequest) }}">Retour à la demande</a>
        </p>
    </div>
</div>

<div class="card">
    <div class="card-header">Modifier la quantité et les notes</div>
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

        <form action="{{ route('request-items.update', $requestItem) }}" method="POST">
            @csrf
            @method('PUT')
            <div class="row g-3">
                <div class="col-md-6">
                    <label for="requested_quantity" class="form-label">Quantité demandée <span class="text-danger">*</span></label>
                    <input type="number" class="form-control @error('requested_quantity') is-invalid @enderror"
                           id="requested_quantity" name="requested_quantity" min="1" max="99999"
                           value="{{ old('requested_quantity', $requestItem->requested_quantity) }}" required>
                    @error('requested_quantity')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="unit_price" class="form-label">Prix unitaire prévu (optionnel)</label>
                    <input type="number" step="0.01" min="0" class="form-control @error('unit_price') is-invalid @enderror"
                           id="unit_price" name="unit_price" value="{{ old('unit_price', $requestItem->unit_price) }}" placeholder="0.00">
                    @error('unit_price')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-12">
                    <label for="notes" class="form-label">Notes (optionnel)</label>
                    <textarea class="form-control @error('notes') is-invalid @enderror" id="notes" name="notes" rows="2" maxlength="500">{{ old('notes', $requestItem->notes) }}</textarea>
                    @error('notes')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
            </div>
            <div class="mt-4">
                <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> Enregistrer</button>
                <a href="{{ route('material-requests.show', $materialRequest) }}" class="btn btn-outline-secondary">Annuler</a>
            </div>
        </form>
    </div>
</div>
@endsection
