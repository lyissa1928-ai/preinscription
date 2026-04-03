<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Guide utilisateur — ESEBAT ({{ $profileLabel }})</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root { --primary: #2563eb; --success: #10b981; --info: #06b6d4; --warning: #f59e0b; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; line-height: 1.5; }
        .pdf-cover { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; border-bottom: 3px solid var(--primary); }
        .pdf-cover .logo-area { width: 120px; height: 120px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; background: rgba(37,99,235,.08); border-radius: 1rem; font-size: 2.5rem; color: var(--primary); }
        .pdf-cover h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
        .pdf-cover .subtitle { font-size: 1rem; color: #64748b; }
        .pdf-cover .profile { margin-top: 1rem; font-size: 0.9375rem; color: var(--primary); font-weight: 600; }
        .no-print { margin: 1rem; }
        @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            .pdf-cover { min-height: 100vh; page-break-after: always; }
            .guide-section { page-break-inside: avoid; }
            .guide-detail-card-pdf { page-break-inside: avoid; }
            .diagram-page { page-break-before: always; page-break-after: avoid; }
        }
        .guide-section-title { font-size: 0.875rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
        .guide-detail-card-pdf { border-left: 4px solid var(--primary); background: #f8fafc; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
        .guide-detail-card-pdf .card-title { font-size: 0.9375rem; font-weight: 700; margin-bottom: 0.5rem; }
        .guide-detail-card-pdf .card-desc { font-size: 0.8125rem; color: #475569; margin-bottom: 0.5rem; }
        .guide-detail-card-pdf ul { font-size: 0.8125rem; margin-bottom: 0.5rem; padding-left: 1.25rem; }
        .guide-detail-card-pdf .result-box { font-size: 0.8125rem; background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.3); border-radius: 0.375rem; padding: 0.5rem; margin-top: 0.5rem; }
        .form-table-pdf { font-size: 0.75rem; width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .form-table-pdf th, .form-table-pdf td { border: 1px solid #e2e8f0; padding: 0.375rem 0.5rem; text-align: left; }
        .form-table-pdf th { background: #f1f5f9; font-weight: 600; }
        .diagram-page { padding: 1.5rem 0; }
        .diagram-page h2 { font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: #1e293b; }
        .flow-row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
        .flow-box { padding: 0.5rem 1rem; border: 2px solid var(--primary); background: #fff; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; }
        .flow-arrow { font-size: 1.25rem; color: #94a3b8; }
        .lifecycle-row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.75rem; }
        .lifecycle-box { padding: 0.375rem 0.75rem; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 0.375rem; font-size: 0.8125rem; }
        .diagram-caption { font-size: 0.8125rem; color: #64748b; margin-top: 0.5rem; }
    </style>
</head>
<body>
    <div class="no-print">
        <div class="container">
            <p class="text-muted small mb-2">Cette page est optimisée pour l'impression. Utilisez le bouton ci-dessous ou <kbd>Ctrl+P</kbd> puis « Enregistrer au format PDF ».</p>
            <button type="button" class="btn btn-primary rounded-3" onclick="window.print();">
                <i class="bi bi-file-earmark-pdf me-1"></i> Imprimer / Enregistrer en PDF
            </button>
        </div>
    </div>

    {{-- Page de couverture --}}
    <div class="pdf-cover">
        <div class="logo-area">
            @php
                $logoUrl = null;
                if (class_exists(\App\Models\Setting::class) && \Illuminate\Support\Facades\Schema::hasTable('settings')) {
                    $logoUrl = \App\Models\Setting::resolveLogoUrl();
                }
                if (!$logoUrl && file_exists(public_path('logo.png'))) $logoUrl = asset('logo.png');
                if (!$logoUrl && file_exists(public_path('logo.svg'))) $logoUrl = asset('logo.svg');
            @endphp
            @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="Logo" style="max-width:100%; max-height:100%; object-fit:contain;">
            @else
                <i class="bi bi-building"></i>
            @endif
        </div>
        <h1>Guide utilisateur</h1>
        <p class="subtitle">Plateforme ESEBAT — Logistique & demandes de matériel</p>
        <p class="profile">Profil : {{ $profileLabel }}</p>
        <p class="small text-muted mt-3">Document généré le {{ now()->format('d/m/Y à H:i') }}</p>
    </div>

    <div class="container" style="max-width: 900px;">
        {{-- Workflows par rôle --}}
        @if (!empty($workflows))
            <div class="guide-section mb-4">
                <h2 class="guide-section-title"><i class="bi bi-diagram-3 me-1"></i> Votre parcours</h2>
                @foreach ($workflows as $wf)
                    <div class="workflow-pdf mb-3">
                        <p class="fw-semibold small mb-2">{{ $wf['title'] ?? 'Workflow' }}</p>
                        <div class="d-flex flex-wrap gap-2 align-items-center">
                            @foreach ($wf['steps'] ?? [] as $i => $step)
                                <span class="flow-box">{{ $step }}</span>
                                @if ($i < count($wf['steps']) - 1)
                                    <span class="flow-arrow">→</span>
                                @endif
                            @endforeach
                        </div>
                    </div>
                @endforeach
            </div>
        @endif

        {{-- Sections du guide (cartes) --}}
        @foreach ($guideSections as $section)
            <div class="guide-section">
                <h2 class="guide-section-title"><i class="bi {{ $section['icon'] }} me-1"></i>{{ $section['title'] }}</h2>
                <div class="row">
                    @foreach ($section['cards'] as $card)
                        @php
                            $cardColor = $card['color'] ?? 'primary';
                            $cardBorderColor = ['primary' => '#2563eb', 'success' => '#10b981', 'info' => '#06b6d4', 'warning' => '#f59e0b'][$cardColor] ?? '#64748b';
                        @endphp
                        <div class="col-12 col-md-6 mb-3">
                            <div class="guide-detail-card-pdf" style="border-left-color: {{ $cardBorderColor }};">
                                <div class="card-title">{{ $card['title'] }}</div>
                                <div class="card-desc">{{ $card['description'] }}</div>
                                @if (!empty($card['actions']))
                                    <ul class="mb-0">
                                        @foreach ($card['actions'] as $a)
                                            <li>{{ $a }}</li>
                                        @endforeach
                                    </ul>
                                @endif
                                @if (!empty($card['formFields']))
                                    <table class="form-table-pdf">
                                        <thead><tr><th>Champ</th><th>Description</th><th>Type</th><th>Obligatoire</th><th>Exemple</th><th>Règle métier</th></tr></thead>
                                        <tbody>
                                            @foreach ($card['formFields'] as $f)
                                                <tr>
                                                    <td><strong>{{ $f['champ'] ?? '—' }}</strong></td>
                                                    <td>{{ $f['description'] ?? '—' }}</td>
                                                    <td>{{ $f['type'] ?? '—' }}</td>
                                                    <td>{{ $f['obligatoire'] ?? '—' }}</td>
                                                    <td>{{ $f['exemple'] ?? '—' }}</td>
                                                    <td>{{ $f['regle'] ?? '—' }}</td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                @endif
                                @if (!empty($card['expectedResult']))
                                    <div class="result-box"><strong>Résultat attendu :</strong> {{ $card['expectedResult'] }}</div>
                                @endif
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        @endforeach

        {{-- Schémas --}}
        <div class="diagram-page">
            <h2><i class="bi bi-diagram-3 me-1"></i> Schémas explicatifs</h2>

            <p class="fw-semibold small mt-3 mb-2">Schéma de validation</p>
            <div class="flow-row">
                <span class="flow-box">Demande soumise</span>
                <span class="flow-arrow">→</span>
                <span class="flow-box">Point focal / Directeur</span>
                <span class="flow-arrow">→</span>
                <span class="flow-box">Approuver</span>
                <span class="flow-box" style="border-color: #ef4444;">Rejeter (motif)</span>
                <span class="flow-arrow">→</span>
                <span class="flow-box">Notification demandeur</span>
            </div>
            <p class="diagram-caption">Validation ou rejet avec motif ; le demandeur est notifié du résultat.</p>

            <p class="fw-semibold small mt-4 mb-2">Cycle de vie d'une demande</p>
            <div class="lifecycle-row">
                <span class="lifecycle-box">Brouillon</span>
                <span class="flow-arrow">→</span>
                <span class="lifecycle-box">Soumise</span>
                <span class="flow-arrow">→</span>
                <span class="lifecycle-box">En cours</span>
                <span class="flow-arrow">→</span>
                <span class="lifecycle-box">Validée</span>
                <span class="flow-arrow">→</span>
                <span class="lifecycle-box">Livrée</span>
            </div>
            <p class="diagram-caption">Les demandes passent par ces statuts jusqu'à la livraison.</p>

            <p class="fw-semibold small mt-4 mb-2">Flux de traitement : Staff → Point focal → Validation → Livraison → Stock</p>
            <div class="flow-row">
                <span class="flow-box">Staff</span>
                <span class="flow-arrow">→</span>
                <span class="flow-box">Point focal</span>
                <span class="flow-arrow">→</span>
                <span class="flow-box">Validation</span>
                <span class="flow-arrow">→</span>
                <span class="flow-box">Livraison</span>
                <span class="flow-arrow">→</span>
                <span class="flow-box">Stock</span>
            </div>
            <p class="diagram-caption">Le staff crée la demande ; le point focal valide et suit la livraison ; le stock est mis à jour après réception.</p>

            <p class="fw-semibold small mt-4 mb-2">Traitement par campus</p>
            <div class="flow-row">
                <span class="flow-box">Campus A</span>
                <span class="flow-box">Campus B</span>
                <span class="flow-box">Campus C</span>
            </div>
            <p class="diagram-caption">Chaque campus dispose de ses propres demandes et stocks ; le point focal et le directeur voient tous les campus.</p>

            <p class="fw-semibold small mt-4 mb-2">Parcours demande groupée vs individuelle</p>
            <div class="row small">
                <div class="col-md-6">
                    <div class="flow-box mb-1">Demande individuelle</div>
                    <div class="lifecycle-row">
                        <span class="lifecycle-box">Création</span>
                        <span class="flow-arrow">→</span>
                        <span class="lifecycle-box">Soumission</span>
                        <span class="flow-arrow">→</span>
                        <span class="lifecycle-box">Validation</span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="flow-box mb-1">Demande groupée</div>
                    <div class="lifecycle-row">
                        <span class="lifecycle-box">Création</span>
                        <span class="flow-arrow">→</span>
                        <span class="lifecycle-box">Ajout de lignes</span>
                        <span class="flow-arrow">→</span>
                        <span class="lifecycle-box">Soumission</span>
                        <span class="flow-arrow">→</span>
                        <span class="lifecycle-box">Validation</span>
                    </div>
                </div>
            </div>
            <p class="diagram-caption">Demande individuelle : un demandeur, une demande. Demande groupée : plusieurs contributeurs peuvent ajouter des lignes avant soumission.</p>
        </div>
    </div>

    <script>
        // Optionnel : ouverture automatique de la boîte d'impression (à commenter si non souhaité)
        // window.onload = function() { window.print(); };
    </script>
</body>
</html>
