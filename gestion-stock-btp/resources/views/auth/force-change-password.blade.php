@php
    $loginLogo = null;
    if (class_exists(\App\Models\Setting::class)) {
        $loginLogo = \App\Models\Setting::resolveLogoUrl();
    }
    if (!$loginLogo && file_exists(public_path('logo.png'))) { $loginLogo = asset('logo.png'); }
    if (!$loginLogo && file_exists(public_path('images/logo-esebat.png'))) { $loginLogo = asset('images/logo-esebat.png'); }
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Changer votre mot de passe - ESEBAT</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body { font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f3f4f6; padding: 2rem; }
        .auth-card { max-width: 440px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; background: #fff; }
        .auth-header { background: linear-gradient(160deg, #EA580C 0%, #C2410C 100%); color: #fff; padding: 1.5rem; text-align: center; }
        .auth-body { padding: 2rem; }
        .form-control:focus { border-color: #EA580C; box-shadow: 0 0 0 0.2rem rgba(234, 88, 12, 0.25); }
        .btn-primary { background: #EA580C; border-color: #EA580C; }
        .btn-primary:hover { background: #C2410C; border-color: #C2410C; }
        .alert-danger { font-size: 13px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="auth-card">
        <div class="auth-header">
            @if ($loginLogo)
                <img src="{{ url($loginLogo) }}" alt="ESEBAT" style="max-height: 48px; margin-bottom: 0.5rem;">
            @endif
            <h1 class="h5 mb-0">Changement obligatoire du mot de passe</h1>
            <p class="small mb-0 opacity-90">Première connexion — définissez un mot de passe personnel</p>
        </div>
        <div class="auth-body">
            @if ($errors->any())
                <div class="alert alert-danger">
                    <ul class="mb-0 list-unstyled">
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <p class="text-muted small mb-3">Vous devez définir un nouveau mot de passe pour accéder à la plateforme. Ne réutilisez pas un mot de passe déjà utilisé ailleurs.</p>

            <form method="POST" action="{{ route('password.force-change') }}">
                @csrf
                <div class="mb-3">
                    <label for="password" class="form-label">Nouveau mot de passe</label>
                    <input type="password" name="password" id="password" class="form-control" required autofocus
                           autocomplete="new-password" minlength="8"
                           placeholder="Minimum 8 caractères">
                </div>
                <div class="mb-4">
                    <label for="password_confirmation" class="form-label">Confirmer le mot de passe</label>
                    <input type="password" name="password_confirmation" id="password_confirmation" class="form-control" required
                           autocomplete="new-password" placeholder="Identique au mot de passe ci-dessus">
                </div>
                <button type="submit" class="btn btn-primary w-100">Définir mon mot de passe</button>
            </form>
        </div>
    </div>
</body>
</html>
