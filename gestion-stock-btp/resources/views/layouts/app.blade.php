<!DOCTYPE html>
@php
        $appThemeColor = 'orange';
        if (class_exists(\App\Models\Setting::class) && \Illuminate\Support\Facades\Schema::hasTable('settings')) {
            $appThemeColor = in_array(\App\Models\Setting::get('theme_color', 'orange'), ['orange', 'blue', 'green'], true) ? \App\Models\Setting::get('theme_color') : 'orange';
        }
        $appFavicon = class_exists(\App\Models\Setting::class) ? \App\Models\Setting::resolveFaviconUrl() : asset('favicon.svg');
        $appLogo = null;
        if (class_exists(\App\Models\Setting::class)) {
            $appLogo = \App\Models\Setting::resolveLogoUrl();
        }
        if (!$appLogo && file_exists(public_path('logo.png'))) { $appLogo = asset('logo.png'); }
        if (!$appLogo && file_exists(public_path('logo.svg'))) { $appLogo = asset('logo.svg'); }
    @endphp
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-bs-theme="light" class="theme-{{ $appThemeColor }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="robots" content="noindex, nofollow">

    <title>@yield('title', 'ESEBAT - Logistique & gestion des budgets')</title>

    <link rel="icon" href="{{ url($appFavicon) }}">
    <!-- Fonts - Charte ESEBAT -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <!-- Template Dashboard (adaptation visuelle fidèle, identité ESEBAT conservée) -->
    <link rel="stylesheet" href="{{ asset('css/esebat-dashboard-template.css') }}">

    <style>
        /* Charte graphique ESEBAT - Application globale */
        :root {
            --esebat-orange: #F97316;
            --esebat-orange-hover: #ea580c;
            --esebat-gray-dark: #374151;
            --esebat-gray-light: #F3F4F6;
            --esebat-white: #FFFFFF;
            --primary-color: var(--theme-primary, var(--esebat-orange));
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #0ea5e9;
        }

        /* Thème clair — inspiration template : dégradé discret + glassmorphism léger, sans changer les fonctionnalités */
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, var(--esebat-gray-light) 0%, #e8ecf1 50%, #e2e8f0 100%);
            background-attachment: fixed;
            color: var(--esebat-gray-dark);
            margin: 0;
        }

        :root, .theme-orange { --theme-primary: #F97316; --theme-primary-hover: #ea580c; --theme-primary-dark: #c2410c; }
        .theme-blue { --theme-primary: #2563eb; --theme-primary-hover: #1d4ed8; --theme-primary-dark: #1e40af; }
        .theme-green { --theme-primary: #16a34a; --theme-primary-hover: #15803d; --theme-primary-dark: #166534; }
        .theme-orange .btn-primary { background-color: var(--theme-primary) !important; border-color: var(--theme-primary) !important; }
        .theme-blue .btn-primary { background-color: var(--theme-primary) !important; border-color: var(--theme-primary) !important; }
        .theme-green .btn-primary { background-color: var(--theme-primary) !important; border-color: var(--theme-primary) !important; }
        .theme-orange .btn-primary:hover { background-color: var(--theme-primary-hover) !important; border-color: var(--theme-primary-hover) !important; }
        .theme-blue .btn-primary:hover { background-color: var(--theme-primary-hover) !important; border-color: var(--theme-primary-hover) !important; }
        .theme-green .btn-primary:hover { background-color: var(--theme-primary-hover) !important; border-color: var(--theme-primary-hover) !important; }

        /* Structure layout (détails visuels dans esebat-dashboard-template.css) */
        .dashboard-layout {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            height: 100vh;
            overflow: hidden;
            max-width: 100%;
        }

        /* Wrapper global : header en haut, puis zone sidebar + main (ordre DOM strict). */
        .content-wrapper {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            max-width: 100%;
        }

        .topbar { order: 1; }
        .body-row { order: 2; }

        /* Container horizontal : sidebar à gauche, contenu principal à droite */
        .body-row {
            display: flex;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        /* Zone de travail principale — fond discret pour effet “verre” des cartes */
        .main-content {
            flex: 1;
            min-height: 0;
            overflow-x: auto;
            overflow-y: auto;
            max-width: 100%;
            color: var(--esebat-gray-dark);
            position: relative;
            z-index: 1;
        }

        .alert {
            border: none;
            border-left: 4px solid;
            border-radius: 10px;
        }

        .alert-danger {
            border-left-color: var(--danger-color);
            background-color: #fef2f2;
            color: #991b1b;
        }

        .alert-warning {
            border-left-color: var(--warning-color);
            background-color: #fef3c7;
            color: #92400e;
        }

        .alert-info {
            border-left-color: var(--info-color);
            background-color: #f0f9ff;
            color: #164e63;
        }

        .alert-success {
            border-left-color: var(--success-color);
            background-color: #f0fdf4;
            color: #166534;
        }

        .dropdown-toggle::after {
            display: none;
        }

        /* Pagination plus compacte (flèches et boutons plus petits) */
        .pagination { font-size: 0.875rem; }
        .pagination .page-link { padding: 0.35rem 0.65rem; }
        nav .small.text-muted { font-size: 0.8rem !important; }

        /* Modals : rendus dans .modals-outer (hors .main-content) pour z-index au-dessus du backdrop — sinon les clics sont bloqués */
        .modal-backdrop { z-index: 1040 !important; }
        .modals-outer { position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 1050; pointer-events: none; }
        .modals-outer .modal { pointer-events: auto; z-index: 1050 !important; position: fixed !important; left: 0; top: 0; width: 100%; height: 100%; }
        .modal-dialog { margin: 1.75rem auto; max-height: calc(100vh - 3.5rem); }
        .modal-content {
            max-height: calc(100vh - 3.5rem);
            overflow-y: auto;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            border-radius: 16px;
            box-shadow: 0 8px 40px rgba(55, 65, 81, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
        }
        body.modal-open { overflow: hidden !important; }
        body.modal-open .dashboard-layout .main-content { overflow: hidden !important; }
    </style>

    @yield('styles')
</head>
<body>
    @if (auth()->check())
        {{-- Règle absolue : aucune sortie avant le dashboard. Header puis sidebar puis main. --}}
        <div id="dashboard-layout" class="dashboard-layout">
        <div class="content-wrapper" role="application">
            <header class="topbar" role="banner">
                <div class="d-flex align-items-center">
                    @if (isset($appLogo) && $appLogo)
                        <img src="{{ url($appLogo) }}" alt="ESEBAT" class="topbar-logo">
                    @elseif (env('APP_LOGO_URL'))
                        <img src="{{ url(env('APP_LOGO_URL')) }}" alt="ESEBAT" class="topbar-logo">
                    @elseif (file_exists(public_path('images/logo-esebat.png')))
                        <img src="{{ url(asset('images/logo-esebat.png')) }}" alt="ESEBAT" class="topbar-logo">
                    @else
                        <img src="{{ url(asset('favicon.svg')) }}" alt="" class="topbar-logo" aria-hidden="true">
                    @endif
                    <div>
                        <h6 class="mb-0 topbar-title">@yield('page-title', 'Tableau de bord')</h6>
                        @hasSection('page-subtitle')
                            <small class="topbar-subtitle d-block">@yield('page-subtitle')</small>
                        @endif
                    </div>
                </div>
                <div class="topbar-search-wrap">
                    <form action="{{ route('search.index') }}" method="GET" class="topbar-search-form" role="search">
                        <i class="bi bi-search topbar-search-icon"></i>
                        <input type="search" name="q" class="topbar-search-input" placeholder="Rechercher…" aria-label="Rechercher" value="{{ request('q') }}">
                    </form>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <a href="{{ route('guide.index') }}" class="btn btn-sm btn-outline-secondary {{ Route::is('guide.*') ? 'active' : '' }}">
                        <i class="bi bi-book me-1"></i> Guide
                    </a>
                    @php
                        $unreadNotifications = auth()->user()->appNotifications()->whereNull('read_at')->orderByDesc('created_at')->limit(5)->get();
                        $unreadCount = auth()->user()->appNotifications()->whereNull('read_at')->count();
                    @endphp
                    <div class="dropdown">
                        <a class="btn btn-sm btn-outline-secondary position-relative" href="#" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-bell"></i>
                            @if ($unreadCount > 0)
                                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{{ $unreadCount > 9 ? '9+' : $unreadCount }}</span>
                            @endif
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" style="min-width: 320px;">
                            <li class="dropdown-header d-flex justify-content-between align-items-center">
                                <span>Notifications</span>
                                <a href="{{ route('notifications.index') }}" class="small">Voir tout</a>
                            </li>
                            @forelse ($unreadNotifications as $n)
                                <li><a class="dropdown-item small {{ $n->read_at ? '' : 'fw-bold' }}" href="{{ route('notifications.index') }}">{{ $n->title }}</a></li>
                            @empty
                                <li><span class="dropdown-item text-muted small">Aucune notification</span></li>
                            @endforelse
                        </ul>
                    </div>
                    <span class="topbar-user-name text-muted small d-flex flex-column align-items-end">
                        <span><i class="bi bi-person-circle"></i> {{ auth()->user()->display_name ?? auth()->user()->name }}</span>
                        <span class="smaller text-muted" style="font-size: 0.75rem;">
                            Profil : {{ auth()->user()->getRoleNames()->first() ?? '—' }}
                            @if (auth()->user()->campus)
                                · Campus : {{ auth()->user()->campus->name }}
                            @else
                                · Campus : —
                            @endif
                        </span>
                    </span>
                    <a href="{{ route('account.index') }}" class="btn btn-sm btn-outline-secondary" title="Paramètres du compte">
                        <i class="bi bi-gear"></i> Paramètres
                    </a>
                    <form method="POST" action="{{ route('logout') }}" style="display: inline;">
                        @csrf
                        <button type="submit" class="btn btn-sm btn-outline-danger">
                            <i class="bi bi-box-arrow-right"></i> Déconnexion
                        </button>
                    </form>
                </div>
            </header>

            <!-- Corps : barre d'icônes (template) + sidebar + contenu -->
            <div class="body-row">
                <nav class="sidebar-mini" role="navigation" aria-label="Menu rapide">
                    <a href="{{ route('dashboard') }}" class="sidebar-mini-link {{ Route::is('dashboard') ? 'active' : '' }}" title="Tableau de bord"><i class="bi bi-speedometer2"></i></a>
                    <a href="{{ route('material-requests.index') }}" class="sidebar-mini-link {{ Route::is('material-requests.*') ? 'active' : '' }}" title="Demandes"><i class="bi bi-file-text"></i></a>
                    @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                    <a href="{{ route('personal-stock.index') }}" class="sidebar-mini-link {{ Route::is('personal-stock.*') ? 'active' : '' }}" title="Mon stock"><i class="bi bi-box"></i></a>
                    @endif
                    <a href="{{ route('delivery-slips.index') }}" class="sidebar-mini-link {{ Route::is('delivery-slips.*') ? 'active' : '' }}" title="Bons de sortie"><i class="bi bi-receipt"></i></a>
                    @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
                    <a href="{{ route('aggregated-orders.index') }}" class="sidebar-mini-link {{ Route::is('aggregated-orders.*') ? 'active' : '' }}" title="Commandes"><i class="bi bi-truck"></i></a>
                    <a href="{{ route('stock-referentiel.index') }}" class="sidebar-mini-link {{ Route::is('stock-referentiel.*') || Route::is('referentiel.*') || Route::is('stock.*') ? 'active' : '' }}" title="Stock"><i class="bi bi-box-seam"></i></a>
                    <a href="{{ route('budgets.index') }}" class="sidebar-mini-link {{ Route::is('budgets.*') ? 'active' : '' }}" title="Budgets"><i class="bi bi-wallet2"></i></a>
                    @endif
                    <a href="{{ route('maintenance-tickets.index') }}" class="sidebar-mini-link {{ Route::is('maintenance-tickets.*') ? 'active' : '' }}" title="{{ auth()->user()->isSiteScoped() && !auth()->user()->hasAnyRole(['director', 'super_admin']) ? 'Mes tickets' : 'Maintenance' }}"><i class="bi bi-tools"></i></a>
                    <a href="{{ route('inbox.index') }}" class="sidebar-mini-link {{ Route::is('inbox.*') ? 'active' : '' }}" title="Messagerie"><i class="bi bi-chat-dots"></i></a>
                    @if (auth()->user()->hasAnyRole(['director', 'point_focal', 'super_admin']))
                    <a href="{{ route('analytics.index') }}" class="sidebar-mini-link {{ Route::is('analytics.*') ? 'active' : '' }}" title="Statistiques"><i class="bi bi-graph-up"></i></a>
                    @endif
                    <a href="{{ route('account.index') }}" class="sidebar-mini-link {{ Route::is('account.*') ? 'active' : '' }}" title="Paramètres"><i class="bi bi-gear"></i></a>
                    @if (auth()->user()->hasAnyRole(['super_admin', 'director']))
                    <a href="{{ route('campuses.index') }}" class="sidebar-mini-link {{ Route::is('campuses.*') ? 'active' : '' }}" title="Campus"><i class="bi bi-building"></i></a>
                    <a href="{{ route('users.index') }}" class="sidebar-mini-link {{ Route::is('users.*') ? 'active' : '' }}" title="Utilisateurs"><i class="bi bi-people"></i></a>
                    @endif
                    @if (auth()->user()->hasRole('super_admin'))
                    <a href="{{ route('settings.index') }}" class="sidebar-mini-link {{ Route::is('settings.*') ? 'active' : '' }}" title="Paramètres application"><i class="bi bi-gear-wide-connected"></i></a>
                    @endif
                    <a href="{{ route('guide.index') }}" class="sidebar-mini-link {{ Route::is('guide.*') ? 'active' : '' }}" title="Guide"><i class="bi bi-book"></i></a>
                    <form method="POST" action="{{ route('logout') }}" class="sidebar-mini-logout">
                        @csrf
                        <button type="submit" class="sidebar-mini-link" title="Déconnexion"><i class="bi bi-box-arrow-right"></i></button>
                    </form>
                </nav>
                <nav class="sidebar" role="navigation" aria-label="Menu principal">
                    <div class="brand">
                        @if ($appLogo ?? null)
                            <img src="{{ url($appLogo) }}" alt="ESEBAT" class="brand-logo" onerror="this.style.display='none'; this.nextElementSibling && this.nextElementSibling.classList.remove('d-none');">
                            <svg class="brand-logo d-none fallback-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.25)"/><path d="M12 20L20 12L28 20L20 28L12 20Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        @elseif (env('APP_LOGO_URL'))
                            <img src="{{ url(env('APP_LOGO_URL')) }}" alt="ESEBAT" class="brand-logo">
                        @elseif (file_exists(public_path('images/logo-esebat.png')))
                            <img src="{{ url(asset('images/logo-esebat.png')) }}" alt="ESEBAT" class="brand-logo">
                        @else
                            <svg class="brand-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.25)"/>
                                <path d="M12 20L20 12L28 20L20 28L12 20Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M20 12v16M12 20h16" stroke="white" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.9"/>
                            </svg>
                        @endif
                        <div>
                            <h5>ESEBAT</h5>
                            <small>Logistique & Budget</small>
                        </div>
                    </div>

                    <div class="nav-section-title">Menu principal</div>
                    <a href="{{ route('dashboard') }}" class="nav-link {{ Route::is('dashboard') ? 'active' : '' }}">
                        <i class="bi bi-speedometer2"></i> Tableau de bord
                    </a>

                    <div class="nav-section-title">Opérations</div>
                    <a href="{{ route('material-requests.index') }}" class="nav-link {{ Route::is('material-requests.*') ? 'active' : '' }}">
                        <i class="bi bi-file-text"></i> Demandes de matériel
                    </a>
                    @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                    <a href="{{ route('personal-stock.index') }}" class="nav-link {{ Route::is('personal-stock.*') ? 'active' : '' }}">
                        <i class="bi bi-box"></i> Mon stock
                    </a>
                    @endif
                    <a href="{{ route('delivery-slips.index') }}" class="nav-link {{ Route::is('delivery-slips.*') ? 'active' : '' }}">
                        <i class="bi bi-receipt"></i> Bons de sortie
                    </a>
                    @if (auth()->user()->isSiteScoped() && !auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']) && auth()->user()->can('stock.view_campus'))
                    <a href="{{ route('stock.mon-campus') }}" class="nav-link {{ Route::is('stock.mon-campus') ? 'active' : '' }}">
                        <i class="bi bi-box-seam"></i> Stock de mon campus
                    </a>
                    @endif
                    @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
                    <a href="{{ route('aggregated-orders.index') }}" class="nav-link {{ Route::is('aggregated-orders.*') ? 'active' : '' }}">
                        <i class="bi bi-truck"></i> Commandes groupées
                    </a>
                    @endif

                    {{-- Maintenance : staff (tickets assignés + création), point_focal/director/admin (suivi) --}}
                    <a href="{{ route('maintenance-tickets.index') }}" class="nav-link {{ Route::is('maintenance-tickets.*') ? 'active' : '' }}">
                        <i class="bi bi-tools"></i> {{ auth()->user()->isSiteScoped() && !auth()->user()->hasAnyRole(['director', 'super_admin']) ? 'Mes tickets de maintenance' : 'Maintenance' }}
                    </a>
                    <a href="{{ route('inbox.index') }}" class="nav-link {{ Route::is('inbox.*') ? 'active' : '' }}">
                        <i class="bi bi-chat-dots"></i> Messagerie
                    </a>

                    @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
                    <div class="nav-section-title">Stock et référentiel</div>
                    <a href="{{ route('stock-referentiel.index') }}" class="nav-link {{ Route::is('stock-referentiel.*') || Route::is('referentiel.*') || Route::is('personal-stock.*') || Route::is('stock.*') ? 'active' : '' }}">
                        <i class="bi bi-box-seam"></i> Stock et référentiel
                    </a>
                    <div class="nav-section-title">Finances</div>
                    <a href="{{ route('budgets.index') }}" class="nav-link {{ Route::is('budgets.index') || Route::is('budgets.show') || Route::is('budgets.create') || Route::is('budgets.edit') ? 'active' : '' }}">
                        <i class="bi bi-wallet2"></i> Budgets
                    </a>
                    @if (auth()->user()->hasAnyRole(['director', 'super_admin']))
                    <a href="{{ route('budgets.strategic-dashboard') }}" class="nav-link {{ Route::is('budgets.strategic-dashboard') ? 'active' : '' }}">
                        <i class="bi bi-graph-up-arrow"></i> Tableau de bord budgétaire
                    </a>
                    @endif
                    @if (auth()->user()->hasAnyRole(['director', 'super_admin']))
                    <div class="nav-section-title">Inventaire</div>
                    <a href="{{ route('assets.index') }}" class="nav-link {{ Route::is('assets.*') ? 'active' : '' }}">
                        <i class="bi bi-hammer"></i> Actifs
                    </a>
                    @endif
                    @endif

                    @if (auth()->user()->hasAnyRole(['director', 'point_focal', 'super_admin']))
                    <div class="nav-section-title">Analyse</div>
                    <a href="{{ route('tableau-suivi-logistique.index') }}" class="nav-link {{ Route::is('tableau-suivi-logistique.*') ? 'active' : '' }}">
                        <i class="bi bi-clipboard2-data"></i> Tableau suivi logistique (DG)
                    </a>
                    <a href="{{ route('reports.campus-monthly.index') }}" class="nav-link {{ Route::is('reports.campus-monthly.*') ? 'active' : '' }}">
                        <i class="bi bi-calendar-month"></i> Rapport mensuel par campus
                    </a>
                    <a href="{{ route('analytics.index') }}" class="nav-link {{ Route::is('analytics.*') ? 'active' : '' }}">
                        <i class="bi bi-graph-up"></i> Statistiques par campus
                    </a>
                    @endif

                    <div class="nav-section-title mt-3">Compte</div>
                    <a href="{{ route('account.index') }}" class="nav-link {{ Route::is('account.*') ? 'active' : '' }}">
                        <i class="bi bi-gear"></i> Paramètres
                    </a>

                    @if (auth()->user()->hasAnyRole(['director', 'super_admin']))
                    <div class="nav-section-title">Administration</div>
                    <a href="{{ route('campuses.index') }}" class="nav-link {{ Route::is('campuses.*') ? 'active' : '' }}">
                        <i class="bi bi-building"></i> Campus
                    </a>
                    @if (auth()->user()->hasAnyRole(['super_admin', 'director']))
                    <a href="{{ route('users.index') }}" class="nav-link {{ Route::is('users.*') ? 'active' : '' }}">
                        <i class="bi bi-people"></i> Utilisateurs
                    </a>
                    @endif
                    @if (auth()->user()->hasRole('super_admin'))
                    <a href="{{ route('settings.index') }}" class="nav-link {{ Route::is('settings.*') ? 'active' : '' }}">
                        <i class="bi bi-gear-wide-connected"></i> Paramètres de l'application
                    </a>
                    @endif
                    @endif

                    <div class="nav-section-title mt-3">Aide</div>
                    <a href="{{ route('guide.index') }}" class="nav-link {{ Route::is('guide.*') ? 'active' : '' }}">
                        <i class="bi bi-book"></i> Guide utilisateur
                    </a>
                </nav>

                <main class="main-content" id="main-app-content" role="main">
                    @if ($errors->any())
                        <div class="alert alert-danger">
                            <strong><i class="bi bi-exclamation-circle"></i> Erreurs :</strong>
                            <ul class="mb-0 mt-2">
                                @foreach ($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif

                    @if (session('success'))
                        <div class="alert alert-success">
                            <i class="bi bi-check-circle"></i> {{ session('success') }}
                        </div>
                    @endif
                    @if (session('error'))
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-circle"></i> {{ session('error') }}
                        </div>
                    @endif

                    @yield('content')
                </main>
            </div>
        </div>
        </div>{{-- fin #dashboard-layout --}}
        {{-- Modals hors du layout : z-index 1050 > backdrop 1040 pour que les clics atteignent le formulaire --}}
        <div class="modals-outer">@yield('modals')</div>
    @else
        @yield('content')
    @endif

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    @yield('scripts')
</body>
</html>
