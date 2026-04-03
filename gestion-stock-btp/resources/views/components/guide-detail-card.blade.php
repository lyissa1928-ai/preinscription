{{--
  Carte pédagogique du guide détaillé : une fonctionnalité / étape / formulaire = une carte.
  Contient : titre, description, actions, rôles, tableau de champs (optionnel), résultat attendu.
  Même logique visuelle que procedure-card (bordure colorée, icône).
--}}
@props([
    'title' => '',
    'description' => '',
    'actions' => [],
    'roles' => [],
    'formFields' => null,
    'expectedResult' => '',
    'icon' => 'bi-list-check',
    'color' => 'primary',
])

@php
    $iconBg = match($color) {
        'primary' => 'rgba(37, 99, 235, 0.12)',
        'success' => 'rgba(16, 185, 129, 0.12)',
        'info' => 'rgba(6, 182, 212, 0.12)',
        'warning' => 'rgba(245, 158, 11, 0.12)',
        'danger' => 'rgba(239, 68, 68, 0.12)',
        default => 'rgba(100, 116, 139, 0.12)',
    };
    $borderColor = match($color) {
        'primary' => '#2563eb',
        'success' => '#10b981',
        'info' => '#06b6d4',
        'warning' => '#f59e0b',
        'danger' => '#ef4444',
        default => '#64748b',
    };
@endphp
<div class="card guide-detail-card border-0 rounded-3 overflow-hidden text-break shadow-sm guide-detail-card-optimized"
     style="background: #fff; border-left: 4px solid {{ $borderColor }} !important;">
    <div class="card-body p-4 p-md-4 overflow-hidden">
        <div class="d-flex align-items-start gap-3">
            <span class="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 guide-detail-card-icon"
                  style="width: 52px; height: 52px; background: {{ $iconBg }};">
                <i class="bi {{ $icon }} fs-4" style="color: {{ $borderColor }};"></i>
            </span>
            <div class="flex-grow-1 min-w-0 overflow-hidden">
                <h3 class="h6 fw-bold mb-2 text-dark guide-detail-card-title">{{ $title }}</h3>
                <p class="small text-body mb-3 lh-base">{{ $description }}</p>

                @if (is_array($actions) && count($actions) > 0)
                    <p class="small fw-semibold text-dark mb-2 mt-3 guide-detail-card-actions-label">Actions à effectuer</p>
                    <ul class="small text-body mb-0 ps-3 guide-detail-card-actions-list">
                        @foreach ($actions as $action)
                            <li class="mb-1">{{ $action }}</li>
                        @endforeach
                    </ul>
                @endif

                @if ($formFields !== null && is_array($formFields) && count($formFields) > 0)
                    <div class="mt-3">
                        <x-form-fields-table :fields="$formFields" title="" />
                    </div>
                @endif

                @if ($expectedResult)
                    <div class="guide-detail-card-result mt-4 p-3 rounded-2">
                        <p class="small mb-0"><strong class="text-success">Résultat attendu :</strong> {{ $expectedResult }}</p>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>

<style>
.guide-detail-card-optimized { transition: box-shadow 0.2s ease; }
.guide-detail-card-optimized:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08) !important; }
.guide-detail-card-result { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); }
.guide-detail-card-icon { flex-shrink: 0; }
</style>
