<?php

namespace App\Http\Controllers;

use App\Services\RequestStatisticsService;
use App\Models\Campus;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * AnalyticsController
 *
 * Module d'analyse des demandes par campus :
 * top campus demandeurs, volume par mois/année, classement, évolution.
 * Accès : Director et Point focal logistique.
 */
class AnalyticsController extends Controller
{
    public function __construct(
        private RequestStatisticsService $stats
    ) {}

    public function index(Request $request): View
    {
        $this->authorizeAnalytics($request);

        $campusId = $request->query('campus_id') ? (int) $request->query('campus_id') : null;

        $topCampuses = $this->stats->topRequestingCampuses(15);
        $ranking = $this->stats->rankingByCampus();
        $countMonth = $this->stats->countCurrentMonth($campusId);
        $countYear = $this->stats->countCurrentYear($campusId);
        $monthlyEvolution = $this->stats->monthlyEvolution($campusId, 12);
        $chartMonthly = $this->stats->chartDataMonthly(12);
        $chartByCampus = $this->stats->chartDataByCampus(10);

        $campuses = Campus::orderBy('name')->get();

        return view('analytics.index', [
            'topCampuses'     => $topCampuses,
            'ranking'         => $ranking,
            'countMonth'      => $countMonth,
            'countYear'      => $countYear,
            'monthlyEvolution'=> $monthlyEvolution,
            'chartMonthly'    => $chartMonthly,
            'chartByCampus'   => $chartByCampus,
            'campuses'        => $campuses,
            'filterCampusId'  => $campusId,
        ]);
    }

    private function authorizeAnalytics(Request $request): void
    {
        if (!$request->user()->hasAnyRole(['director', 'point_focal', 'super_admin'])) {
            abort(403, 'Accès réservé à la direction et au point focal logistique.');
        }
    }
}
