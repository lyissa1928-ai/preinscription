@extends('layouts.app')

@section('title', 'Rapport mensuel par campus - ESEBAT')
@section('page-title', 'Rapport mensuel par campus')

@php
    $reportLogo = class_exists(\App\Models\Setting::class) ? \App\Models\Setting::resolveLogoUrl() : null;
    if (!$reportLogo && file_exists(public_path('logo.png'))) { $reportLogo = asset('logo.png'); }
    if (!$reportLogo && file_exists(public_path('logo.svg'))) { $reportLogo = asset('logo.svg'); }
@endphp

@section('content')
<div class="report-header print-only mb-3 text-center d-none" style="border-bottom: 2px solid #EA580C; padding-bottom: 0.5rem;">
    @if ($reportLogo ?? null)
        <img src="{{ url($reportLogo) }}" alt="ESEBAT" style="max-height: 48px; width: auto;">
    @else
        <strong style="color: #C2410C; font-size: 1.25rem;">ESEBAT</strong>
    @endif
    <div class="mt-1" style="color: #1F2937; font-weight: 600;">Rapport mensuel par campus — Identité institutionnelle</div>
</div>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h5>État des lieux mensuel</h5>
    <div class="d-flex gap-2 align-items-center">
        <a href="{{ route('reports.campus-monthly.export', ['month' => $month, 'campus_id' => $campusId, 'format' => 'csv']) }}" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-file-earmark-spreadsheet"></i> Export Excel (CSV)
        </a>
        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.print();">
            <i class="bi bi-printer"></i> Imprimer / PDF
        </button>
    </div>
</div>

<form method="GET" class="card mb-4">
    <div class="card-body row g-3 align-items-end">
        <div class="col-md-3">
            <label for="month" class="form-label">Mois</label>
            <input type="month" name="month" id="month" class="form-control form-control-sm" value="{{ $month }}">
        </div>
        <div class="col-md-4">
            <label for="campus_id" class="form-label">Campus</label>
            <select name="campus_id" id="campus_id" class="form-select form-select-sm">
                <option value="">Tous les campus</option>
                @foreach ($campuses as $c)
                    <option value="{{ $c->id }}" {{ $campusId == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                @endforeach
            </select>
        </div>
        <div class="col-md-2">
            <button type="submit" class="btn btn-primary btn-sm">Actualiser</button>
        </div>
    </div>
</form>

<p class="text-muted small mb-3">Période : du {{ $start->format('d/m/Y') }} au {{ $end->format('d/m/Y') }}.</p>

<div class="card no-print">
    <div class="card-header">
        <h6 class="mb-0">Synthèse par campus</h6>
    </div>
    <div class="table-responsive">
        <table class="table table-bordered table-hover mb-0">
            <thead>
                <tr>
                    <th>Campus</th>
                    <th class="text-end">Demandes effectuées</th>
                    <th class="text-end">Demandes validées</th>
                    <th class="text-end">Demandes livrées</th>
                    <th class="text-end">Quantités distribuées (période)</th>
                    <th class="text-end">Stock restant (total)</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($data as $row)
                    <tr>
                        <td><strong>{{ $row['campus']->name }}</strong></td>
                        <td class="text-end">{{ number_format($row['demandes_effectuees'], 0, ',', ' ') }}</td>
                        <td class="text-end">{{ number_format($row['demandes_validees'], 0, ',', ' ') }}</td>
                        <td class="text-end">{{ number_format($row['demandes_livrees'], 0, ',', ' ') }}</td>
                        <td class="text-end">{{ number_format($row['quantites_distribuees_periode'], 0, ',', ' ') }}</td>
                        <td class="text-end">{{ number_format($row['stock_restant_campus'], 0, ',', ' ') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="text-center text-muted">Aucune donnée pour cette période.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>

<div class="mt-4 small text-muted">
    <strong>Légende :</strong> Demandes effectuées = créées dans la période ; Demandes validées = approuvées dans la période ; Demandes livrées = clôturées/livrées dans la période ; Quantités distribuées = mouvements « distribué » des utilisateurs du campus dans la période ; Stock restant = total reçu − total distribué pour le campus (toutes périodes).
</div>

<style media="print">
    .no-print, .sidebar, .topbar, .btn, nav, .content-wrapper .d-flex.mb-4 .btn { display: none !important; }
    .print-only { display: block !important; }
    .content-wrapper { margin: 0; }
    body { font-size: 12px; }
    .card { border: 1px solid #ddd; }
    table { font-size: 11px; }
    thead th { background: #EA580C !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
<style>
    .print-only { display: none; }
</style>
@endsection
