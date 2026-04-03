@extends('layouts.app')

@section('title', 'Créer un ticket de maintenance')
@section('page-title', 'Nouveau ticket de maintenance')

@section('content')
<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">Nouveau ticket de maintenance</div>
            <div class="card-body">
                @if ($errors->any())
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Erreur :</strong> Veuillez corriger les champs ci-dessous.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                <form action="{{ route('maintenance-tickets.store') }}" method="POST">
                    @csrf

                    <div class="mb-3">
                        <label for="asset_id" class="form-label">Asset <span class="text-danger">*</span></label>
                        <select class="form-select @error('asset_id') is-invalid @enderror" 
                                id="asset_id" name="asset_id" required>
                            <option value="">— Choisir un équipement —</option>
                            @foreach ($assets as $asset)
                                <option value="{{ $asset->id }}" {{ old('asset_id') == $asset->id ? 'selected' : '' }}>
                                    {{ $asset->serial_number }} - {{ $asset->description }}
                                </option>
                            @endforeach
                        </select>
                        @error('asset_id')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="title" class="form-label">Titre <span class="text-danger">*</span></label>
                        <input type="text" class="form-control @error('title') is-invalid @enderror" 
                               id="title" name="title" 
                               value="{{ old('title') }}" placeholder="ex. Remplacer l'écran LCD" required>
                        @error('title')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description <span class="text-danger">*</span></label>
                        <textarea class="form-control @error('description') is-invalid @enderror" 
                                  id="description" name="description" rows="4" required>{{ old('description') }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="priority" class="form-label">Priorité <span class="text-danger">*</span></label>
                        <select class="form-select @error('priority') is-invalid @enderror" 
                                id="priority" name="priority" required>
                            <option value="low" {{ old('priority') === 'low' ? 'selected' : '' }}>Basse</option>
                            <option value="medium" {{ old('priority') === 'medium' ? 'selected' : '' }}>Moyenne</option>
                            <option value="high" {{ old('priority') === 'high' ? 'selected' : '' }}>Haute</option>
                            <option value="urgent" {{ old('priority') === 'urgent' ? 'selected' : '' }}>Urgente</option>
                        </select>
                        @error('priority')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="estimated_hours" class="form-label">Heures estimées</label>
                        <input type="number" class="form-control @error('estimated_hours') is-invalid @enderror" 
                               id="estimated_hours" name="estimated_hours" 
                               value="{{ old('estimated_hours') }}" step="0.5" min="0">
                        @error('estimated_hours')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-circle"></i> Créer le ticket
                        </button>
                        <a href="{{ route('maintenance-tickets.index') }}" class="btn btn-outline-secondary">
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
                    <h6>Étapes de création</h6>
                    <ol style="padding-left: 20px;">
                        <li>Choisir l'équipement à maintenir</li>
                        <li>Saisir un titre clair</li>
                        <li>Décrire le problème</li>
                        <li>Choisir la priorité</li>
                        <li>Indiquer les heures estimées si connues</li>
                        <li>Envoyer le ticket</li>
                    </ol>

                    <hr>

                    <h6>Niveaux de priorité</h6>
                    <ul style="padding-left: 20px;">
                        <li><strong>Basse :</strong> Peut être planifié</li>
                        <li><strong>Moyenne :</strong> À planifier bientôt</li>
                        <li><strong>Haute :</strong> Urgent</li>
                        <li><strong>Urgente :</strong> À traiter immédiatement</li>
                    </ul>

                    <hr>

                    <div class="alert alert-info" style="font-size: 12px;">
                        <strong>Workflow :</strong> Ouvert → En cours → Résolu → Fermé
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
