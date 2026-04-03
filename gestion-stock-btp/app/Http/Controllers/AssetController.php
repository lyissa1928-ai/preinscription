<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Warehouse;
use App\Models\Campus;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

/**
 * AssetController
 *
 * Manages fixed assets: equipment, furniture, etc.
 * Tracks asset lifecycle: acquisition → service → maintenance → decommission
 * Manages asset transfers between locations
 * Delegates to StockService
 */
class AssetController extends Controller
{
    public function __construct(
        private StockService $stockService
    ) {}

    /**
     * Display list of assets
     *
     * Filter by status, location, category
     * Scoped to campus if user is site-scoped
     *
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $user = $request->user();

        $query = Asset::with([
            'category',
            'currentCampus',
            'currentWarehouse',
            'maintenanceTickets'
        ]);

        // Scope to campus if site-scoped
        if ($user->isSiteScoped()) {
            $query->where('current_campus_id', $user->campus_id);
        }

        // Filter by status
        if ($request->input('status')) {
            match ($request->input('status')) {
                'in_service' => $query->where('lifecycle_status', 'en_service'),
                'maintenance' => $query->where('lifecycle_status', 'maintenance'),
                'decommissioned' => $query->where('lifecycle_status', 'reformé'),
                default => null,
            };
        }

        // Filter by warehouse/location
        if ($request->input('warehouse_id')) {
            $query->where('current_warehouse_id', $request->input('warehouse_id'));
        }

        // Filter by category
        if ($request->input('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        // Search by serial number or description
        if ($request->input('search')) {
            $search = $request->input('search');
            $query->where('serial_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $assets = $query->orderBy('serial_number')->paginate(20);

        $campuses = Campus::active()->get();
        $warehouses = $user->isSiteScoped()
            ? Warehouse::where('campus_id', $user->campus_id)->get()
            : Warehouse::all();

        return view('assets.index', [
            'assets' => $assets,
            'campuses' => $campuses,
            'warehouses' => $warehouses,
            'categories' => \App\Models\Category::where('type', 'asset')->orderBy('name')->get(),
        ]);
    }

    /**
     * Show asset details
     *
     * Display full asset information, location, maintenance history
     *
     * @param Asset $asset
     * @return View
     */
    public function show(Asset $asset): View
    {
        $this->authorize('view', $asset);

        $asset->load([
            'category',
            'currentCampus',
            'currentWarehouse',
            'maintenanceTickets.assignedTo'
        ]);

        $history = \App\Models\ActivityLog::where('loggable_type', Asset::class)
            ->where('loggable_id', $asset->id)
            ->withoutDeletedUsers()
            ->with('user')
            ->latest('created_at')
            ->limit(15)
            ->get();

        $openMaintenanceTickets = $asset->maintenanceTickets()
            ->where('status', '!=', 'closed')
            ->get();

        return view('assets.show', [
            'asset' => $asset,
            'isInService' => $asset->isInService(),
            'canTransfer' => auth()->user()->hasAnyRole(['director', 'super_admin']),
            'canMaintain' => auth()->user()->hasAnyRole(['director', 'super_admin']),
            'history' => $history,
            'openTickets' => $openMaintenanceTickets,
        ]);
    }

    /**
     * Show form to create new asset
     *
     * @param Request $request
     * @return View
     */
    public function create(Request $request): View
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Vous n\'êtes pas autorisé à créer des actifs.');
        }

        $campuses = Campus::active()->orderBy('name')->get();

        return view('assets.create', [
            'campuses' => $campuses,
            'categories' => \App\Models\Category::assets()->orderBy('description')->get(),
        ]);
    }

    /**
     * Store new asset
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'serial_number' => 'required|string|unique:assets',
            'description' => 'required|string|max:500',
            'current_campus_id' => 'required|exists:campuses,id',
            'current_warehouse_id' => 'required|exists:warehouses,id',
            'acquisition_date' => 'required|date|before_or_equal:today',
            'acquisition_cost' => 'required|numeric|min:0.01',
            'warranty_expiry' => 'nullable|date|after:acquisition_date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $asset = Asset::create([
            ...$validated,
            'lifecycle_status' => 'en_service',
            'created_by_user_id' => $request->user()->id,
        ]);

        \App\Models\ActivityLog::logAction(
            $asset,
            'created',
            ['acquisition_cost' => $asset->acquisition_cost],
            $request->user()
        );

        return redirect()
            ->route('assets.show', $asset)
            ->with('success', 'Actif créé et enregistré.');
    }

    /**
     * Show form to transfer asset to different location
     *
     * @param Asset $asset
     * @return View
     */
    public function transferForm(Asset $asset): View
    {
        $this->authorize('update', $asset);

        $warehouses = Warehouse::where('campus_id', $asset->current_campus_id)
            ->get();

        return view('assets.transfer', [
            'asset' => $asset->load('currentCampus', 'currentWarehouse'),
            'warehouses' => $warehouses,
        ]);
    }

    /**
     * Transfer asset to new warehouse
     *
     * @param Asset $asset
     * @param Request $request
     * @return RedirectResponse
     */
    public function transfer(Asset $asset, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'target_warehouse_id' => 'required|exists:warehouses,id',
            'transfer_notes' => 'nullable|string|max:500',
        ]);

        try {
            $oldLocation = "{$asset->currentWarehouse->name} ({$asset->currentCampus->name})";

            $this->stockService->moveAsset(
                $asset,
                Warehouse::findOrFail($validated['target_warehouse_id']),
                $request->user(),
                $validated['transfer_notes'] ?? null
            );

            $newLocation = "{$asset->currentWarehouse->name}";

            return redirect()
                ->route('assets.show', $asset)
                ->with('success', "Actif transféré depuis {$oldLocation}");
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Send asset to maintenance
     *
     * Changes lifecycle_status to 'maintenance'
     * Logs action via ActivityLog
     *
     * @param Asset $asset
     * @param Request $request
     * @return RedirectResponse
     */
    public function sendToMaintenance(Asset $asset, Request $request): RedirectResponse
    {
        $request->validate([
            'maintenance_reason' => 'required|string|max:500',
        ]);

        try {
            $this->stockService->transferToMaintenance(
                $asset,
                $request->user(),
                $request->input('maintenance_reason')
            );

            return redirect()
                ->route('assets.show', $asset)
                ->with('success', 'Actif envoyé en maintenance.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Recall asset from maintenance
     *
     * Changes lifecycle_status from 'maintenance' back to 'en_service'
     *
     * @param Asset $asset
     * @param Request $request
     * @return RedirectResponse
     */
    public function recallFromMaintenance(Asset $asset, Request $request): RedirectResponse
    {
        if ($asset->lifecycle_status !== 'maintenance') {
            return back()->withErrors(['error' => 'L\'actif n\'est pas en maintenance.']);
        }

        $asset->update([
            'lifecycle_status' => 'en_service',
            'maintenance_completed_date' => now(),
        ]);

        \App\Models\ActivityLog::logAction(
            $asset,
            'maintenance_completed',
            [],
            $request->user()
        );

        return redirect()
            ->route('assets.show', $asset)
            ->with('success', 'Actif récupéré après maintenance.');
    }

    /**
     * Decommission asset
     *
     * Changes lifecycle_status to 'reformé'
     * Mark as no longer serviceable
     *
     * @param Asset $asset
     * @param Request $request
     * @return RedirectResponse
     */
    public function decommission(Asset $asset, Request $request): RedirectResponse
    {
        $request->validate([
            'decommission_reason' => 'required|string|max:500',
            'decommission_date' => 'required|date|before_or_equal:today',
        ]);

        try {
            $this->stockService->decommissionAsset(
                $asset,
                $request->user(),
                $request->input('decommission_reason'),
                $request->input('decommission_date')
            );

            return redirect()
                ->route('assets.show', $asset)
                ->with('success', 'Actif réformé.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * API endpoint: Get assets requiring maintenance
     *
     * Returns assets in maintenance status or with open tickets
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getMaintenanceRequired(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Asset::where('lifecycle_status', 'maintenance')
            ->with(['currentCampus', 'currentWarehouse']);

        if ($user->isSiteScoped()) {
            $query->where('current_campus_id', $user->campus_id);
        }

        $assets = $query->get()->map(fn($asset) => [
            'id' => $asset->id,
            'serial_number' => $asset->serial_number,
            'description' => $asset->description,
            'location' => $asset->currentWarehouse->name,
            'campus' => $asset->currentCampus->name,
        ]);

        return response()->json([
            'assets_in_maintenance' => $assets,
            'count' => $assets->count(),
        ]);
    }

    /**
     * API endpoint: Get asset value summary (for accounting)
     *
     * Returns total acquisition cost and status breakdown
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function valueReport(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasAnyRole(['director', 'super_admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = Asset::query();

        if ($user->isSiteScoped()) {
            $query->where('current_campus_id', $user->campus_id);
        }

        return response()->json([
            'total_assets_count' => $query->count(),
            'total_acquisition_cost' => $query->sum('acquisition_cost'),
            'by_status' => [
                'in_service' => [
                    'count' => $query->clone()->where('lifecycle_status', 'en_service')->count(),
                    'value' => $query->clone()->where('lifecycle_status', 'en_service')->sum('acquisition_cost'),
                ],
                'maintenance' => [
                    'count' => $query->clone()->where('lifecycle_status', 'maintenance')->count(),
                    'value' => $query->clone()->where('lifecycle_status', 'maintenance')->sum('acquisition_cost'),
                ],
                'decommissioned' => [
                    'count' => $query->clone()->where('lifecycle_status', 'reformé')->count(),
                    'value' => $query->clone()->where('lifecycle_status', 'reformé')->sum('acquisition_cost'),
                ],
            ]
        ]);
    }
}
