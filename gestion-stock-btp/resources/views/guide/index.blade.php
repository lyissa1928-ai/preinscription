@extends('layouts.app')

@section('title', 'Guide utilisateur - ESEBAT')
@section('page-title', 'Guide utilisateur')

@section('content')
<x-guide-page
    title="Guide utilisateur"
    :subtitle="'Profil : ' . $profileLabel"
    mainButtonUrl="#procedures"
    mainButtonLabel="Parcourir les procédures"
    mainButtonIcon="bi-book"
>
    <div class="guide-content-area overflow-x-hidden w-100" style="max-width: 100%;">

    @if (!empty($roleSummary))
        <div class="guide-role-summary rounded-3 border bg-light bg-opacity-50 p-3 mb-4 small text-body">
            <strong class="text-dark d-block mb-1">Votre périmètre</strong>
            {{ $roleSummary }}
        </div>
    @endif

    <section id="procedures" class="mb-4">
        <h2 class="h6 text-uppercase fw-bold text-muted mb-3 text-center">Fonctionnalités principales</h2>
        <div class="row g-4">
            @foreach ($procedures as $proc)
                <div class="col-12 col-sm-6 col-lg-4">
                    <x-procedure-card
                        :title="$proc['title']"
                        :description="$proc['description']"
                        :acteurs="$proc['acteurs']"
                        :livrable="$proc['livrable'] ?? ''"
                        :icon="$proc['icon']"
                        :color="$proc['color']"
                        :steps="$demos[$proc['key']]['steps'] ?? []"
                    />
                </div>
            @endforeach
        </div>
        @if (empty($procedures))
            <p class="text-muted text-center py-4">Aucune procédure pour ce profil.</p>
        @endif
    </section>

    @if (!empty($workflows))
        <section id="workflows" class="mb-5">
            <h2 class="h6 text-uppercase fw-bold text-muted mb-3 text-center">Votre parcours</h2>
            <x-guide-workflow-block :workflows="$workflows" />
        </section>
    @endif

    <section id="guide-complet" class="mb-5">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <h2 class="h5 fw-bold text-dark mb-0">
                <i class="bi bi-book me-2"></i> Guide détaillé ({{ $profileLabel }})
            </h2>
            <a href="{{ route('guide.export-pdf') }}" target="_blank" rel="noopener" class="btn btn-outline-primary btn-sm rounded-3">
                <i class="bi bi-file-earmark-pdf me-1"></i> Exporter en PDF
            </a>
        </div>

        @forelse ($guideSections as $section)
            <div class="guide-section mb-5">
                <h3 class="guide-section-heading h6 text-uppercase fw-bold text-muted mb-4 d-flex align-items-center gap-2">
                    <i class="bi {{ $section['icon'] }}"></i>
                    {{ $section['title'] }}
                </h3>
                <div class="row g-4 guide-detail-cards-row">
                    @foreach ($section['cards'] as $card)
                        <div class="col-12">
                            <x-guide-detail-card
                                :title="$card['title']"
                                :description="$card['description']"
                                :actions="$card['actions'] ?? []"
                                :roles="$card['roles'] ?? []"
                                :formFields="$card['formFields'] ?? null"
                                :expectedResult="$card['expectedResult'] ?? ''"
                                :icon="$card['icon'] ?? 'bi-card-text'"
                                :color="$card['color'] ?? 'primary'"
                            />
                        </div>
                    @endforeach
                </div>
            </div>
        @empty
            <p class="text-muted text-center py-4">Aucune section de guide pour ce profil.</p>
        @endforelse
    </section>
    </div>
</x-guide-page>

<x-procedure-preview-modal />

<script src="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css"/>
<script>
document.addEventListener('DOMContentLoaded', function() {
    var currentSteps = [];
    var modalEl = document.getElementById('procedurePreviewModal');
    if (!modalEl) return;

    // Remplir le modal au clic sur une carte (Bootstrap 5 ouvre le modal après le clic)
    modalEl.addEventListener('show.bs.modal', function(event) {
        var button = event.relatedTarget;
        if (!button || !button.classList.contains('procedure-card')) return;
        var title = button.getAttribute('data-proc-title') || '';
        var description = button.getAttribute('data-proc-description') || '';
        var acteurs = button.getAttribute('data-proc-acteurs') || '—';
        var livrable = button.getAttribute('data-proc-livrable') || '—';
        var icon = button.getAttribute('data-proc-icon') || 'bi-list-check';
        var color = button.getAttribute('data-proc-color') || '#64748b';
        var stepsJson = button.getAttribute('data-proc-steps');
        currentSteps = stepsJson ? JSON.parse(stepsJson) : [];

        document.getElementById('procedurePreviewModalLabel').textContent = title;
        document.getElementById('procedurePreviewSubtitle').textContent = 'Résumé de la procédure';
        document.getElementById('procedurePreviewDescription').textContent = description;
        document.getElementById('procedurePreviewActors').textContent = acteurs;
        document.getElementById('procedurePreviewDeliverable').textContent = livrable;

        var iconWrap = document.getElementById('procedurePreviewIcon');
        iconWrap.style.backgroundColor = color + '22';
        iconWrap.style.color = color;
        var iconClass = document.getElementById('procedurePreviewIconClass');
        iconClass.className = 'bi ' + icon + ' fs-4';

        var stepsList = document.getElementById('procedurePreviewSteps');
        var stepsWrap = document.getElementById('procedurePreviewStepsWrap');
        stepsList.innerHTML = '';
        if (currentSteps && currentSteps.length > 0) {
            currentSteps.forEach(function(s, i) {
                var li = document.createElement('li');
                li.className = 'd-flex gap-2 mb-2';
                li.innerHTML = '<span class="fw-semibold text-muted flex-shrink-0">' + (i + 1) + '.</span><span>' + (s.title || '') + (s.description ? ' — ' + s.description : '') + '</span>';
                stepsList.appendChild(li);
            });
            stepsWrap.style.display = 'block';
        } else {
            stepsWrap.style.display = 'none';
        }
    });

    document.getElementById('procedurePreviewLaunchDemo').addEventListener('click', function() {
        if (!currentSteps || currentSteps.length === 0) return;
        var driverSteps = currentSteps.map(function(s) {
            var el = (s.element && s.element !== 'body') ? s.element : 'body';
            return { element: el, popover: { title: s.title, description: s.description || '', side: 'right', align: 'start' } };
        });
        var driverObj = window.driver.js.driver({
            showProgress: true,
            steps: driverSteps,
            nextBtnText: 'Suivant',
            prevBtnText: 'Précédent',
            doneBtnText: 'Terminer',
            progressText: 'Étape @{{current}} sur @{{total}}',
            onDestroyStarted: function() { driverObj.destroy(); }
        });
        var bsModal = typeof bootstrap !== 'undefined' && bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
        driverObj.drive();
    });

    document.getElementById('procedurePreviewGuideComplet').addEventListener('click', function() {
        var bsModal = typeof bootstrap !== 'undefined' && bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
        var el = document.getElementById('guide-complet');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});
</script>
@endsection

@section('styles')
<style>
.guide-page-wrapper { overflow-x: hidden; max-width: 100%; }
.guide-content-area { overflow-x: hidden; }
.guide-section .row { margin-left: 0; margin-right: 0; }
.guide-section .row > [class*="col-"] { max-width: 100%; }
.guide-section-heading { letter-spacing: 0.04em; color: #64748b !important; }
.guide-detail-cards-row .col-12 { max-width: 100%; }
.guide-detail-cards-row .col-12 + .col-12 { margin-top: 0; }
.guide-page-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; }
.guide-page-subtitle { font-size: 1rem; }
.guide-role-summary { border-color: #e2e8f0 !important; }
.driver-popover.driverjs-theme { font-family: inherit; }

/* ProcedurePreviewModal : compact, élégant, animation douce */
.procedure-preview-dialog { max-width: 480px; }
.procedure-preview-modal .modal-content { border: none; }
.procedure-preview-modal .modal-header { padding: 1.25rem 1.5rem 0.5rem; }
.procedure-preview-modal .modal-body { padding: 0 1.5rem 1rem; font-size: 0.9375rem; line-height: 1.5; }
.procedure-preview-modal .modal-footer { padding: 0.5rem 1.5rem 1.25rem; }
.procedure-preview-icon { width: 48px; height: 48px; }
.procedure-preview-close:hover { opacity: 0.9; }
.procedure-steps-list li { padding-left: 0; }
.procedure-preview-modal.modal.fade .modal-dialog { transition: transform 0.25s ease-out, opacity 0.25s ease-out; transform: scale(0.95); opacity: 0; }
.procedure-preview-modal.modal.show .modal-dialog { transform: scale(1); opacity: 1; }
.procedure-preview-body .procedure-preview-meta .badge { font-weight: 500; }
@media (max-width: 576px) {
    .procedure-preview-dialog { max-width: calc(100vw - 1.5rem); margin: 0.75rem; }
}
</style>
@endsection
