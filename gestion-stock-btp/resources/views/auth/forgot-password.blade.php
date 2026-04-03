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
    <title>Mot de passe oublié - ESEBAT</title>
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
        .alert-danger, .alert-success { font-size: 13px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="auth-card">
        <div class="auth-header">
            @if ($loginLogo)
                <img src="{{ url($loginLogo) }}" alt="ESEBAT" style="max-height: 48px; margin-bottom: 0.5rem;">
            @endif
            <h1 class="h5 mb-0">Mot de passe oublié</h1>
            <p class="small mb-0 opacity-90">Indiquez votre email pour recevoir un lien de réinitialisation</p>
        </div>
        <div class="auth-body">
            @if (session('status'))
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>{{ session('status') }}
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

            <form method="POST" action="{{ route('password.email') }}">
                @csrf
                <div class="mb-3">
                    <label for="email" class="form-label">Adresse email</label>
                    <input type="email" name="email" id="email" class="form-control" value="{{ old('email') }}"
                           required autofocus autocomplete="email" placeholder="vous@exemple.com">
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-2">Envoyer le lien de réinitialisation</button>
            </form>
            <p class="text-center small text-muted mb-0">
                <a href="{{ route('login') }}">Retour à la connexion</a>
            </p>
        </div>
    </div>
</body>
</html>
