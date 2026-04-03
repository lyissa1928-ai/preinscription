{{--
  Layout standard pour les pages de guide.
  Usage: titre centré, sous-titre, bouton d'action principal, puis slot pour le contenu (ex: cartes procédures).
--}}
<div class="guide-page-wrapper overflow-x-hidden" style="max-width: 100%;">
    <header class="guide-page-header text-center mb-4 py-4">
        <h1 class="guide-page-title mb-2">{{ $title }}</h1>
        @if (isset($subtitle) && $subtitle)
            <p class="guide-page-subtitle text-muted mb-3 mx-auto" style="max-width: 640px;">{{ $subtitle }}</p>
        @endif
        @if (isset($mainButtonUrl) && $mainButtonUrl)
            <a href="{{ $mainButtonUrl }}" class="btn btn-primary btn-lg rounded-3 px-4 shadow-sm">
                <i class="bi {{ $mainButtonIcon ?? 'bi-book' }} me-2"></i>{{ $mainButtonLabel ?? 'Parcourir les procédures' }}
            </a>
        @endif
    </header>
    <div class="guide-page-content">
        {{ $slot }}
    </div>
</div>
