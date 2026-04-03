@extends('layouts.app')

@section('title', 'Paramètres du compte - ESEBAT')
@section('page-title', 'Paramètres')
@section('page-subtitle', 'Profil et paramètres personnels')

@section('content')
@if (session('success'))
    <div class="alert alert-success alert-dismissible fade show">
        <i class="bi bi-check-circle me-2"></i>{{ session('success') }}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
    </div>
@endif

<div class="row g-4">
    {{-- Mon profil : consultation + modification des champs autorisés --}}
    <div class="col-lg-7">
        <div class="card">
            <div class="card-header">
                <i class="bi bi-person-circle me-2"></i> Mon profil
            </div>
            <div class="card-body">
                <form method="POST" action="{{ route('account.update') }}" enctype="multipart/form-data">
                    @csrf
                    @method('PUT')
                    <div class="d-flex gap-4 mb-4">
                        @if ($user->profile_photo_url)
                            <img src="{{ asset($user->profile_photo_url) }}" alt="Photo" class="rounded" style="width: 96px; height: 96px; object-fit: cover;">
                        @else
                            <div class="rounded bg-light d-flex align-items-center justify-content-center" style="width: 96px; height: 96px;"><i class="bi bi-person fs-1 text-muted"></i></div>
                        @endif
                        <div class="flex-grow-1">
                            <label for="profile_photo" class="form-label small">Photo de profil</label>
                            <input type="file" class="form-control form-control-sm @error('profile_photo') is-invalid @enderror" id="profile_photo" name="profile_photo" accept="image/jpeg,image/png,image/jpg,image/gif">
                            <small class="text-muted">JPEG, PNG ou GIF, max 2 Mo.</small>
                            @error('profile_photo')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                    </div>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="first_name" class="form-label">Prénom <span class="text-danger">*</span></label>
                            <input type="text" class="form-control @error('first_name') is-invalid @enderror" id="first_name" name="first_name" value="{{ old('first_name', $user->first_name) }}" required>
                            @error('first_name')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-md-6">
                            <label for="last_name" class="form-label">Nom <span class="text-danger">*</span></label>
                            <input type="text" class="form-control @error('last_name') is-invalid @enderror" id="last_name" name="last_name" value="{{ old('last_name', $user->last_name) }}" required>
                            @error('last_name')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-12">
                            <label for="phone" class="form-label">Téléphone</label>
                            <input type="text" class="form-control @error('phone') is-invalid @enderror" id="phone" name="phone" value="{{ old('phone', $user->phone) }}" placeholder="+221 77 123 45 67">
                            @error('phone')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-12">
                            <label for="address" class="form-label">Adresse</label>
                            <textarea class="form-control @error('address') is-invalid @enderror" id="address" name="address" rows="2" placeholder="Adresse postale">{{ old('address', $user->address) }}</textarea>
                            @error('address')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                    </div>
                    <hr class="my-4">
                    <p class="text-muted small mb-2">Informations non modifiables depuis cette page :</p>
                    <table class="table table-sm table-borderless mb-0">
                        <tr><th class="text-muted" style="width: 38%;">Email</th><td>{{ $user->email }}</td></tr>
                        <tr><th class="text-muted">Matricule</th><td>{{ $user->matricule ?? '—' }}</td></tr>
                        <tr><th class="text-muted">Campus</th><td>{{ $user->campus->name ?? '—' }}</td></tr>
                        <tr><th class="text-muted">Profil</th><td><span class="badge bg-secondary">{{ \App\Http\Controllers\UserController::roleLabels()[$user->roles->first()?->name] ?? $user->roles->first()?->name }}</span></td></tr>
                        <tr><th class="text-muted">Statut</th><td>@if ($user->is_active)<span class="badge bg-success">Actif</span>@else<span class="badge bg-secondary">Inactif</span>@endif</td></tr>
                    </table>
                    @if (auth()->user()->hasRole('super_admin'))
                        <p class="small mt-3 mb-0"><a href="{{ route('users.edit', $user) }}"><i class="bi bi-pencil me-1"></i> Modifier le compte complet (admin)</a></p>
                    @endif
                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i> Enregistrer les modifications</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    {{-- Colonne droite : mot de passe + lien paramètres app (super_admin) --}}
    <div class="col-lg-5">
        <div class="card" id="mot-de-passe">
            <div class="card-header">
                <i class="bi bi-key me-2"></i> Changer le mot de passe
            </div>
            <div class="card-body">
                @if ($errors->has('current_password') || $errors->has('password'))
                    <div class="alert alert-danger">
                        <ul class="mb-0 list-unstyled">
                            @foreach ($errors->get('current_password') as $e)<li>{{ $e }}</li>@endforeach
                            @foreach ($errors->get('password') as $e)<li>{{ $e }}</li>@endforeach
                        </ul>
                    </div>
                @endif
                <p class="text-muted small mb-3">Saisissez votre mot de passe actuel puis le nouveau (avec confirmation). Minimum 8 caractères.</p>
                <form method="POST" action="{{ route('password.update') }}">
                    @csrf
                    @method('PUT')
                    <div class="mb-3">
                        <label for="current_password" class="form-label">Mot de passe actuel</label>
                        <input type="password" name="current_password" id="current_password" class="form-control" required autocomplete="current-password" placeholder="Votre mot de passe actuel">
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Nouveau mot de passe</label>
                        <input type="password" name="password" id="password" class="form-control" required autocomplete="new-password" placeholder="Minimum 8 caractères">
                    </div>
                    <div class="mb-4">
                        <label for="password_confirmation" class="form-label">Confirmer le nouveau mot de passe</label>
                        <input type="password" name="password_confirmation" id="password_confirmation" class="form-control" required autocomplete="new-password" placeholder="Identique au nouveau">
                    </div>
                    <button type="submit" class="btn btn-outline-primary">
                        <i class="bi bi-key me-1"></i> Enregistrer le nouveau mot de passe
                    </button>
                </form>
            </div>
        </div>

        @if (auth()->user()->hasRole('super_admin'))
        <div class="card mt-4">
            <div class="card-header">
                <i class="bi bi-gear-wide-connected me-2"></i> Paramètres de l'application
            </div>
            <div class="card-body">
                <p class="small text-muted mb-2">Thème, logo, favicon de la plateforme.</p>
                <a href="{{ route('settings.index') }}" class="btn btn-outline-secondary btn-sm">
                    <i class="bi bi-gear me-1"></i> Ouvrir les paramètres de l'application
                </a>
            </div>
        </div>
        @endif
    </div>
</div>
@endsection
