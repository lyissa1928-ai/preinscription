@extends('layouts.app')

@section('title', 'Tableau de bord - ESEBAT')
@section('page-title', 'Tableau de bord')
@section('page-subtitle', 'Bienvenue sur votre espace de travail')

@section('content')
@php
    $isStaffOnly = auth()->user()->isSiteScoped() && !auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']);
    $isPointFocalDashboard = auth()->user()->hasRole('point_focal') && !auth()->user()->hasRole('director') && !auth()->user()->hasRole('super_admin');
    $dashboardLogo = null;
    if (class_exists(\App\Models\Setting::class)) { $dashboardLogo = \App\Models\Setting::resolveLogoUrl(); }
    if (!$dashboardLogo && file_exists(public_path('logo.png'))) { $dashboardLogo = asset('logo.png'); }
    if (!$dashboardLogo && file_exists(public_path('logo.svg'))) { $dashboardLogo = asset('logo.svg'); }
@endphp

<div class="dashboard-welcome mb-4">
    <h1 class="dashboard-welcome-title">Bienvenue, {{ auth()->user()->display_name ?? auth()->user()->name }} !</h1>
    <p class="dashboard-welcome-subtitle mb-0">Vue d'ensemble — Logistique & Budget</p>
</div>
@php
    $statusLabels = [
        'draft' => 'Brouillon',
        'submitted' => 'Soumise',
        'in_treatment' => 'En cours',
        'pending_director' => 'Transmise au directeur',
        'director_approved' => 'Approuvée par le directeur',
        'approved' => 'Validée',
        'cancelled' => 'Rejetée',
        'delivered' => 'Livrée',
        'received' => 'Réceptionnée',
        'aggregated' => 'Regroupée',
    ];
@endphp

<!-- Message d'accueil selon le rôle -->
@if (auth()->user()->hasRole('director'))
    <div class="alert alert-light border mb-3 d-flex align-items-center">
        <i class="bi bi-building me-2" style="font-size: 1.5rem;"></i>
        <div>
            <strong>Vue Direction</strong> — Vous avez accès à l’ensemble des campus, des demandes et du tableau de suivi logistique. Utilisez le menu <strong>Analyse</strong> pour les indicateurs.
        </div>
    </div>
@elseif (auth()->user()->hasRole('point_focal'))
    <div class="alert alert-light border mb-3 d-flex align-items-center">
        <i class="bi bi-clipboard-check me-2" style="font-size: 1.5rem;"></i>
        <div>
            <strong>Espace Point Focal</strong> — Validez les demandes, gérez le référentiel <a href="{{ route('designations.index') }}" class="alert-link">Désignations & prix</a> et les <a href="{{ route('categories.index') }}" class="alert-link">Catégories</a>, créez les commandes et enregistrez les réceptions.
        </div>
    </div>
@elseif ($isStaffOnly)
    <div class="alert alert-light border mb-3 d-flex align-items-center">
        <i class="bi bi-person-badge me-2" style="font-size: 1.5rem;"></i>
        <div>
            <strong>Espace Staff</strong> — Créez vos <a href="{{ route('material-requests.create') }}" class="alert-link">demandes de matériel</a>, suivez leur traitement et gérez <a href="{{ route('personal-stock.index') }}" class="alert-link">votre stock personnel</a> (quantités reçues après livraison ; à chaque utilisation, la quantité restante est décrémentée).
        </div>
    </div>
@endif

<div class="dashboard-section-title">
    <i class="bi bi-speedometer2"></i>
    Indicateurs clés
</div>
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="kpi-card kpi-card-science">
            <div class="kpi-icon-wrap" style="background: rgba(37, 99, 235, 0.12); color: #2563eb;">
                <i class="bi bi-file-text"></i>
            </div>
            <div class="value">{{ $stats['total_requests'] ?? 0 }}</div>
            <div class="kpi-trend kpi-trend-up">{{ $stats['pending_approvals'] ?? 0 }} en attente</div>
            <div class="label">Demandes de matériel</div>
        </div>
    </div>
    @if (!$isStaffOnly)
    <div class="col-md-3">
        <div class="kpi-card kpi-card-science">
            <div class="kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: #059669;">
                <i class="bi bi-truck"></i>
            </div>
            <div class="value">{{ $stats['active_orders'] ?? 0 }}</div>
            <div class="kpi-trend">{{ $stats['confirmed_orders'] ?? 0 }} confirmées</div>
            <div class="label">Commandes</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="kpi-card kpi-card-science">
            <div class="kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">
                <i class="bi bi-wallet2"></i>
            </div>
            <div class="value">{{ $stats['budget_utilization'] ?? 0 }}%</div>
            <div class="kpi-trend {{ (($stats['budget_utilization'] ?? 0) > 80) ? 'kpi-trend-warn' : 'kpi-trend-ok' }}">
                @if(($stats['budget_utilization'] ?? 0) > 80) Élevée @else Optimisé @endif
            </div>
            <div class="label">Utilisation des budgets</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="kpi-card kpi-card-science">
            <div class="kpi-icon-wrap" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">
                <i class="bi bi-boxes"></i>
            </div>
            <div class="value">{{ $stats['low_stock_items'] ?? 0 }}</div>
            <div class="kpi-trend">Réapprovisionnement</div>
            <div class="label">Stock faible</div>
        </div>
    </div>
    @endif
</div>

<!-- Alerts Section : masquée pour staff (alertes globales) -->
@if (!$isStaffOnly && isset($alerts) && count($alerts) > 0)
<div class="row mb-4">
    <div class="col-12">
        <div class="dashboard-section-title"><i class="bi bi-exclamation-triangle"></i> Alertes</div>
        @foreach ($alerts as $alert)
            @if ($alert['type'] === 'budget_high')
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-circle"></i> 
                    <strong>Budget :</strong> le budget {{ $alert['campus'] }} est utilisé à {{ $alert['utilization'] }} %
                </div>
            @elseif ($alert['type'] === 'low_stock')
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-circle"></i> 
                    <strong>Stock :</strong> {{ $alert['item'] }} à {{ $alert['quantity'] }} unités
                </div>
            @elseif ($alert['type'] === 'approval_pending')
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> 
                    <strong>En attente :</strong> {{ $alert['request_number'] }} en attente d'approbation
                </div>
            @endif
        @endforeach
    </div>
</div>
@endif

<!-- À traiter (Point focal / Directeur) : demandes + commandes -->
@if (auth()->user()->hasAnyRole(['point_focal', 'director']) && (($ordersToProcess['draft'] ?? 0) > 0 || ($ordersToProcess['confirmed'] ?? 0) > 0))
<div class="row mb-4">
    <div class="col-12">
        <div class="card border-warning">
            <div class="card-header">
                <i class="bi bi-list-task"></i> À traiter
            </div>
            <div class="card-body">
                <div class="row g-2">
                    @if (($ordersToProcess['draft'] ?? 0) > 0)
                        <div class="col-auto">
                            <a href="{{ route('aggregated-orders.index', ['tab' => 'draft']) }}" class="btn btn-outline-warning btn-sm">
                                <i class="bi bi-pencil-square"></i> Commandes en brouillon ({{ $ordersToProcess['draft'] }})
                            </a>
                        </div>
                    @endif
                    @if (($ordersToProcess['confirmed'] ?? 0) > 0)
                        <div class="col-auto">
                            <a href="{{ route('aggregated-orders.index', ['tab' => 'confirmed']) }}" class="btn btn-outline-success btn-sm">
                                <i class="bi bi-box-seam"></i> Commandes à réceptionner ({{ $ordersToProcess['confirmed'] }})
                            </a>
                        </div>
                    @endif
                    @if (isset($pendingValidationRequests) && $pendingValidationRequests->isNotEmpty())
                        <div class="col-auto">
                            <a href="{{ route('material-requests.index', ['status' => 'submitted']) }}" class="btn btn-outline-primary btn-sm">
                                <i class="bi bi-file-check"></i> Demandes à valider ({{ $pendingValidationRequests->count() }})
                            </a>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>
@endif

<!-- Mes demandes -->
@if (isset($myRecentRequests) && $myRecentRequests->isNotEmpty())
<div class="dashboard-section-title"><i class="bi bi-file-text"></i> Mes demandes de matériel</div>
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-clock-history"></i> Dernières demandes</span>
                <a href="{{ route('material-requests.index') }}" class="btn btn-sm btn-outline-primary">Voir tout</a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                        <thead>
                            <tr>
                                <th>N° demande</th>
                                <th>Campus</th>
                                <th>Statut</th>
                                <th class="d-none d-md-table-cell">Mise à jour</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($myRecentRequests as $req)
                                <tr>
                                    <td><strong class="text-truncate d-inline-block" style="max-width: 140px;" title="{{ $req->request_number }}">{{ $req->request_number }}</strong></td>
                                    <td>{{ Str::limit($req->campus?->name ?? '—', 18) }}</td>
                                    <td><span class="badge bg-secondary">{{ $statusLabels[$req->status] ?? $req->status }}</span></td>
                                    <td class="d-none d-md-table-cell small">{{ $req->updated_at->format('d/m/Y H:i') }}</td>
                                    <td><a href="{{ route('material-requests.show', $req) }}" class="btn btn-sm btn-link p-0">Voir</a></td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
@endif

<!-- Indicateurs analytiques : Director / Super admin (masqué pour point focal seul pour alléger) -->
@if (!$isStaffOnly && !$isPointFocalDashboard && isset($analytics) && $analytics)
<div class="dashboard-section-title"><i class="bi bi-graph-up"></i> Activité des campus</div>
<div class="row mb-4">
    <div class="col-12">
        <div class="card border-info">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-bar-chart-line"></i> Indicateurs du mois</span>
                <a href="{{ route('analytics.index') }}" class="btn btn-sm btn-outline-primary">Voir toute l'analyse</a>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="text-center p-2 rounded" style="background-color: #eff6ff;">
                            <div class="fw-bold text-primary" style="font-size: 1.5rem;">{{ $analytics['countMonth'] }}</div>
                            <small class="text-muted">Demandes ce mois</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="text-center p-2 rounded" style="background-color: #ecfdf5;">
                            <div class="fw-bold" style="font-size: 1.5rem; color: #059669;">{{ $analytics['countYear'] }}</div>
                            <small class="text-muted">Demandes cette année</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <p class="small text-muted mb-1">Top 5 campus demandeurs</p>
                        @forelse ($analytics['topCampuses'] as $tc)
                            <div class="d-flex justify-content-between small">
                                <span>{{ $tc['campus_name'] }}</span>
                                <strong>{{ $tc['total'] }}</strong>
                            </div>
                        @empty
                            <small class="text-muted">Aucune donnée</small>
                        @endforelse
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endif

<!-- Demandes par campus et par statut : Directeur / Super admin (masqué pour point focal pour alléger) -->
@if (!$isStaffOnly && !$isPointFocalDashboard && ((isset($requestStatsByCampus) && count($requestStatsByCampus) > 0) || (isset($requestStatsByStatus) && count($requestStatsByStatus) > 0)))
<div class="row mb-4">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-building"></i> Demandes par campus</span>
                <a href="{{ route('material-requests.index') }}" class="btn btn-sm btn-outline-primary">Voir tout</a>
            </div>
            <div class="card-body">
                @foreach ($requestStatsByCampus ?? [] as $campusName => $total)
                    <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                        <span>{{ $campusName }}</span>
                        <span class="badge bg-primary">{{ $total }}</span>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
    <div class="col-md-6">
        <div class="card">
            <div class="card-header"><i class="bi bi-pie-chart"></i> Demandes par statut</div>
            <div class="card-body">
                @php
                    $statusLabels = [
                        'draft' => 'Brouillon',
                        'submitted' => 'Soumise',
                        'in_treatment' => 'En cours',
                        'approved' => 'Validée',
                        'cancelled' => 'Rejetée',
                        'delivered' => 'Livrée',
                        'received' => 'Réceptionnée',
                        'aggregated' => 'Regroupée',
                    ];
                @endphp
                @foreach ($requestStatsByStatus ?? [] as $status => $total)
                    <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                        <span>{{ $statusLabels[$status] ?? ucfirst($status) }}</span>
                        <span class="badge bg-secondary">{{ $total }}</span>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
</div>
@endif

<!-- Demandes en attente de validation : Point focal / Directeur uniquement -->
@if (!$isStaffOnly && isset($pendingValidationRequests) && $pendingValidationRequests->isNotEmpty())
<div class="row mb-4">
    <div class="col-12">
        <div class="card border-primary">
            <div class="card-header bg-primary text-white">
                <i class="bi bi-hourglass-split"></i> En attente de validation ({{ $pendingValidationRequests->count() }})
            </div>
            <div class="card-body">
                <p class="text-muted small mb-3">Les demandes soumises par les campus apparaissent ici. Validez ou rejetez avec un motif.</p>
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>N° demande</th>
                                <th>Campus</th>
                                <th>Demandeur</th>
                                <th>Articles</th>
                                <th>Soumise le</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($pendingValidationRequests->take(10) as $req)
                            <tr>
                                <td><strong>{{ $req->request_number }}</strong></td>
                                <td>{{ $req->campus?->name ?? '—' }}</td>
                                <td>{{ $req->requester?->name ?? '—' }}</td>
                                <td><span class="badge bg-info">{{ $req->requestItems->count() }}</span></td>
                                <td>{{ $req->submitted_at ? $req->submitted_at->format('d/m/Y H:i') : '—' }}</td>
                                <td>
                                    <a href="{{ route('material-requests.show', $req) }}" class="btn btn-sm btn-primary">
                                        <i class="bi bi-eye"></i> Voir / Valider
                                    </a>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
                @if ($pendingValidationRequests->count() > 10)
                    <p class="text-muted small mb-0"><a href="{{ route('material-requests.index') }}">Voir toutes les demandes</a></p>
                @endif
            </div>
        </div>
    </div>
</div>
@endif

<!-- Section unique : Activité et tâches (grille template : zone principale + aside sticky) -->
<div class="dashboard-section-title mt-4"><i class="bi bi-grid-3x3-gap"></i> Activité et tâches</div>
<div class="dashboard-grid has-aside">
    <div class="dashboard-main">
        <!-- Activité récente (tableau principal) -->
        <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-clock-history"></i> Activité récente</span>
                <a href="{{ route('material-requests.index') }}" class="btn btn-sm btn-outline-primary">Voir tout</a>
            </div>
            <div class="card-body">
                @php $recentActivityList = isset($recentActivity) ? ($isPointFocalDashboard ? array_slice($recentActivity, 0, 5) : $recentActivity) : []; @endphp
                @if (count($recentActivityList) > 0)
                    <div class="table-responsive">
                        <table class="table table-sm table-layout-fixed">
                            <thead>
                                <tr>
                                    <th style="width: 22%;">Type</th>
                                    <th style="width: 18%;">Ressource</th>
                                    <th style="width: 18%;">Action</th>
                                    <th style="width: 22%;">Utilisateur</th>
                                    <th style="width: 20%;">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($recentActivityList as $activity)
                                    @php
                                        $resLabel = str_contains($activity['loggable_type'] ?? '', 'MaterialRequest') ? 'Demande' : (str_contains($activity['loggable_type'] ?? '', 'AggregatedOrder') ? 'Commande' : (str_contains($activity['loggable_type'] ?? '', 'Budget') ? 'Budget' : 'Autre'));
                                    @endphp
                                    <tr>
                                        <td>
                                            @if ($resLabel === 'Demande')
                                                <span class="badge bg-primary">Demande</span>
                                            @elseif ($resLabel === 'Commande')
                                                <span class="badge bg-success">Commande</span>
                                            @elseif ($resLabel === 'Budget')
                                                <span class="badge bg-warning text-dark">Budget</span>
                                            @else
                                                <span class="badge bg-secondary">Autre</span>
                                            @endif
                                        </td>
                                        <td class="text-truncate" title="{{ $resLabel }} #{{ $activity['loggable_id'] ?? '—' }}">{{ $resLabel }} #{{ $activity['loggable_id'] ?? '—' }}</td>
                                        <td>
                                            @if ($activity['action'] === 'created')
                                                <span class="status-with-dot status-dot-success">Créé</span>
                                            @elseif ($activity['action'] === 'updated')
                                                <span class="status-with-dot status-dot-info">Modifié</span>
                                            @elseif ($activity['action'] === 'approved')
                                                <span class="status-with-dot status-dot-success">Approuvé</span>
                                            @else
                                                <span class="status-with-dot status-dot-secondary">{{ ucfirst($activity['action']) }}</span>
                                            @endif
                                        </td>
                                        <td>{{ $activity['user_name'] ?? 'Système' }}</td>
                                        <td>{{ $activity['created_at'] }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center py-4 mb-0"><i class="bi bi-inbox"></i> Aucune activité récente</p>
                @endif
            </div>
        </div>
    </div>

    <!-- Colonne droite : panneau secondaire template (sticky) -->
    <aside class="dashboard-aside">
        <div class="card mb-4">
            <div class="card-header"><i class="bi bi-lightning"></i> Actions rapides</div>
            <div class="card-body">
                <div class="d-grid gap-2">
                    @if (!auth()->user()->hasRole('director') || auth()->user()->hasRole('super_admin'))
                    <a href="{{ route('material-requests.create') }}" class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-file-earmark-plus"></i> Nouvelle demande
                    </a>
                    <a href="{{ route('personal-stock.index') }}" class="btn btn-outline-secondary btn-sm">
                        <i class="bi bi-box"></i> Mon stock
                    </a>
                    @endif
                    @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
                        <a href="{{ route('material-requests.index', ['status' => 'submitted']) }}" class="btn btn-outline-primary btn-sm">
                            <i class="bi bi-file-check"></i> Demandes à valider
                        </a>
                        <a href="{{ route('designations.index') }}" class="btn btn-outline-secondary btn-sm">
                            <i class="bi bi-tag"></i> Désignations & prix
                        </a>
                        <a href="{{ route('categories.index') }}" class="btn btn-outline-secondary btn-sm">
                            <i class="bi bi-folder"></i> Catégories
                        </a>
                        <a href="{{ route('aggregated-orders.create') }}" class="btn btn-outline-success btn-sm">
                            <i class="bi bi-plus-circle"></i> Créer une commande
                        </a>
                    @endif
                    @if (auth()->user()->hasAnyRole(['director', 'super_admin']))
                        <a href="{{ route('budgets.create') }}" class="btn btn-outline-warning btn-sm">
                            <i class="bi bi-wallet-fill"></i> Nouveau budget
                        </a>
                    @endif
                    @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
                        <a href="{{ route('stock.dashboard') }}" class="btn btn-outline-danger btn-sm">
                            <i class="bi bi-boxes"></i> Voir le stock
                        </a>
                    @endif
                </div>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header"><i class="bi bi-calendar-event"></i> Échéances à venir</div>
            <div class="card-body">
                @if (isset($myTasks) && count($myTasks) > 0)
                    <div class="list-group list-group-flush">
                        @foreach ($myTasks as $task)
                            <div class="list-group-item d-flex justify-content-between align-items-start py-2 border-0 px-0">
                                <div class="flex-grow-1">
                                    @if (!empty($task['url']))
                                        <a href="{{ $task['url'] }}" class="text-decoration-none">
                                            <span class="fw-medium small">{{ $task['title'] }}</span>
                                        </a>
                                    @else
                                        <span class="fw-medium small">{{ $task['title'] }}</span>
                                    @endif
                                </div>
                                <span class="badge bg-primary ms-2">{{ $task['count'] ?? 0 }}</span>
                            </div>
                        @endforeach
                    </div>
                @else
                    <p class="text-muted small text-center py-2 mb-0"><i class="bi bi-check-all"></i> Rien en attente</p>
                @endif
            </div>
        </div>

        <div class="card mb-4 status-gauge-card">
            <div class="card-header"><i class="bi bi-speedometer2"></i> Statut budgets</div>
            <div class="card-body text-center py-3">
                @php $util = $stats['budget_utilization'] ?? 0; @endphp
                <div class="status-gauge-wrap" title="Utilisation des budgets">
                    <div class="status-gauge-bg"></div>
                    <div class="status-gauge-fill" style="--gauge-pct: {{ min(100, max(0, $util)) }};"></div>
                    <div class="status-gauge-value">{{ round($util) }}%</div>
                </div>
                <p class="small text-muted mb-0 mt-1">Utilisation des budgets</p>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header"><i class="bi bi-activity"></i> Dernières actions</div>
            <div class="card-body p-3">
                @php $recentList = isset($recentActivity) ? array_slice($recentActivity, 0, 5) : []; @endphp
                @if (count($recentList) > 0)
                    <ul class="list-unstyled mb-0 dashboard-activity-list small">
                        @foreach ($recentList as $a)
                            @php
                                $typeLabel = str_contains($a['loggable_type'] ?? '', 'MaterialRequest') ? 'Demande' : (str_contains($a['loggable_type'] ?? '', 'AggregatedOrder') ? 'Commande' : 'Budget');
                                $actionLabel = match($a['action'] ?? '') { 'created' => 'Créé', 'updated' => 'Modifié', 'approved' => 'Approuvé', default => ucfirst($a['action'] ?? '') };
                            @endphp
                            <li class="d-flex align-items-center gap-2 py-2 border-bottom border-light">
                                @if ($typeLabel === 'Demande')
                                    <i class="bi bi-file-text text-primary flex-shrink-0"></i>
                                @elseif ($typeLabel === 'Commande')
                                    <i class="bi bi-truck text-success flex-shrink-0"></i>
                                @else
                                    <i class="bi bi-wallet2 text-warning flex-shrink-0"></i>
                                @endif
                                <span class="text-muted">{{ $typeLabel }} #{{ $a['loggable_id'] ?? '—' }} · {{ $actionLabel }} · {{ $a['created_at'] ?? '' }}</span>
                            </li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-muted small mb-0">Aucune action récente</p>
                @endif
            </div>
        </div>

        @if (!$isStaffOnly && isset($alerts) && count($alerts) > 0)
        <div class="card dashboard-alerts-list">
            <div class="card-header"><i class="bi bi-exclamation-circle"></i> Alertes</div>
            <div class="card-body p-3">
                <ul class="list-unstyled mb-0 small">
                    @foreach (array_slice($alerts, 0, 3) as $alert)
                        <li class="d-flex align-items-center gap-2 py-2 border-bottom border-light">
                            @if (($alert['type'] ?? '') === 'budget_high')
                                <i class="bi bi-wallet2 text-warning flex-shrink-0"></i>
                                <span>Budget {{ $alert['campus'] ?? '' }} — {{ $alert['utilization'] ?? 0 }}%</span>
                            @elseif (($alert['type'] ?? '') === 'low_stock')
                                <i class="bi bi-boxes text-danger flex-shrink-0"></i>
                                <span>{{ Str::limit($alert['item'] ?? '', 22) }} — {{ $alert['quantity'] ?? 0 }} u.</span>
                            @else
                                <i class="bi bi-file-text text-info flex-shrink-0"></i>
                                <span>{{ $alert['request_number'] ?? '' }} en attente</span>
                            @endif
                        </li>
                    @endforeach
                </ul>
            </div>
        </div>
        @endif
    </aside>
</div>
@endsection
