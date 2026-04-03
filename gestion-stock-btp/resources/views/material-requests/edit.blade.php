@extends('layouts.app')

@section('title', 'Modifier la demande ' . $materialRequest->request_number)
@section('page-title', 'Modifier la demande ' . $materialRequest->request_number)

@section('content')
<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">Détails de la demande</div>
            <div class="card-body">
                @if ($errors->any())
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Erreur :</strong> Veuillez corriger les champs ci-dessous.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                <form action="{{ route('material-requests.update', $materialRequest) }}" method="POST">
                    @csrf
                    @method('PUT')

                    <div class="mb-3">
                        <label for="campus_id" class="form-label">Campus <span class="text-danger">*</span></label>
                        <select class="form-select @error('campus_id') is-invalid @enderror" id="campus_id" name="campus_id" required>
                            <option value="">— Choisir un campus —</option>
                            @foreach ($campuses as $campus)
                                <option value="{{ $campus->id }}" 
                                    {{ old('campus_id', $materialRequest->campus_id) == $campus->id ? 'selected' : '' }}>
                                    {{ $campus->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('campus_id')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="needed_by_date" class="form-label">Date souhaitée <span class="text-danger">*</span></label>
                        <input type="date" class="form-control @error('needed_by_date') is-invalid @enderror" 
                               id="needed_by_date" name="needed_by_date" 
                               value="{{ old('needed_by_date', $materialRequest->needed_by_date?->format('Y-m-d')) }}" required>
                        @error('needed_by_date')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes</label>
                        <textarea class="form-control @error('notes') is-invalid @enderror" 
                                  id="notes" name="notes" rows="4">{{ old('notes', $materialRequest->notes) }}</textarea>
                        @error('notes')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-circle"></i> Enregistrer
                        </button>
                        <a href="{{ route('material-requests.show', $materialRequest) }}" class="btn btn-outline-secondary">
                            <i class="bi bi-x-circle"></i> Annuler
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Sidebar: Items -->
    <div class="col-lg-4">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Articles ({{ $materialRequest->requestItems->count() }})</span>
                <a href="{{ route('material-requests.request-items.create', $materialRequest) }}" class="btn btn-sm btn-success">
                    <i class="bi bi-plus"></i>
                </a>
            </div>
            <div class="card-body">
                @forelse ($materialRequest->requestItems as $item)
                    <div class="mb-3 p-2 border rounded">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <strong style="font-size: 13px;">{{ $item->display_label }}</strong>
                                <div style="font-size: 12px; color: #666;">
                                    {{ $item->requested_quantity }} {{ $item->item?->unit_of_measure ?? 'unité(s)' }}
                                </div>
                                @if ($item->status === 'pending')
                                    <span class="badge bg-secondary" style="font-size: 11px;">En attente</span>
                                @elseif ($item->status === 'aggregated')
                                    <span class="badge bg-info" style="font-size: 11px;">Regroupé</span>
                                @endif
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" 
                                        data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <a class="dropdown-item" 
                                           href="{{ route('request-items.edit', [$materialRequest, $item]) }}">
                                            <i class="bi bi-pencil"></i> Modifier
                                        </a>
                                    </li>
                                    <li>
                                        <form action="{{ route('request-items.destroy', [$materialRequest, $item]) }}" 
                                              method="POST" style="display: inline;">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="dropdown-item text-danger"
                                                    onclick="return confirm('Retirer cet article ?')">
                                                <i class="bi bi-trash"></i> Retirer
                                            </button>
                                        </form>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                @empty
                    <p class="text-muted text-center py-3">Aucun article ajouté</p>
                @endforelse
            </div>
        </div>
    </div>
</div>
@endsection
