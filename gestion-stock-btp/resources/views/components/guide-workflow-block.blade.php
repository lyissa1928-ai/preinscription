{{--
  Bloc visuel de workflow : timeline horizontale / stepper pour expliquer le parcours d'un rôle.
  Usage : étapes affichées en blocs reliés, style premium (Stripe / Linear).
--}}
@props([
    'workflows' => [], // array of { title: string, steps: string[] }
    'variant' => 'timeline', // timeline | stepper
])

@if (count($workflows) > 0)
<div class="guide-workflow-block">
    @foreach ($workflows as $wf)
        <div class="workflow-item mb-4">
            <h4 class="workflow-title h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i class="bi bi-diagram-3 text-primary"></i>
                {{ $wf['title'] ?? 'Workflow' }}
            </h4>
            <div class="workflow-steps d-flex flex-wrap align-items-center gap-2">
                @foreach ($wf['steps'] ?? [] as $index => $step)
                    <div class="workflow-step d-flex align-items-center gap-2">
                        <span class="workflow-step-badge rounded-3 px-3 py-2 shadow-sm">
                            <span class="workflow-step-num rounded-circle me-2">{{ $index + 1 }}</span>
                            {{ $step }}
                        </span>
                        @if ($index < count($wf['steps']) - 1)
                            <i class="bi bi-chevron-right workflow-step-arrow text-muted small"></i>
                        @endif
                    </div>
                @endforeach
            </div>
        </div>
    @endforeach
</div>

<style>
.guide-workflow-block { font-size: 0.9375rem; }
.workflow-step-badge {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #334155;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.workflow-step-badge:hover { border-color: #2563eb; box-shadow: 0 2px 8px rgba(37,99,235,.12); }
.workflow-step-num {
    width: 22px;
    height: 22px;
    background: #2563eb;
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.workflow-step-arrow { flex-shrink: 0; opacity: 0.7; }
@media (max-width: 768px) {
    .workflow-steps { flex-direction: column; align-items: flex-start !important; }
    .workflow-step-arrow { transform: rotate(90deg); margin-left: 0.5rem; }
}
</style>
@endif
