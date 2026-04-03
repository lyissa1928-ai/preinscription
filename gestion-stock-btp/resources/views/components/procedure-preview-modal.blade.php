{{--
  Fenêtre de prévisualisation d'une procédure : modal compact et stylé.
  Affiche titre, description, acteurs, livrable, étapes principales, et boutons d'action.
  Réutilisable pour toutes les cartes de procédure.
--}}
<div class="modal fade procedure-preview-modal" id="procedurePreviewModal" tabindex="-1" aria-labelledby="procedurePreviewModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable procedure-preview-dialog">
        <div class="modal-content rounded-3 border-0 shadow-lg overflow-hidden">
            <div class="modal-header procedure-preview-header border-0 pb-0">
                <div class="d-flex align-items-center gap-3 w-100">
                    <span class="procedure-preview-icon rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" id="procedurePreviewIcon">
                        <i class="bi bi-list-check fs-4" id="procedurePreviewIconClass"></i>
                    </span>
                    <div class="flex-grow-1 min-w-0">
                        <h5 class="modal-title fw-bold mb-0 text-dark" id="procedurePreviewModalLabel">Procédure</h5>
                        <p class="small text-muted mb-0 mt-1" id="procedurePreviewSubtitle">Résumé de la procédure</p>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary rounded-circle procedure-preview-close flex-shrink-0" data-bs-dismiss="modal" aria-label="Fermer" style="width: 36px; height: 36px; padding: 0;">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
            <div class="modal-body procedure-preview-body pt-3">
                <p class="text-body mb-3" id="procedurePreviewDescription"></p>
                <div class="procedure-preview-meta mb-3">
                    <div class="d-flex align-items-start gap-2 mb-2">
                        <span class="badge bg-light text-dark border rounded-pill px-2 py-1 small"><i class="bi bi-person-vcard me-1"></i> Acteurs</span>
                        <span id="procedurePreviewActors" class="small text-body"></span>
                    </div>
                    <div class="d-flex align-items-start gap-2">
                        <span class="badge bg-light text-dark border rounded-pill px-2 py-1 small"><i class="bi bi-box-seam me-1"></i> Livrable</span>
                        <span id="procedurePreviewDeliverable" class="small text-body"></span>
                    </div>
                </div>
                <div class="procedure-preview-steps mt-3 pt-3 border-top" id="procedurePreviewStepsWrap">
                    <h6 class="fw-semibold text-dark small text-uppercase mb-2">Étapes principales</h6>
                    <ol class="procedure-steps-list list-unstyled mb-0 small" id="procedurePreviewSteps"></ol>
                </div>
            </div>
            <div class="modal-footer procedure-preview-footer border-0 pt-0 flex-wrap gap-2">
                <button type="button" class="btn btn-outline-secondary rounded-2 procedure-btn-guide-complet" id="procedurePreviewGuideComplet">
                    <i class="bi bi-book me-1"></i> Voir le guide complet
                </button>
                <button type="button" class="btn btn-primary rounded-2 procedure-btn-launch-demo" id="procedurePreviewLaunchDemo">
                    <i class="bi bi-play-fill me-1"></i> Lancer la démo
                </button>
            </div>
        </div>
    </div>
</div>
