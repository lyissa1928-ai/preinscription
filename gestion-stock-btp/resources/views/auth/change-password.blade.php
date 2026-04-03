@extends('layouts.app')

@section('title', 'Changer mon mot de passe - ESEBAT')
@section('page-title', 'Changer mon mot de passe')

@section('content')
<div class="row justify-content-center">
    <div class="col-md-8 col-lg-6">
        <div class="card">
            <div class="card-header">
                <i class="bi bi-key me-2"></i> Modifier votre mot de passe
            </div>
            <div class="card-body">
                @if (session('success'))
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle me-2"></i>{{ session('success') }}
                    </div>
                @endif
                @if ($errors->any())
                    <div class="alert alert-danger">
                        <ul class="mb-0 list-unstyled">
                            @foreach ($errors->all() as $error)
                                <li>{{ $error }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endif

                <p class="text-muted small mb-4">Saisissez votre mot de passe actuel puis le nouveau mot de passe (avec confirmation). Le nouveau mot de passe doit respecter les règles de sécurité.</p>

                <form method="POST" action="{{ route('password.update') }}">
                    @csrf
                    @method('PUT')
                    <div class="mb-3">
                        <label for="current_password" class="form-label">Mot de passe actuel</label>
                        <input type="password" name="current_password" id="current_password" class="form-control" required autocomplete="current-password"
                               placeholder="Votre mot de passe actuel">
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Nouveau mot de passe</label>
                        <input type="password" name="password" id="password" class="form-control" required autocomplete="new-password"
                               placeholder="Minimum 8 caractères">
                    </div>
                    <div class="mb-4">
                        <label for="password_confirmation" class="form-label">Confirmer le nouveau mot de passe</label>
                        <input type="password" name="password_confirmation" id="password_confirmation" class="form-control" required autocomplete="new-password"
                               placeholder="Identique au nouveau mot de passe">
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-check-lg me-1"></i> Enregistrer le nouveau mot de passe
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
