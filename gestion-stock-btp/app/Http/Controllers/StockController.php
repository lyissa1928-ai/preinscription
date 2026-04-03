<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Campus;
use App\Models\Supplier;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;
use Illuminate\Http\JsonResponse;

/**
 * StockController
 *
 * Manages inventory visibility and low stock reporting
 * Reports on available stock, pending requests, and reorder alerts
 * Delegates stock operations to StockService
 */
class StockController extends Controller
{
    public function __construct(
        private StockService $stockService
    ) {}

    /**
     * Stock de mon campus — lecture seule pour le staff (permission stock.view_campus).
     * Affiche le catalogue des articles avec quantités en stock, sans actions ni prix.
     */
    public function monCampus(Request $request): View
    {
        $user = $request->user();
        if (!$user->isSiteScoped() || $user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return redirect()->route('stock-referentiel.index');
        }
        if (!$user->can('stock.view_campus')) {
            abort(403, 'Accès non autorisé.');
        }

        $query = Item::with(['category'])->active();
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }
        if ($request->filled('category')) {
            $query->where('category_id', $request->input('category'));
        }
        $items = $query->orderBy('name')->paginate(20)->withQueryString();
        $categories = \App\Models\Category::active()->orderBy('name')->get();
        $pageSubtitle = $user->campus
            ? 'Consultation en lecture seule — ' . $user->campus->name
            : 'Consultation en lecture seule';

        return view('stock.mon-campus', [
            'items' => $items,
            'categories' => $categories,
            'campus' => $user->campus,
            'pageSubtitle' => $pageSubtitle,
        ]);
    }

    /**
     * Display overall stock status dashboard
     *
     * Shows critical low stock items, pending requests, supplier status
     * Scoped to campus if user is site-scoped
     * Réservé au point focal, directeur et super_admin (le staff ne voit que son stock personnel).
     *
     * @param Request $request
     * @return View
     */
    public function dashboard(Request $request): View
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            abort(403, 'Accès réservé au point focal et au directeur. Consultez votre stock personnel depuis Stock et référentiel.');
        }
        $campus = $user->isSiteScoped() ? $user->campus : null;

        // Get low stock items
        $lowStockItems = $campus
            ? $this->stockService->getLowStockItemsForCampus($campus)
            : $this->stockService->getLowStockItems();

        $lowStockAlert = $this->stockService->generateLowStockAlert();

        // Get campus-level stats (Item uses stock_quantity)
        $totalItems = Item::count();
        $lowStockCount = Item::lowStock()->active()->count();
        $outOfStockCount = Item::where('stock_quantity', '<=', 0)->active()->count();
        $inStockCount = $totalItems - $lowStockCount - $outOfStockCount;
        $stats = [
            'total_items' => $totalItems,
            'in_stock' => $inStockCount,
            'low_stock' => $lowStockCount,
            'out_of_stock' => $outOfStockCount,
            'low_stock_items' => count($lowStockItems),
            'critical_items' => $lowStockItems->filter(fn($i) => $i->stock_quantity <= 5)->count(),
            'estimated_reorder_cost' => $lowStockAlert['total_estimated_cost'],
        ];

        $categories = \App\Models\Category::active()->where('type', 'consommable')->orderBy('name')->get();

        return view('stock.dashboard', [
            'lowStockItems' => $lowStockItems,
            'lowStockAlert' => $lowStockAlert,
            'stats' => $stats,
            'categories' => $categories,
            'campus' => $campus,
        ]);
    }

    /**
     * Display list of all items with stock levels
     *
     * Searchable, filterable by category and status
     *
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View|RedirectResponse
    {
        $user = $request->user();
        // Staff avec permission stock.view_campus uniquement : redirection vers la vue lecture seule « Stock de mon campus »
        if ($user->isSiteScoped() && !$user->hasAnyRole(['point_focal', 'director', 'super_admin']) && $user->can('stock.view_campus')) {
            return redirect()->route('stock.mon-campus');
        }
        if ($user->isSiteScoped() && !$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            abort(403, 'Accès réservé. Consultez « Stock de mon campus » depuis le menu.');
        }

        $query = Item::with(['category']);

        // Filter by campus if applicable
        if ($user->isSiteScoped()) {
            // Generally items are not campus-specific unless filtered via requests
            // For now, show all items
        }

        // Search by description, code or name
        if ($request->input('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        // Filter by category (form field name is "category")
        if ($request->input('category')) {
            $query->where('category_id', $request->input('category'));
        }

        // Filter by supplier (si la table items a une colonne supplier_id)
        if ($request->input('supplier') && \Illuminate\Support\Facades\Schema::hasColumn('items', 'supplier_id')) {
            $query->where('supplier_id', $request->input('supplier'));
        }

        // Filter by stock status (form field name is "status": in-stock, low-stock, out-of-stock)
        if ($request->input('status')) {
            match ($request->input('status')) {
                'low-stock' => $query->lowStock(),
                'out-of-stock' => $query->where('stock_quantity', '<=', 0),
                'in-stock' => $query->whereColumn('stock_quantity', '>', 'reorder_threshold')->where('stock_quantity', '>', 0),
                default => null,
            };
        }

        $items = $query->active()->orderBy('name')->paginate(20);

        $canSeePrices = $user->hasAnyRole(['point_focal', 'director', 'super_admin']);

        return view('stock.index', [
            'items' => $items,
            'categories' => \App\Models\Category::active()->get(),
            'suppliers' => \Illuminate\Support\Facades\Schema::hasColumn('items', 'supplier_id') ? Supplier::active()->orderBy('name')->get() : collect(),
            'canSeePrices' => $canSeePrices,
        ]);
    }

    /**
     * Display stock details for specific item
     *
     * Shows current stock, pending requests, supplier info
     *
     * @param Item $item
     * @param Request $request
     * @return View
     */
    public function show(Item $item, Request $request): View
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            abort(403, 'Accès réservé au point focal et au directeur.');
        }

        $item->load([
            'category',
            'supplier',
            'requestItems.materialRequest.campus',
        ]);

        $availableStock = $item->getAvailableStock();
        $pendingRequests = $item->requestItems()
            ->where('status', 'pending')
            ->with('materialRequest.campus')
            ->get();

        $recentHistoryQuery = \App\Models\ActivityLog::where('loggable_type', Item::class)
            ->where('loggable_id', $item->id)
            ->where('action', 'stock_updated')
            ->withoutDeletedUsers()
            ->latest('created_at')
            ->limit(10);
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $recentHistoryQuery->where('user_id', $user->id);
        }
        $recentHistory = $recentHistoryQuery->get();

        return view('stock.show', [
            'item' => $item,
            'availableStock' => $availableStock,
            'pendingRequests' => $pendingRequests,
            'isLowStock' => $item->isLowStock(),
            'recentHistory' => $recentHistory,
            'supplier' => $item->supplier,
        ]);
    }

    /**
     * Display low stock alert report
     *
     * Comprehensive view of all items below reorder threshold
     * Calculates total reorder cost estimate
     *
     * @param Request $request
     * @return View
     */
    public function lowStockAlert(Request $request): View
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            abort(403, 'Accès réservé au point focal et au directeur.');
        }

        $lowStockAlert = $this->stockService->generateLowStockAlert();
        
        $items = Item::lowStock()
            ->with(['category', 'supplier'])
            ->orderBy('stock_quantity')
            ->paginate(20);

        return view('stock.low-stock-alert', [
            'alert' => $lowStockAlert,
            'items' => $items,
            'totalCost' => $lowStockAlert['total_estimated_cost'],
        ]);
    }

    /**
     * API endpoint: Get stock for item (AJAX)
     *
     * Returns current and available stock levels
     *
     * @param Request $request
     * @param int $itemId
     * @return JsonResponse
     */
    public function getStock(Request $request, int $itemId): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $item = Item::findOrFail($itemId);

        $user = $request->user();
        $availableStock = $item->getAvailableStock(
            $user->isSiteScoped() ? $user->campus_id : null
        );

        return response()->json([
            'id' => $item->id,
            'description' => $item->description,
            'current_stock' => $item->current_stock,
            'available_stock' => $availableStock,
            'reorder_threshold' => $item->reorder_threshold,
            'unit_price' => $item->unit_price,
            'is_low' => $item->isLowStock(),
            'unit_of_measure' => $item->unit_of_measure,
        ]);
    }

    /**
     * API endpoint: Get low stock items (AJAX)
     *
     * Returns array of low stock items for dashboard/alerts
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getLowStockItems(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $lowStockItems = $user->isSiteScoped()
            ? $this->stockService->getLowStockItemsForCampus($user->campus)
            : $this->stockService->getLowStockItems();

        return response()->json([
            'items' => $lowStockItems->map(fn($item) => [
                'id' => $item->id,
                'description' => $item->description,
                'current_stock' => $item->current_stock,
                'reorder_threshold' => $item->reorder_threshold,
                'unit_price' => $item->unit_price,
                'supplier' => $item->supplier->name,
                'severity' => $item->current_stock <= 5 ? 'critical' : 'low',
            ]),
            'total_count' => $lowStockItems->count(),
            'total_cost' => $lowStockItems->sum(fn($i) => $i->current_stock * $i->unit_price),
        ]);
    }

    /**
     * API endpoint: Get available stock (considers pending requests)
     *
     * Returns stock balance after accounting for pending/aggregated requests
     *
     * @param Request $request
     * @param int $itemId
     * @return JsonResponse
     */
    public function getAvailableStock(Request $request, int $itemId): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $item = Item::findOrFail($itemId);

        return response()->json([
            'item_id' => $item->id,
            'current_stock' => $item->current_stock,
            'pending_requests_qty' => $item->requestItems()
                ->whereIn('status', ['pending', 'aggregated'])
                ->sum('requested_quantity'),
            'available_stock' => $item->getAvailableStock(),
        ]);
    }

    /**
     * API endpoint: Get items requiring reorder
     *
     * Returns list of items with reorder recommendations
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getReorderList(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasAnyRole(['director', 'super_admin', 'point_focal'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $lowStockAlert = $this->stockService->generateLowStockAlert();

        return response()->json([
            'items' => $lowStockAlert['items'],
            'total_items_low' => $lowStockAlert['total_items_low'],
            'total_estimated_cost' => $lowStockAlert['total_estimated_cost'],
            'summary' => [
                'most_critical' => collect($lowStockAlert['items'])
                    ->sortBy('stock_level')
                    ->first(),
                'highest_cost_item' => collect($lowStockAlert['items'])
                    ->sortByDesc('total_value')
                    ->first(),
            ],
        ]);
    }

    /**
     * Historique des mouvements de stock pour un article (route GET stock/history/{item}).
     */
    public function history(Request $request, Item $item): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        return $this->getHistory($request, $item->id);
    }

    /**
     * API endpoint: Get stock history for item
     *
     * Returns activity log of stock modifications
     *
     * @param Request $request
     * @param int $itemId
     * @return JsonResponse
     */
    public function getHistory(Request $request, int $itemId): JsonResponse
    {
        if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $item = Item::findOrFail($itemId);

        $history = \App\Models\ActivityLog::where('loggable_type', Item::class)
            ->where('loggable_id', $itemId)
            ->whereIn('action', ['created', 'stock_updated'])
            ->withoutDeletedUsers()
            ->with('user')
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(fn($log) => [
                'action' => $log->action,
                'date' => $log->created_at->format('Y-m-d H:i'),
                'user' => $log->user?->name ?? '—',
                'changes' => $log->changes,
            ]);

        return response()->json([
            'item_id' => $itemId,
            'item_description' => $item->description,
            'history' => $history,
        ]);
    }
}
