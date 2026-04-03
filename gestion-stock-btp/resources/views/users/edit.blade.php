@extends('layouts.app')

@section('title', 'Modifier l\'utilisateur - ESEBAT')
@section('page-title', 'Modifier l\'utilisateur')

@section('content')
<div class="card">
    <div class="card-header">Modifier {{ $user->display_name }}</div>
    <div class="card-body">
        <form action="{{ route('users.update', $user) }}" method="POST" enctype="multipart/form-data">
            @csrf
            @method('PUT')
            <div class="row g-3">
                <div class="col-md-6">
                    <label for="first_name" class="form-label">Prénom <span class="text-danger">*</span></label>
                    <input type="text" class="form-control @error('first_name') is-invalid @enderror" id="first_name" name="first_name" value="{{ old('first_name', $user->first_name ?? explode(' ', $user->name, 2)[0] ?? '') }}" required>
                    @error('first_name')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="last_name" class="form-label">Nom <span class="text-danger">*</span></label>
                    <input type="text" class="form-control @error('last_name') is-invalid @enderror" id="last_name" name="last_name" value="{{ old('last_name', $user->last_name ?? explode(' ', $user->name, 2)[1] ?? '') }}" required>
                    @error('last_name')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                    <input type="email" class="form-control @error('email') is-invalid @enderror" id="email" name="email" value="{{ old('email', $user->email) }}" required>
                    @error('email')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="phone" class="form-label">Téléphone</label>
                    <input type="text" class="form-control @error('phone') is-invalid @enderror" id="phone" name="phone" value="{{ old('phone', $user->phone) }}">
                    @error('phone')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-12">
                    <label for="address" class="form-label">Adresse</label>
                    <textarea class="form-control @error('address') is-invalid @enderror" id="address" name="address" rows="2">{{ old('address', $user->address) }}</textarea>
                    @error('address')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="profile_photo" class="form-label">Photo de profil</label>
                    @if ($user->profile_photo_url)
                        <div class="mb-2"><img src="{{ asset($user->profile_photo_url) }}" alt="Photo" class="rounded" style="max-height: 80px;"></div>
                    @endif
                    <input type="file" class="form-control @error('profile_photo') is-invalid @enderror" id="profile_photo" name="profile_photo" accept="image/jpeg,image/png,image/jpg,image/gif">
                    <small class="text-muted">JPEG, PNG ou GIF, max 2 Mo. Laisser vide pour conserver l'actuelle.</small>
                    @error('profile_photo')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="password" class="form-label">Nouveau mot de passe</label>
                    <input type="password" class="form-control @error('password') is-invalid @enderror" id="password" name="password">
                    <small class="text-muted">Laisser vide pour ne pas modifier.</small>
                    @error('password')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="password_confirmation" class="form-label">Confirmer le mot de passe</label>
                    <input type="password" class="form-control" id="password_confirmation" name="password_confirmation">
                </div>
                <div class="col-md-6">
                    <label for="campus_id" class="form-label">Campus d'affectation</label>
                    <select class="form-select @error('campus_id') is-invalid @enderror" id="campus_id" name="campus_id">
                        <option value="">— Aucun (admin / point focal) —</option>
                        @foreach ($campuses as $c)
                            <option value="{{ $c->id }}" {{ old('campus_id', $user->campus_id) == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                        @endforeach
                    </select>
                    @error('campus_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-md-6">
                    <label for="role" class="form-label">Profil / Rôle <span class="text-danger">*</span></label>
                    @php $currentRole = $user->roles->first()?->name; @endphp
                    <select class="form-select @error('role') is-invalid @enderror" id="role" name="role" required>
                        @foreach ($roles as $r)
                            <option value="{{ $r->name }}" {{ old('role', $currentRole) == $r->name ? 'selected' : '' }}>
                                {{ \App\Http\Controllers\UserController::roleLabels()[$r->name] ?? $r->name }}
                            </option>
                        @endforeach
                    </select>
                    @error('role')<div class="invalid-feedback">{{ $message }}</div>@enderror
                </div>
                <div class="col-12">
                    <div class="form-check">
                        <input type="hidden" name="is_active" value="0">
                        <input type="checkbox" class="form-check-input" id="is_active" name="is_active" value="1" {{ old('is_active', $user->is_active) ? 'checked' : '' }}>
                        <label class="form-check-label" for="is_active">Compte actif</label>
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> Enregistrer</button>
                <a href="{{ route('users.show', $user) }}" class="btn btn-outline-secondary">Voir le profil</a>
                <a href="{{ route('users.index') }}" class="btn btn-outline-secondary">Annuler</a>
            </div>
        </form>
    </div>
</div>
@endsection
