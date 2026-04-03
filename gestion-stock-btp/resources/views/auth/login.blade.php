@php
    $loginFavicon = asset('favicon.svg');
    if (class_exists(\App\Models\Setting::class)) {
        $loginFavicon = \App\Models\Setting::resolveFaviconUrl();
    }
    $loginLogo = null;
    if (class_exists(\App\Models\Setting::class)) {
        $loginLogo = \App\Models\Setting::resolveLogoUrl();
    }
    if (!$loginLogo && file_exists(public_path('logo.png'))) { $loginLogo = asset('logo.png'); }
    if (!$loginLogo && file_exists(public_path('logo.svg'))) { $loginLogo = asset('logo.svg'); }
    if (!$loginLogo && file_exists(public_path('images/logo-esebat.png'))) { $loginLogo = asset('images/logo-esebat.png'); }
    if (!$loginLogo && env('APP_LOGO_URL')) { $loginLogo = env('APP_LOGO_URL'); }

    $loginBgPath = public_path('background-login-page.jpg');
    $loginBgUrl = asset('background-login-page.jpg');
    $loginBgV = (file_exists($loginBgPath) && is_readable($loginBgPath)) ? filemtime($loginBgPath) : 1;
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="robots" content="noindex, nofollow">
    <title>Connexion - ESEBAT</title>
    <link rel="icon" href="{{ url($loginFavicon) }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --esebat-orange: #F97316;
            --esebat-orange-deep: #EA580C;
            --esebat-orange-dark: #C2410C;
            --input-bg: #F8F8FA;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            min-height: 100vh;
            background-image: url('{{ $loginBgUrl }}?v={{ $loginBgV }}');
            background-color: transparent;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            color: #1F2937;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            overflow-x: hidden;
        }

        /* Carte flottante centrée (template) */
        .login-card {
            width: 100%;
            max-width: 960px;
            min-height: 560px;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
            display: flex;
            background: #fff;
        }

        /* ========== Panneau gauche ~45% – Branding + sphères 3D ========== */
        .login-panel-left {
            width: 45%;
            min-height: 560px;
            background: linear-gradient(160deg, #EA580C 0%, #C2410C 100%);
            display: flex;
            align-items: center;
            padding: 2.5rem 2rem 2.5rem 2.5rem;
            position: relative;
            overflow: hidden;
        }

        .login-curve {
            position: absolute;
            right: 0;
            top: 0;
            width: 80px;
            height: 100%;
            pointer-events: none;
            z-index: 2;
        }
        .login-curve svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        /* Sphères 3D (effet ombre / dégradé) */
        .login-sphere {
            position: absolute;
            border-radius: 50%;
            box-shadow: inset -15px -15px 35px rgba(0,0,0,0.2), inset 10px 10px 25px rgba(255,255,255,0.15);
        }
        .login-sphere-1 {
            width: 280px;
            height: 280px;
            top: -8%;
            right: -12%;
            background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), transparent 45%),
                        radial-gradient(circle at 65% 65%, rgba(0,0,0,0.15), transparent 45%),
                        linear-gradient(145deg, #F97316, #C2410C);
        }
        .login-sphere-2 {
            width: 140px;
            height: 140px;
            bottom: 18%;
            left: -5%;
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 45%),
                        radial-gradient(circle at 70% 70%, rgba(0,0,0,0.12), transparent 45%),
                        linear-gradient(145deg, #EA580C, #C2410C);
        }
        .login-sphere-3 {
            width: 100px;
            height: 100px;
            bottom: 12%;
            left: 22%;
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 45%),
                        radial-gradient(circle at 70% 70%, rgba(0,0,0,0.1), transparent 45%),
                        #EA580C;
        }

        .login-brand-inner {
            position: relative;
            z-index: 2;
            max-width: 320px;
        }
        .login-brand-welcome {
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.12em;
            color: rgba(255,255,255,0.95);
            margin-bottom: 0.5rem;
        }
        .login-brand-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #FFFFFF;
            letter-spacing: -0.02em;
            line-height: 1.3;
            margin-bottom: 1rem;
        }
        .login-brand-desc {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.55;
            font-weight: 400;
        }

        /* ========== Panneau droit ~55% – Formulaire ========== */
        .login-panel-right {
            width: 55%;
            min-height: 560px;
            background: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2.5rem 2.5rem 2.5rem 3rem;
            position: relative;
            overflow: hidden;
        }

        /* Courbe blanche qui mord sur le panneau gauche (séparation organique) */
        .login-panel-right::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            width: 70px;
            height: 100%;
            background: #FFFFFF;
            clip-path: ellipse(70% 55% at 100% 50%);
            pointer-events: none;
        }

        /* Cercle décoratif en bas à droite (comme sur le template) */
        .login-panel-right::after {
            content: '';
            position: absolute;
            right: -40px;
            bottom: -40px;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: linear-gradient(145deg, #EA580C, #C2410C);
            opacity: 0.9;
            pointer-events: none;
        }

        .login-form-wrap {
            width: 100%;
            max-width: 380px;
            margin-left: -10px;
            position: relative;
            z-index: 1;
        }

        .login-form-title {
            font-size: 28px;
            font-weight: 600;
            color: #1F2937;
            letter-spacing: -0.02em;
            margin-bottom: 0.35rem;
        }
        .login-form-sub {
            font-size: 13px;
            color: #6B7280;
            margin-bottom: 1.75rem;
        }

        .form-group-login { margin-bottom: 1.15rem; }
        .form-group-login label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 6px;
        }
        .input-wrap {
            position: relative;
        }
        .form-group-login .form-control {
            width: 100%;
            padding: 12px 14px 12px 44px;
            font-size: 15px;
            line-height: 1.4;
            color: #1F2937;
            background: var(--input-bg);
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            transition: border-color 0.2s, box-shadow 0.2s;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
        }
        .form-group-login .input-wrap-password .form-control {
            padding-right: 52px;
        }
        .form-group-login .form-control::placeholder {
            color: #9CA3AF;
        }
        .form-group-login .form-control:focus {
            outline: none;
            border-color: var(--esebat-orange);
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.04), 0 0 0 3px rgba(249, 115, 22, 0.15);
        }
        .input-wrap .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #9CA3AF;
            font-size: 1.05rem;
            pointer-events: none;
        }
        .input-wrap .form-control:focus ~ .input-icon {
            color: var(--esebat-orange);
        }
        .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #6B7280;
            padding: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        }
        .password-toggle:hover { color: #1F2937; }

        .form-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.35rem;
            flex-wrap: wrap;
            gap: 8px;
        }
        .form-options .form-check-label {
            font-size: 13px;
            color: #374151;
        }
        .form-check-input:checked {
            background-color: var(--esebat-orange);
            border-color: var(--esebat-orange);
        }
        .forgot-link {
            font-size: 13px;
            color: #6B7280;
            text-decoration: none;
        }
        .forgot-link:hover { color: var(--esebat-orange); text-decoration: underline; }

        .btn-login {
            width: 100%;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            color: #FFFFFF;
            background: var(--esebat-orange-deep);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.35);
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .btn-login:hover {
            background: #C2410C;
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4);
        }
        .btn-login-secondary {
            width: 100%;
            margin-top: 10px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            background: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
        }
        .btn-login-secondary:hover {
            background: #F9FAFB;
            border-color: #D1D5DB;
        }

        .login-form-footer {
            margin-top: 1.5rem;
            text-align: center;
            font-size: 13px;
            color: #6B7280;
        }
        .login-form-footer a {
            color: var(--esebat-orange);
            font-weight: 500;
            text-decoration: none;
        }
        .login-form-footer a:hover { text-decoration: underline; }

        .alert-danger {
            font-size: 13px;
            border-radius: 8px;
            border: none;
            background: #FEF2F2;
            color: #991B1B;
            margin-bottom: 1rem;
            padding: 10px 14px;
        }

        @media (max-width: 991px) {
            body { padding: 1rem; }
            .login-card { flex-direction: column; max-width: 440px; min-height: auto; }
            .login-panel-left {
                width: 100%;
                min-height: 220px;
                padding: 2rem;
            }
            .login-sphere-1 { width: 160px; height: 160px; top: -20%; right: -15%; }
            .login-sphere-2, .login-sphere-3 { display: none; }
            .login-panel-left::after { display: none; }
            .login-curve { display: none; }
            .login-panel-right {
                width: 100%;
                min-height: auto;
                padding: 2rem;
            }
            .login-panel-right::before { display: none; }
            .login-panel-right::after { width: 120px; height: 120px; right: -30px; bottom: -30px; }
            .login-form-wrap { margin-left: 0; }
        }
    </style>
</head>
<body>
    <div class="login-card">
        <section class="login-panel-left" aria-label="ESEBAT">
            <!-- Sphères 3D -->
            <div class="login-sphere login-sphere-1"></div>
            <div class="login-sphere login-sphere-2"></div>
            <div class="login-sphere login-sphere-3"></div>

            <!-- Courbe organique (SVG) -->
            <div class="login-curve" aria-hidden="true">
                <svg viewBox="0 0 80 100" preserveAspectRatio="none">
                    <path d="M 0 0 L 80 0 Q 0 50 80 100 L 0 100 Z" fill="url(#leftGrad)"/>
                    <defs>
                        <linearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#EA580C"/>
                            <stop offset="100%" stop-color="#C2410C"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <div class="login-brand-inner">
                @if ($loginLogo)
                    <img src="{{ url($loginLogo) }}" alt="ESEBAT" class="login-brand-logo" style="max-width: 140px; max-height: 64px; margin-bottom: 1rem; display: block;">
                @endif
                <p class="login-brand-welcome">Bienvenue</p>
                <h1 class="login-brand-title">Plateforme Logistique ESEBAT</h1>
                <p class="login-brand-desc">Gestion intelligente des ressources techniques — Génie Civil, EMSA, BTP, QHSE, Géotechnique, Topographie et énergies renouvelables.</p>
            </div>
        </section>

        <section class="login-panel-right">
            <div class="login-form-wrap">
                <h2 class="login-form-title">Connexion</h2>
                <p class="login-form-sub">Accédez à votre espace de gestion logistique.</p>

                @if (session('error'))
                    <div class="alert alert-danger">
                        {{ session('error') }}
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

                <form method="POST" action="{{ route('login') }}">
                    @csrf

                    <div class="form-group-login">
                        <label for="email">Adresse email</label>
                        <div class="input-wrap">
                            <input type="email" name="email" id="email" class="form-control"
                                   value="{{ old('email') }}" placeholder="vous@exemple.com"
                                   required autofocus autocomplete="username">
                            <i class="bi bi-person input-icon"></i>
                        </div>
                    </div>

                    <div class="form-group-login">
                        <label for="password">Mot de passe</label>
                        <div class="input-wrap input-wrap-password">
                            <input type="password" name="password" id="password" class="form-control"
                                   placeholder="••••••••" required autocomplete="current-password">
                            <i class="bi bi-lock input-icon"></i>
                            <button type="button" class="password-toggle" id="togglePassword" aria-label="Afficher le mot de passe">Afficher</button>
                        </div>
                    </div>

                    <div class="form-options">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="remember" id="remember">
                            <label class="form-check-label" for="remember">Se souvenir de moi</label>
                        </div>
                        @if (Route::has('password.request'))
                            <a href="{{ route('password.request') }}" class="forgot-link">Mot de passe oublié ?</a>
                        @endif
                    </div>

                    <button type="submit" class="btn btn-login">Se connecter</button>
                    <button type="button" class="btn btn-login-secondary" disabled>Se connecter avec un autre (bientôt)</button>
                </form>

                @if (Route::has('register'))
                    <p class="login-form-footer">Pas de compte ? <a href="{{ route('register') }}">S'inscrire</a></p>
                @endif
            </div>
        </section>
    </div>

    <script>
        document.getElementById('togglePassword').addEventListener('click', function () {
            var input = document.getElementById('password');
            var btn = this;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Masquer';
            } else {
                input.type = 'password';
                btn.textContent = 'Afficher';
            }
        });
    </script>
</body>
</html>
