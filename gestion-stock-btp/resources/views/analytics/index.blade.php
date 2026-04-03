@extends('layouts.app')

@section('title', 'Statistiques & analyse - ESEBAT')
@section('page-title', 'Statistiques des demandes par campus')

@section('content')
<form method="GET" class="row g-2 mb-4">
    <div class="col-md-4">
        <label class="form-label small">Filtrer par campus</label>
        <select name="campus_id" class="form-select form-select-sm" onchange="this.form.submit()">
            <option value="">Tous les campus</option>
            @foreach ($campuses as $c)
                <option value="{{ $c->id }}" {{ $filterCampusId == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
            @endforeach
        </select>
    </div>
</form>

<!-- KPI -->
<div class="row mb-4">
    <div class="col-md-4">
        <div class="kpi-card">
            <i class="bi bi-calendar-month" style="font-size: 28px; color: #2563eb;"></i>
            <div class="label">Demandes ce mois</div>
            <div class="value">{{ $countMonth }}</div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="kpi-card">
            <i class="bi bi-calendar-year" style="font-size: 28px; color: #10b981;"></i>
            <div class="label">Demandes cette année</div>
            <div class="value">{{ $countYear }}</div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="kpi-card">
            <i class="bi bi-trophy" style="font-size: 28px; color: #f59e0b;"></i>
            <div class="label">Campus enregistrés</div>
            <div class="value">{{ count($ranking) }}</div>
        </div>
    </div>
</div>

<!-- Top campus + Classement : conteneur à hauteur fixe pour éviter débordement -->
<div class="row">
    <div class="col-lg-6 mb-4">
        <div class="card h-100">
            <div class="card-header"><i class="bi bi-bar-chart"></i> Top des campus les plus demandeurs</div>
            <div class="card-body position-relative overflow-hidden">
                <div class="chart-container" style="height: 280px; max-height: 100%; min-height: 200px;">
                    <canvas id="chartByCampus"></canvas>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-6 mb-4">
        <div class="card h-100">
            <div class="card-header"><i class="bi bi-graph-up"></i> Évolution mensuelle des demandes</div>
            <div class="card-body position-relative overflow-hidden">
                <div class="chart-container" style="height: 280px; max-height: 100%; min-height: 200px;">
                    <canvas id="chartMonthly"></canvas>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Classement + Détail par mois : même largeur, colonnes adaptatives (CSS global) -->
<div class="row g-4">
    <div class="col-12 col-lg-6">
        <div class="card h-100">
            <div class="card-header"><i class="bi bi-trophy"></i> Classement des campus par volume de demandes</div>
            <div class="table-responsive">
                <table class="table table-hover table-sm mb-0">
                    <thead>
                        <tr>
                            <th class="text-center">Rang</th>
                            <th class="text-start">Campus</th>
                            <th class="text-center">Code</th>
                            <th class="text-end">Demandes</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($ranking as $row)
                            <tr>
                                <td class="text-center">
                                    @if ($row['rank'] <= 3)
                                        <span class="badge bg-{{ $row['rank'] == 1 ? 'warning' : ($row['rank'] == 2 ? 'secondary' : 'danger') }} text-dark">{{ $row['rank'] }}</span>
                                    @else
                                        {{ $row['rank'] }}
                                    @endif
                                </td>
                                <td class="text-start"><strong>{{ $row['campus_name'] }}</strong></td>
                                <td class="text-center"><code>{{ $row['campus_code'] }}</code></td>
                                <td class="text-end">{{ $row['total'] }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="4" class="text-center py-4 text-muted">Aucune donnée.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="col-12 col-lg-6">
        @if (count($monthlyEvolution) > 0)
        <div class="card h-100">
            <div class="card-header"><i class="bi bi-calendar3"></i> Détail par mois</div>
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead>
                        <tr>
                            <th class="text-start">Mois</th>
                            <th class="text-end">Demandes</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach (array_reverse($monthlyEvolution) as $row)
                            <tr>
                                <td class="text-start">{{ \Carbon\Carbon::createFromFormat('Y-m', $row['month'])->translatedFormat('F Y') }}</td>
                                <td class="text-end">{{ $row['total'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
        @else
        <div class="card h-100">
            <div class="card-header"><i class="bi bi-calendar3"></i> Détail par mois</div>
            <div class="card-body text-center text-muted py-4">Aucune donnée mensuelle.</div>
        </div>
        @endif
    </div>
</div>
@endsection

@section('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

    // Graphique par campus (barres à bords arrondis, style template)
    const ctxCampus = document.getElementById('chartByCampus');
    if (ctxCampus) {
        new Chart(ctxCampus, {
            type: 'bar',
            data: {
                labels: @json($chartByCampus['labels']),
                datasets: [{
                    label: 'Nombre de demandes',
                    data: @json($chartByCampus['data']),
                    backgroundColor: colors.slice(0, {{ count($chartByCampus['data']) }}),
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }

    // Graphique évolution mensuelle (courbes lisses, style template)
    const ctxMonthly = document.getElementById('chartMonthly');
    if (ctxMonthly) {
        new Chart(ctxMonthly, {
            type: 'line',
            data: {
                labels: @json($chartMonthly['labels']),
                datasets: [{
                    label: 'Demandes',
                    data: @json($chartMonthly['data']),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
});
</script>
@endsection

@section('styles')
<style>
.chart-container { width: 100%; overflow: hidden; }
.chart-container canvas { max-width: 100% !important; max-height: 280px !important; }
</style>
@endsection
