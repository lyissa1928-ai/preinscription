<?php

namespace App\Services;

use App\Models\Campus;
use App\Models\MaterialRequest;
use Illuminate\Support\Facades\DB;

/**
 * RequestStatisticsService
 *
 * Statistiques des demandes de commandes par campus :
 * - volume par campus, classement, évolution mensuelle
 * - top campus demandeurs, commandes par mois / année
 */
class RequestStatisticsService
{
    /**
     * Nombre total de demandes par campus (tous statuts)
     */
    public function totalRequestsByCampus(): array
    {
        return MaterialRequest::query()
            ->select('campus_id', DB::raw('count(*) as total'))
            ->groupBy('campus_id')
            ->with('campus:id,name,code')
            ->get()
            ->map(function ($row) {
                return [
                    'campus_id'   => $row->campus_id,
                    'campus_name' => $row->campus->name ?? '—',
                    'campus_code' => $row->campus->code ?? '',
                    'total'       => (int) $row->total,
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->all();
    }

    /**
     * Classement des campus par volume de demandes (avec rang)
     */
    public function rankingByCampus(): array
    {
        $rows = $this->totalRequestsByCampus();
        $rank = 1;
        foreach ($rows as &$row) {
            $row['rank'] = $rank++;
        }
        return $rows;
    }

    /**
     * Top N campus les plus demandeurs
     */
    public function topRequestingCampuses(int $limit = 10): array
    {
        return array_slice($this->rankingByCampus(), 0, $limit);
    }

    /**
     * Évolution mensuelle des demandes (tous campus ou un campus)
     */
    public function monthlyEvolution(?int $campusId = null, int $months = 12): array
    {
        $start = now()->subMonths($months);
        $query = MaterialRequest::query()->where('created_at', '>=', $start);
        if ($campusId) {
            $query->where('campus_id', $campusId);
        }
        $requests = $query->get(['id', 'created_at']);
        $byMonth = [];
        foreach ($requests as $r) {
            $key = $r->created_at->format('Y-m');
            $byMonth[$key] = ($byMonth[$key] ?? 0) + 1;
        }
        ksort($byMonth);
        return collect($byMonth)->map(fn ($total, $month) => ['month' => $month, 'total' => $total])->values()->all();
    }

    /**
     * Nombre de demandes pour le mois en cours
     */
    public function countCurrentMonth(?int $campusId = null): int
    {
        $query = MaterialRequest::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year);
        if ($campusId) {
            $query->where('campus_id', $campusId);
        }
        return $query->count();
    }

    /**
     * Nombre de demandes pour l'année en cours
     */
    public function countCurrentYear(?int $campusId = null): int
    {
        $query = MaterialRequest::whereYear('created_at', now()->year);
        if ($campusId) {
            $query->where('campus_id', $campusId);
        }
        return $query->count();
    }

    /**
     * Agrégation pour graphique : par mois sur les N derniers mois
     */
    public function chartDataMonthly(int $months = 12): array
    {
        $start = now()->subMonths($months)->startOfMonth();
        $requests = MaterialRequest::where('created_at', '>=', $start)->get(['created_at']);
        $byMonth = [];
        foreach ($requests as $r) {
            $key = $r->created_at->format('Y-m');
            $byMonth[$key] = ($byMonth[$key] ?? 0) + 1;
        }
        $labels = [];
        $data = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $d = now()->subMonths($i);
            $key = $d->format('Y-m');
            $labels[] = $d->format('m/Y');
            $data[] = (int) ($byMonth[$key] ?? 0);
        }
        return ['labels' => $labels, 'data' => $data];
    }

    /**
     * Données pour graphique par campus (top N)
     */
    public function chartDataByCampus(int $limit = 10): array
    {
        $top = $this->topRequestingCampuses($limit);
        return [
            'labels' => array_column($top, 'campus_name'),
            'data'   => array_column($top, 'total'),
        ];
    }
}
