{{--
  Carte de procédure : titre, description courte, acteurs, livrable, bouton "Voir les détails".
  Style moderne, arrondi, coloré. Peut ouvrir un offcanvas ou déclencher une action au clic.
--}}
@props([
    'title' => '',
    'description' => '',
    'acteurs' => '',
    'livrable' => '',
    'icon' => 'bi-list-check',
    'color' => 'primary',
    'cardClass' => '',
    'steps' => [],
])

@php
    $bgLight = match($color) {
        'primary' => 'rgba(37, 99, 235, 0.08)',
        'success' => 'rgba(16, 185, 129, 0.08)',
        'info' => 'rgba(6, 182, 212, 0.08)',
        'warning' => 'rgba(245, 158, 11, 0.08)',
        'danger' => 'rgba(239, 68, 68, 0.08)',
        default => 'rgba(100, 116, 139, 0.08)',
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
<div class="card procedure-card h-100 border-0 shadow-sm rounded-3 overflow-hidden {{ $cardClass }}"
     style="background: {{ $bgLight }}; border-left: 4px solid {{ $borderColor }} !important; transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer;"
     role="button"
     tabindex="0"
     data-bs-toggle="modal"
     data-bs-target="#procedurePreviewModal"
     data-proc-title="{{ $title }}"
     data-proc-description="{{ $description }}"
     data-proc-acteurs="{{ $acteurs }}"
     data-proc-livrable="{{ $livrable }}"
     data-proc-icon="{{ $icon }}"
     data-proc-color="{{ $borderColor }}"
     data-proc-steps='@json($steps)'
     {{ $attributes->except('class') }}>
    <div class="card-body p-4">
        <div class="d-flex align-items-start gap-3">
            <span class="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  style="width: 48px; height: 48px; background: {{ $borderColor }}20;">
                <i class="bi {{ $icon }} fs-4" style="color: {{ $borderColor }};"></i>
            </span>
            <div class="flex-grow-1 min-w-0">
                <h3 class="h6 fw-bold mb-2 text-dark">{{ $title }}</h3>
                <p class="small text-muted mb-2">{{ $description }}</p>
                @if ($acteurs)
                    <p class="small mb-1"><strong>Acteurs concernés :</strong> <span class="text-body">{{ $acteurs }}</span></p>
                @endif
                @if ($livrable)
                    <p class="small mb-3"><strong>Livrable :</strong> <span class="text-body">{{ $livrable }}</span></p>
                @endif
                <span class="btn btn-sm rounded-2 procedure-card-btn d-inline-block"
                      style="background: {{ $borderColor }}; color: #fff; border: none;">
                    <i class="bi bi-eye me-1"></i> Voir les détails
                </span>
            </div>
        </div>
    </div>
</div>

<style>
.procedure-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.1) !important; }
.procedure-card-btn:hover { filter: brightness(1.1); color: #fff !important; }
</style>
