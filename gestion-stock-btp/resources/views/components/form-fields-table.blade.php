{{--
  GuideFormTable : tableau pédagogique Champ | Description | Type | Obligatoire | Exemple | Règle métier.
  Moderne, lisible, intégré au thème.
--}}
@props([
    'fields' => [],
    'title' => 'Champs du formulaire',
    'showRegle' => true,
])

@if (count($fields) > 0)
<div class="form-fields-table-wrapper w-100 overflow-hidden guide-form-table">
    @if ($title)
        <p class="small fw-semibold text-dark mb-2">{{ $title }}</p>
    @endif
    <div class="table-responsive rounded-3 overflow-hidden guide-form-table-inner" style="max-width: 100%; border: 1px solid #e2e8f0;">
        <table class="table table-bordered mb-0 form-fields-table" style="table-layout: fixed; width: 100%;">
            <thead>
                <tr>
                    <th style="width: {{ $showRegle ? '12%' : '16%' }};">Champ</th>
                    <th style="width: {{ $showRegle ? '22%' : '28%' }};">Description</th>
                    <th style="width: 14%;">Type</th>
                    <th style="width: 10%;">Obligatoire</th>
                    <th style="width: {{ $showRegle ? '20%' : '28%' }};">Exemple</th>
                    @if ($showRegle)
                        <th style="width: 22%;">Règle métier</th>
                    @endif
                </tr>
            </thead>
            <tbody>
                @foreach ($fields as $row)
                <tr>
                    <td class="fw-semibold text-dark small text-break">{{ $row['champ'] ?? '' }}</td>
                    <td class="text-body small text-break">{{ $row['description'] ?? '—' }}</td>
                    <td class="small text-break text-body">{{ $row['type'] ?? '—' }}</td>
                    <td>
                        @if (isset($row['obligatoire']) && strtolower($row['obligatoire']) === 'oui')
                            <span class="badge rounded-pill px-2 py-1 form-field-obligatoire-oui">Oui</span>
                        @else
                            <span class="badge rounded-pill px-2 py-1 form-field-obligatoire-non">Optionnel</span>
                        @endif
                    </td>
                    <td class="small text-body text-break">{{ $row['exemple'] ?? '—' }}</td>
                    @if ($showRegle)
                        <td class="small text-break text-body">{{ $row['regle'] ?? '—' }}</td>
                    @endif
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</div>
@endif

<style>
.guide-form-table-inner { background: #fff; }
.guide-form-table .form-fields-table th {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #475569;
    background: #f8fafc;
    border-color: #e2e8f0;
    padding: 0.625rem 0.75rem;
}
.guide-form-table .form-fields-table td {
    font-size: 0.8125rem;
    vertical-align: middle;
    word-wrap: break-word;
    overflow-wrap: break-word;
    padding: 0.5rem 0.75rem;
    border-color: #e2e8f0;
}
.guide-form-table .form-fields-table tbody tr:hover { background-color: #fafafa; }
.form-field-obligatoire-oui { background: #fef2f2 !important; color: #dc2626 !important; font-weight: 600; }
.form-field-obligatoire-non { background: #f1f5f9 !important; color: #64748b !important; }
@media (max-width: 576px) {
    .guide-form-table .form-fields-table th, .guide-form-table .form-fields-table td { font-size: 0.75rem; padding: 0.4rem 0.5rem; }
}
</style>
