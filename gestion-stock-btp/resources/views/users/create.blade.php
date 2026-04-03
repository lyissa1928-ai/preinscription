@extends('layouts.app')

@section('title', 'Nouvel utilisateur - ESEBAT')
@section('page-title', 'Nouvel utilisateur')

@section('content')
<div class="card">
    <div class="card-header">Créer un compte utilisateur</div>
    <div class="card-body">
        <form action="{{ route('users.store') }}" method="POST">
            @csrf
            <div class="row g-3">
                <div class="col-md-6">
                    <label for="first_name" class="form-label">Prénom <span class="text-danger">*</span></label>
                    <input type="text" class="form-control @error('first_name') is-invalid @enderror" id="first_name" name="first_name" value="{{ old('first_name') }}" required>
                    @error('first_name')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="last_name" class="form-label">Nom <span class="text-danger">*</span></label>
                    <input type="text" class="form-control @error('last_name') is-invalid @enderror" id="last_name" name="last_name" value="{{ old('last_name') }}" required>
                    @error('last_name')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                    <input type="email" class="form-control @error('email') is-invalid @enderror" id="email" name="email" value="{{ old('email') }}" required>
                    @error('email')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="phone" class="form-label">Téléphone</label>
                    <input type="text" class="form-control @error('phone') is-invalid @enderror" id="phone" name="phone" value="{{ old('phone') }}" placeholder="+221 77 123 45 67">
                    @error('phone')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-12">
                    <label for="address" class="form-label">Adresse</label>
                    <textarea class="form-control @error('address') is-invalid @enderror" id="address" name="address" rows="2" placeholder="Adresse postale">{{ old('address') }}</textarea>
                    @error('address')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="password" class="form-label">Mot de passe <span class="text-danger">*</span></label>
                    <input type="password" class="form-control @error('password') is-invalid @enderror" id="password" name="password" required>
                    @error('password')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="password_confirmation" class="form-label">Confirmer le mot de passe</label>
                    <input type="password" class="form-control" id="password_confirmation" name="password_confirmation" required>
                </div>
                <div class="col-md-6">
                    <label for="campus_id" class="form-label">Campus d'affectation</label>
                    <select class="form-select @error('campus_id') is-invalid @enderror" id="campus_id" name="campus_id">
                        <option value="">— Aucun (admin / point focal) —</option>
                        @foreach ($campuses as $c)
                            <option value="{{ $c->id }}" {{ old('campus_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                        @endforeach
                    </select>
                    @error('campus_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    <small class="text-muted">Obligatoire pour tous les profils sauf Administrateur et Point focal logistique.</small>
                </div>
                <div class="col-md-6">
                    <label for="role" class="form-label">Profil / Rôle <span class="text-danger">*</span></label>
                    <select class="form-select @error('role') is-invalid @enderror" id="role" name="role" required>
                        @foreach ($roles as $r)
                            <option value="{{ $r->name }}" {{ old('role') == $r->name ? 'selected' : '' }}>
                                {{ \App\Http\Controllers\UserController::roleLabels()[$r->name] ?? $r->name }}
                            </option>
                        @endforeach
                    </select>
                    @error('role')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    <small class="text-muted">Le matricule (ex. STF001, PFE01) sera généré automatiquement à la création.</small>
                </div>
                <div class="col-12">
                    <div class="form-check">
                        <input type="hidden" name="is_active" value="0">
                        <input type="checkbox" class="form-check-input" id="is_active" name="is_active" value="1" {{ old('is_active', true) ? 'checked' : '' }}>
                        <label class="form-check-label" for="is_active">Compte actif</label>
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> Créer l'utilisateur</button>
                <a href="{{ route('users.index') }}" class="btn btn-outline-secondary">Annuler</a>
            </div>
        </form>
    </div>
</div>
@endsection
