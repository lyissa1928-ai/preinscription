<?php

namespace App\Http\Controllers;

use App\Models\AggregatedOrder;
use App\Models\Supplier;
use App\Models\RequestItem;
use App\Http\Requests\CreateAggregatedOrderRequest;
use App\Http\Requests\RecordOrderReceiptRequest;
use App\Services\FederationService;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

/**
 * AggregatedOrderController
 *
 * Manages the federation workflow: aggregating RequestItems into purchase orders.
 * Delegates to FederationService.
 *
 * Rôles métier (à ne pas confondre) :
 * - Création de commande : point_focal uniquement.
 * - Confirmation de commande (brouillon → confirmée) : point_focal uniquement.
 * - Réception de commande (enregistrer les quantités reçues) : point_focal uniquement.
 * - Annulation : point_focal et directeur (pas de réception par le directeur).
 * - Consultation liste/détail : point_focal, directeur, super_admin.
 */
class AggregatedOrderController extends Controller
{
    public function __construct(
        private FederationService $federationService
    ) {}

    /**
     * Display list of aggregated orders
     *
     * @param Request $request
     * @return View|RedirectResponse
     */
    public function index(Request $request): View|RedirectResponse
    {
        $user = $request->user();

        $query = AggregatedOrder::with([
            'supplier',
            'createdBy',
            'aggregatedOrderItems.requestItem.materialRequest'
        ]);

        // Show all orders if Point Focal or Director
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return back()->withErrors(['error' => 'Non autorisé à consulter les commandes.']);
        }

        $tab = $request->get('tab', 'all');
        if ($tab === 'draft') {
            $query->where('status', 'draft');
        } elseif ($tab === 'confirmed') {
            $query->where('status', 'confirmed');
        } elseif ($tab === 'received') {
            $query->where('status', 'received');
        }

        $aggregatedOrders = $query->orderBy('created_at', 'desc')->paginate(15);

        $stats = [
            'total' => AggregatedOrder::count(),
            'draft' => AggregatedOrder::where('status', 'draft')->count(),
            'confirmed' => AggregatedOrder::where('status', 'confirmed')->count(),
            'received' => AggregatedOrder::where('status', 'received')->count(),
        ];

        return view('aggregated-orders.index', [
            'aggregatedOrders' => $aggregatedOrders,
            'stats' => $stats,
        ]);
    }

    /**
     * Show form to create aggregated order
     *
     * Display pending request items grouped by supplier
     * Point Focal selects items and supplier for PO creation
     *
     * @param Request $request
     * @return View
     */
    public function create(Request $request): View
    {
        if (!$request->user()->hasRole('point_focal')) {
            abort(403, 'Seul le point focal peut créer des commandes.');
        }

        // Get pending items grouped by supplier suggestion
        $pendingItems = $this->federationService->getPendingItemsForAggregation()
            ->load(['materialRequest.campus', 'item.supplier']);

        // Ne garder que les lignes avec un article et un fournisseur valides
        $pendingItems = $pendingItems->filter(fn ($ri) => $ri->item && $ri->item->supplier_id);

        // Group by item supplier for quick selection
        $supplierSuggestions = $pendingItems
            ->groupBy('item.supplier_id')
            ->map(fn ($items) => [
                'supplier_id' => $items->first()->item->supplier_id,
                'supplier_name' => $items->first()->item->supplier?->name ?? '—',
                'items_count' => $items->count(),
            ])
            ->filter(fn ($s) => $s['supplier_id'] !== null)
            ->values();

        $suppliers = Supplier::active()->orderBy('name')->get();

        return view('aggregated-orders.create', [
            'pendingItems' => $pendingItems,
            'suppliers' => $suppliers,
            'supplierSuggestions' => $supplierSuggestions,
        ]);
    }

    /**
     * Store newly created aggregated order
     *
     * Creates purchase order and links request items
     * Uses DB::transaction for atomicity
     *
     * @param CreateAggregatedOrderRequest $request
     * @return RedirectResponse
     */
    public function store(CreateAggregatedOrderRequest $request): RedirectResponse
    {
        try {
            $validated = $request->validated();

            $order = $this->federationService->aggregateRequestItems(
                Supplier::findOrFail($validated['supplier_id']),
                $validated['request_item_ids'],
                $request->user(),
                [
                    'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ]
            );

            return redirect()
                ->route('aggregated-orders.show', $order)
                ->with('success', "Commande créée avec {$order->aggregatedOrderItems->count()} article(s).");
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Error creating order: ' . $e->getMessage()]);
        }
    }

    /**
     * Display specific aggregated order
     *
     * @param AggregatedOrder $order
     * @return View
     */
    public function show(AggregatedOrder $order): View
    {
        $order->load([
            'supplier',
            'createdBy',
            'aggregatedOrderItems.requestItem.materialRequest',
            'aggregatedOrderItems.requestItem.item',
        ]);

        return view('aggregated-orders.show', [
            'order' => $order,
            'canConfirm' => auth()->user()->hasRole('point_focal') && $order->status === 'draft',
            'canReceive' => auth()->user()->hasRole('point_focal') && $order->status === 'confirmed',
            'canCancel' => auth()->user()->hasAnyRole(['point_focal', 'director']) && 
                          !in_array($order->status, ['received', 'cancelled']),
        ]);
    }

    /**
     * Confirm draft order
     *
     * Transitions order from draft to confirmed
     * Updates RequestItems status accordingly
     *
     * @param AggregatedOrder $order
     * @param Request $request
     * @return RedirectResponse
     */
    public function confirm(AggregatedOrder $order, Request $request): RedirectResponse
    {
        if (!$request->user()->hasRole('point_focal')) {
            abort(403, 'Seul le point focal peut confirmer les commandes.');
        }

        try {
            $this->federationService->confirmOrder($order, $request->user());

            return redirect()
                ->route('aggregated-orders.show', $order)
                ->with('success', 'Commande confirmée. En attente de réception.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Show form to record order receipt
     *
     * Display items due for receipt with quantity tracking
     *
     * @param AggregatedOrder $order
     * @return View|RedirectResponse
     */
    public function receiveForm(AggregatedOrder $order): View|RedirectResponse
    {
        if ($order->status !== 'confirmed') {
            return back()->withErrors(['error' => 'Seules les commandes confirmées peuvent être réceptionnées.']);
        }

        return view('aggregated-orders.receive', [
            'order' => $order->load([
                'aggregatedOrderItems.requestItem.materialRequest',
                'aggregatedOrderItems.requestItem.item',
            ]),
        ]);
    }

    /**
     * Record order receipt
     *
     * Updates quantities received, transitions items, records stock changes
     * Updates RequestItems receipt status and MaterialRequests accordingly
     *
     * @param AggregatedOrder $order
     * @param RecordOrderReceiptRequest $request
     * @return RedirectResponse
     */
    public function receive(AggregatedOrder $order, RecordOrderReceiptRequest $request): RedirectResponse
    {
        try {
            $validated = $request->validated();

            // Transform items array to map for service
            $itemQuantities = [];
            foreach ($validated['items'] as $item) {
                $itemQuantities[$item['aggregated_order_item_id']] = $item['quantity_received'];
            }

            $this->federationService->recordOrderReceipt(
                $order,
                $itemQuantities,
                $request->user(),
                [
                    'receipt_date' => $validated['receipt_date'] ?? now()->toDate(),
                    'notes' => $validated['notes'] ?? null,
                ]
            );

            return redirect()
                ->route('aggregated-orders.show', $order)
                ->with('success', 'Réception enregistrée. Marquez les demandes comme livrées puis utilisez « Stocker » sur chaque demande pour mettre à jour le stock.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Erreur lors de l\'enregistrement : ' . $e->getMessage()]);
        }
    }

    /**
     * Cancel aggregated order
     *
     * Resets all linked RequestItems to pending status
     * Logs cancellation with reason
     *
     * @param AggregatedOrder $order
     * @param Request $request
     * @return RedirectResponse
     */
    public function cancel(AggregatedOrder $order, Request $request): RedirectResponse
    {
        $request->validate([
            'cancellation_reason' => 'required|string|max:500',
        ]);

        try {
            $this->federationService->cancelOrder(
                $order,
                $request->input('cancellation_reason'),
                $request->user()
            );

            return redirect()
                ->route('aggregated-orders.index')
                ->with('success', 'Commande annulée. Articles remis en attente.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * API endpoint: Get pending items for supplier
     *
     * AJAX helper to show items available for aggregation with specific supplier
     *
     * @param Request $request
     * @param int $supplierId
     * @return JsonResponse
     */
    public function getPendingItems(Request $request, int $supplierId): JsonResponse
    {
        $supplier = Supplier::findOrFail($supplierId);

        // Get pending request items from this supplier
        $items = RequestItem::where('status', 'pending')
            ->whereHas('item', fn($q) => $q->where('supplier_id', $supplierId))
            ->with(['materialRequest.campus', 'item'])
            ->get()
            ->map(fn($item) => [
                'id' => $item->id,
                'request_number' => $item->materialRequest->request_number,
                'campus' => $item->materialRequest->campus->name,
                'item_description' => $item->item->description,
                'requested_quantity' => $item->requested_quantity,
                'unit_of_measure' => $item->item->unit_of_measure,
                'unit_price' => $item->unit_price,
                'line_total' => $item->requested_quantity * ($item->unit_price ?? $item->item->unit_price),
            ]);

        $totalAmount = $items->sum('line_total');

        return response()->json([
            'supplier' => $supplier,
            'items' => $items,
            'total_amount' => $totalAmount,
            'items_count' => $items->count(),
        ]);
    }

    /**
     * API endpoint: Export order summary
     *
     * @param AggregatedOrder $order
     * @return JsonResponse
     */
    public function export(AggregatedOrder $order): JsonResponse
    {
        $order->load([
            'supplier',
            'aggregatedOrderItems.requestItem.materialRequest.campus',
            'aggregatedOrderItems.requestItem.item',
        ]);

        return response()->json([
            'po_number' => $order->po_number,
            'supplier' => $order->supplier->name,
            'status' => $order->status,
            'total_value' => $order->getTotalValue(),
            'items' => $order->aggregatedOrderItems->map(fn($item) => [
                'request_number' => $item->requestItem->materialRequest->request_number,
                'campus' => $item->requestItem->materialRequest->campus->name,
                'item_description' => $item->requestItem->item->description,
                'quantity_ordered' => $item->quantity_ordered,
                'unit_price' => $item->requestItem->unit_price ?? $item->requestItem->item->unit_price,
                'line_total' => $item->quantity_ordered * ($item->requestItem->unit_price ?? $item->requestItem->item->unit_price),
            ]),
        ]);
    }
}
