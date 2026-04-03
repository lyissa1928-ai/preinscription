<?php

namespace App\Http\Controllers;

use App\Models\Campus;
use App\Models\MaterialRequest;
use App\Models\AggregatedOrder;
use App\Models\Item;
use App\Models\RequestItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Tableau de suivi logistique — Dashboard DG
 * Vue consolidée : demandes, commandes, inventaires liés.
 * Accès : Director et Point focal.
 */
class LogistiqueDashboardController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->hasAnyRole(['director', 'point_focal', 'super_admin'])) {
                abort(403, 'Accès réservé à la direction et au point focal logistique.');
            }
            return $next($request);
        });
    }

    /**
     * Page Tableau de suivi logistique (Dashboard DG) avec inventaires liés
     */
    public function index(Request $request): View
    {
        $campuses = Campus::orderBy('name')->get();

        // Demandes par campus et par statut
        $demandesParCampus = MaterialRequest::query()
            ->selectRaw('campus_id, status, count(*) as total')
            ->groupBy('campus_id', 'status')
            ->get()
            ->groupBy('campus_id');

        $demandesParStatut = MaterialRequest::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $demandesRecentes = MaterialRequest::with(['campus', 'requester'])
            ->orderByDesc('updated_at')
            ->limit(15)
            ->get();

        // Commandes agrégées
        $commandesParStatut = AggregatedOrder::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $commandesRecentes = AggregatedOrder::with(['supplier'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Inventaire (items) : stock, seuil, alerte
        $itemsLowStock = Item::active()
            ->whereColumn('stock_quantity', '<=', 'reorder_threshold')
            ->orWhere('stock_quantity', '<=', 0)
            ->orderBy('stock_quantity')
            ->with('category')
            ->limit(20)
            ->get();

        $inventaireResume = [
            'total_items' => Item::active()->count(),
            'total_stock_value' => Item::active()->selectRaw('SUM(stock_quantity * COALESCE(unit_cost, 0)) as v')->value('v') ?? 0,
            'low_stock_count' => Item::active()->whereColumn('stock_quantity', '<=', 'reorder_threshold')->count(),
            'out_of_stock_count' => Item::active()->where('stock_quantity', '<=', 0)->count(),
        ];

        // Lignes de demandes (inventaires liés aux demandes)
        $lignesDemandesEnAttente = RequestItem::query()
            ->where('status', 'pending')
            ->with(['materialRequest.campus', 'materialRequest.requester', 'item'])
            ->orderByDesc('created_at')
            ->limit(25)
            ->get();

        $statusLabels = [
            'draft' => 'Brouillon',
            'submitted' => 'Soumise',
            'in_treatment' => 'En cours',
            'approved' => 'Validée',
            'cancelled' => 'Rejetée',
            'delivered' => 'Livrée',
            'received' => 'Réceptionnée',
            'aggregated' => 'Regroupée',
            'partially_received' => 'Part. réceptionnée',
        ];

        $orderStatusLabels = [
            'draft' => 'Brouillon',
            'confirmed' => 'Confirmée',
            'received' => 'Réceptionnée',
            'cancelled' => 'Annulée',
        ];

        return view('tableau-suivi-logistique.index', [
            'campuses' => $campuses,
            'demandesParCampus' => $demandesParCampus,
            'demandesParStatut' => $demandesParStatut,
            'demandesRecentes' => $demandesRecentes,
            'commandesParStatut' => $commandesParStatut,
            'commandesRecentes' => $commandesRecentes,
            'itemsLowStock' => $itemsLowStock,
            'inventaireResume' => $inventaireResume,
            'lignesDemandesEnAttente' => $lignesDemandesEnAttente,
            'statusLabels' => $statusLabels,
            'orderStatusLabels' => $orderStatusLabels,
        ]);
    }

    /**
     * Export CSV (compatible Excel) — Tableau suivi logistique / inventaires liés
     */
    public function export(Request $request): StreamedResponse
    {
        $demandes = MaterialRequest::with(['campus', 'requester', 'department', 'requestItems.item'])
            ->orderBy('campus_id')
            ->orderByDesc('created_at')
            ->get();

        $filename = 'Tableau_suivi_logistique_DASHBOARD_DG_INVENTAIRES_LIES_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($demandes) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM for Excel

            // En-tête synthèse
            fputcsv($out, ['TABLEAU DE SUIVI LOGISTIQUE — DASHBOARD DG — INVENTAIRES LIÉS'], ';');
            fputcsv($out, ['Généré le ' . now()->format('d/m/Y H:i')], ';');
            fputcsv($out, []);

            // Demandes
            fputcsv($out, ['DEMANDES DE MATÉRIEL'], ';');
            fputcsv($out, ['N° demande', 'Campus', 'Demandeur', 'Service', 'Objet', 'Statut', 'Date création', 'Nb lignes'], ';');
            foreach ($demandes as $d) {
                fputcsv($out, [
                    $d->request_number,
                    $d->campus->name ?? '',
                    $d->requester->name ?? '',
                    $d->department->name ?? '',
                    $d->subject ?? '',
                    $d->status,
                    $d->created_at->format('d/m/Y'),
                    $d->requestItems->count(),
                ], ';');
            }
            fputcsv($out, []);

            // Détail des lignes (inventaires liés)
            fputcsv($out, ['INVENTAIRES LIÉS — LIGNES DE DEMANDES'], ';');
            fputcsv($out, ['N° demande', 'Campus', 'Matériel', 'Quantité demandée', 'Statut ligne'], ';');
            foreach ($demandes as $d) {
                foreach ($d->requestItems as $line) {
                    $designation = $line->designation ?: ($line->item ? ($line->item->description ?? $line->item->name ?? '') : '');
                    fputcsv($out, [
                        $d->request_number,
                        $d->campus->name ?? '',
                        $designation,
                        $line->requested_quantity,
                        $line->status,
                    ], ';');
                }
            }
            fputcsv($out, []);

            // Commandes
            $orders = AggregatedOrder::with('supplier')->orderByDesc('created_at')->get();
            fputcsv($out, ['COMMANDES AGRÉGÉES'], ';');
            fputcsv($out, ['N° commande', 'Fournisseur', 'Statut', 'Date'], ';');
            foreach ($orders as $o) {
                fputcsv($out, [
                    $o->po_number,
                    $o->supplier->name ?? '',
                    $o->status,
                    $o->order_date?->format('d/m/Y') ?? '',
                ], ';');
            }
            fputcsv($out, []);

            // Stock (inventaire)
            $items = Item::active()->with('category')->orderBy('description')->get();
            fputcsv($out, ['INVENTAIRE STOCK'], ';');
            fputcsv($out, ['Code', 'Désignation', 'Catégorie', 'Stock', 'Seuil alerte', 'Unité'], ';');
            foreach ($items as $i) {
                fputcsv($out, [
                    $i->code ?? '',
                    $i->description ?? $i->name ?? '',
                    $i->category->name ?? '',
                    $i->stock_quantity,
                    $i->reorder_threshold ?? '',
                    $i->unit ?? '',
                ], ';');
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
