<?php

namespace App\Http\Controllers;

use App\Models\Campus;
use App\Models\MaterialRequest;
use App\Models\UserStockMovement;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;

/**
 * État des lieux mensuel par campus pour le point focal.
 * Tableaux : demandes effectuées, validées, livrées, quantités distribuées, stocks restants.
 */
class CampusMonthlyReportController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
                abort(403, 'Accès réservé au point focal et au directeur.');
            }
            return $next($request);
        });
    }

    /**
     * Rapport mensuel : sélection du mois et du campus, tableaux synthétiques.
     */
    public function index(Request $request): View
    {
        $month = $request->input('month', now()->format('Y-m'));
        $campusId = $request->input('campus_id');
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $campuses = Campus::active()->orderBy('name')->get();
        $data = $this->buildMonthlyData($start, $end, $campusId);

        return view('reports.campus-monthly.index', [
            'month' => $month,
            'campusId' => $campusId,
            'campuses' => $campuses,
            'data' => $data,
            'start' => $start,
            'end' => $end,
        ]);
    }

    /**
     * Construit les données du rapport : par campus, demandes, validées, livrées, distribuées, stocks restants.
     */
    private function buildMonthlyData(Carbon $start, Carbon $end, ?int $filterCampusId): array
    {
        $queryCampus = $filterCampusId
            ? Campus::where('id', $filterCampusId)
            : Campus::active()->orderBy('name');
        $campuses = $queryCampus->get();

        $result = [];
        foreach ($campuses as $campus) {
            $cid = $campus->id;

            $requestsQuery = MaterialRequest::where('campus_id', $cid)
                ->whereBetween('created_at', [$start, $end]);
            $demandesEffectuees = (clone $requestsQuery)->count();

            $requestsApproved = MaterialRequest::where('campus_id', $cid)
                ->whereIn('status', ['approved', 'aggregated', 'partially_received', 'received', 'delivered'])
                ->whereBetween('approved_at', [$start, $end]);
            $demandesValidees = (clone $requestsApproved)->count();

            $requestsDelivered = MaterialRequest::where('campus_id', $cid)
                ->where('status', 'delivered')
                ->whereBetween('updated_at', [$start, $end]);
            $demandesLivrees = (clone $requestsDelivered)->count();

            $usersCampus = \App\Models\User::where('campus_id', $cid)->pluck('id');
            $distributedQty = UserStockMovement::where('type', 'distributed')
                ->whereIn('user_id', $usersCampus)
                ->whereBetween('created_at', [$start, $end])
                ->sum('quantity');

            $receivedQty = UserStockMovement::where('type', 'received')
                ->whereIn('user_id', $usersCampus)
                ->sum('quantity');
            $distributedTotal = UserStockMovement::where('type', 'distributed')
                ->whereIn('user_id', $usersCampus)
                ->sum('quantity');
            $stockRestant = $receivedQty - $distributedTotal;

            $result[] = [
                'campus' => $campus,
                'demandes_effectuees' => $demandesEffectuees,
                'demandes_validees' => $demandesValidees,
                'demandes_livrees' => $demandesLivrees,
                'quantites_distribuees_periode' => $distributedQty,
                'stock_restant_campus' => max(0, $stockRestant),
            ];
        }

        return $result;
    }

    /**
     * Export rapport mensuel : CSV (Excel) ou impression PDF.
     */
    public function export(Request $request)
    {
        $month = $request->input('month', now()->format('Y-m'));
        $campusId = $request->input('campus_id');
        $format = $request->input('format', 'csv');
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $data = $this->buildMonthlyData($start, $end, $campusId);

        if ($format === 'csv') {
            $csv = "ESEBAT - Rapport mensuel par campus\n";
            $csv .= "Période;{$month}\n";
            $csv .= "Généré le;" . now()->format('d/m/Y H:i') . "\n\n";
            $csv .= "Campus;Demandes effectuées;Demandes validées;Demandes livrées;Quantités distribuées (période);Stock restant (total)\n";
            foreach ($data as $row) {
                $csv .= sprintf(
                    "%s;%s;%s;%s;%s;%s\n",
                    $row['campus']->name,
                    $row['demandes_effectuees'],
                    $row['demandes_validees'],
                    $row['demandes_livrees'],
                    $row['quantites_distribuees_periode'],
                    $row['stock_restant_campus']
                );
            }
            $filename = 'rapport-campus-' . $month . '.csv';
            return Response::make("\xEF\xBB\xBF" . $csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        }

        return redirect()->route('reports.campus-monthly.index', $request->only('month', 'campus_id'));
    }
}
