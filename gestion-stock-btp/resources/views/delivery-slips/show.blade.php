@extends('layouts.app')

@section('title', 'Bon ' . $slip->slip_number . ' - ESEBAT')
@section('page-title', 'Bon de sortie ' . $slip->slip_number')

@section('content')
<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
    <div>
        <span class="badge bg-{{ $slip->type === 'delivery' ? 'success' : 'info' }} fs-6">{{ $slip->type_label }}</span>
        <span class="text-muted ms-2">{{ $slip->performed_at->format('d/m/Y à H:i') }}</span>
    </div>
    <div>
        <a href="{{ route('delivery-slips.index') }}" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i> Liste des bons</a>
        <button type="button" class="btn btn-outline-primary btn-sm" onclick="window.print();"><i class="bi bi-printer"></i> Imprimer</button>
    </div>
</div>

<div class="card print-card">
    <div class="card-header bg-light">
        <strong>BON DE SORTIE</strong> — {{ $slip->slip_number }}
    </div>
    <div class="card-body">
        <table class="table table-borderless table-sm mb-0">
            <tr>
                <th style="width: 28%;" class="text-muted">Type d'opération</th>
                <td>{{ $slip->type_label }}</td>
            </tr>
            <tr>
                <th class="text-muted">Date et heure</th>
                <td>{{ $slip->performed_at->format('d/m/Y H:i') }}</td>
            </tr>
            <tr>
                <th class="text-muted">Matériel / Désignation</th>
                <td>{{ $slip->designation ?? ($slip->item?->description ?? $slip->item?->name ?? '—') }}</td>
            </tr>
            <tr>
                <th class="text-muted">Quantité</th>
                <td><strong>{{ $slip->quantity }}</strong></td>
            </tr>
            <tr>
                <th class="text-muted">Destinataire</th>
                <td>
                    @if ($slip->recipientUser)
                        {{ $slip->recipientUser->display_name ?? $slip->recipientUser->name }}
                        @if ($slip->recipientUser->matricule)
                            <span class="text-muted">({{ $slip->recipientUser->matricule }})</span>
                        @endif
                    @elseif ($slip->recipient_label)
                        {{ $slip->recipient_label }}
                    @else
                        —
                    @endif
                </td>
            </tr>
            <tr>
                <th class="text-muted">Auteur de l'action</th>
                <td>{{ $slip->authorUser->display_name ?? $slip->authorUser->name }} @if ($slip->authorUser->matricule)<span class="text-muted">({{ $slip->authorUser->matricule }})</span>@endif</td>
            </tr>
            @if ($slip->campus)
            <tr>
                <th class="text-muted">Campus</th>
                <td>{{ $slip->campus->name }}</td>
            </tr>
            @endif
            @if ($slip->notes)
            <tr>
                <th class="text-muted">Notes</th>
                <td>{{ $slip->notes }}</td>
            </tr>
            @endif
            @if ($slip->reference_type && $slip->reference_id && $slip->reference_type === \App\Models\MaterialRequest::class)
            <tr>
                <th class="text-muted">Référence demande</th>
                <td><a href="{{ route('material-requests.show', $slip->reference_id) }}">{{ \App\Models\MaterialRequest::find($slip->reference_id)?->request_number ?? $slip->reference_id }}</a></td>
            </tr>
            @endif
        </table>
    </div>
</div>

<style>
@media print {
    .sidebar-mini, .sidebar, header, .btn, .breadcrumb, nav { display: none !important; }
    .main-content { margin: 0 !important; }
    .print-card { box-shadow: none; border: 1px solid #dee2e6; }
}
</style>
@endsection
