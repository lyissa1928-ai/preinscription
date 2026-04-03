<?php

namespace App\Http\Controllers;

use App\Models\MaterialRequest;
use App\Models\RequestItem;
use App\Models\Item;
use App\Http\Requests\StoreRequestItemRequest;
use App\Http\Requests\UpdateRequestItemRequest;
use App\Services\RequestApprovalService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

/**
 * RequestItemController
 *
 * Manages items within a material request
 * Handles adding, updating, removing items from draft requests
 * Delegates business logic to RequestApprovalService
 */
class RequestItemController extends Controller
{
    public function __construct(
        private RequestApprovalService $requestApprovalService
    ) {}

    /**
     * Show form to add item to request
     *
     * @param MaterialRequest $materialRequest
     * @return \Illuminate\View\View
     */
    public function create(MaterialRequest $materialRequest)
    {
        if ($materialRequest->status !== 'draft') {
            return back()->withErrors(['error' => 'On ne peut ajouter des articles qu\'aux demandes en brouillon.']);
        }

        $this->authorize('update', $materialRequest);

        // Get available items not already in this request (with stock info for rupture alert)
        $addedItemIds = $materialRequest->requestItems->pluck('item_id')->toArray();
        $items = Item::with('category:id,name')
            ->where('is_active', true)
            ->whereNotIn('id', $addedItemIds)
            ->orderBy('name')
            ->get();
        $items->each(fn (Item $i) => $i->setAttribute('available_stock', $i->getAvailableStock()));

        return view('request-items.create', [
            'materialRequest' => $materialRequest,
            'items' => $items,
        ]);
    }

    /**
     * Store a new request item
     *
     * @param MaterialRequest $materialRequest
     * @param StoreRequestItemRequest $request
     * @return RedirectResponse
     */
    public function store(MaterialRequest $materialRequest, StoreRequestItemRequest $request): RedirectResponse
    {
        try {
            $validated = $request->validated();

            $this->requestApprovalService->addItemToRequest(
                $materialRequest,
                $validated['item_id'],
                $validated['requested_quantity'],
                $validated['unit_price'] ?? null,
                $validated['notes'] ?? null,
                $request->user()->id
            );

            return redirect()
                ->route('material-requests.show', $materialRequest)
                ->with('success', 'Article ajouté à la demande.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Show form to edit request item
     *
     * @param MaterialRequest $materialRequest
     * @param RequestItem $requestItem
     * @return \Illuminate\View\View
     */
    public function edit(MaterialRequest $materialRequest, RequestItem $requestItem)
    {
        if ($materialRequest->status !== 'draft') {
            return back()->withErrors(['error' => 'On ne peut modifier que les articles des demandes en brouillon.']);
        }

        if ($requestItem->material_request_id !== $materialRequest->id) {
            abort(404);
        }

        $this->authorize('update', $materialRequest);

        return view('request-items.edit', [
            'materialRequest' => $materialRequest,
            'requestItem' => $requestItem->load('item'),
        ]);
    }

    /**
     * Update request item
     *
     * @param MaterialRequest $materialRequest
     * @param RequestItem $requestItem
     * @param UpdateRequestItemRequest $request
     * @return RedirectResponse
     */
    public function update(
        MaterialRequest $materialRequest,
        RequestItem $requestItem,
        UpdateRequestItemRequest $request
    ): RedirectResponse {
        $validated = $request->validated();

        $requestItem->update([
            'requested_quantity' => $validated['requested_quantity'],
            'unit_price' => $validated['unit_price'] ?? $requestItem->unit_price,
            'notes' => $validated['notes'] ?? null,
        ]);

        // Log update
        \App\Models\ActivityLog::logAction(
            $requestItem,
            'updated',
            [
                'quantity' => $validated['requested_quantity'],
                'unit_price' => $validated['unit_price'],
            ],
            $request->user()
        );

        return redirect()
            ->route('material-requests.show', $materialRequest)
            ->with('success', 'Article mis à jour.');
    }

    /**
     * Delete request item
     *
     * @param MaterialRequest $materialRequest
     * @param RequestItem $requestItem
     * @param Request $request
     * @return RedirectResponse
     */
    public function destroy(MaterialRequest $materialRequest, RequestItem $requestItem, Request $request): RedirectResponse
    {
        if ($materialRequest->status !== 'draft') {
            return back()->withErrors(['error' => 'On ne peut retirer des articles que des demandes en brouillon.']);
        }

        if ($requestItem->material_request_id !== $materialRequest->id) {
            abort(404);
        }

        $this->authorize('update', $materialRequest);

        try {
            $this->requestApprovalService->removeItemFromRequest($materialRequest, $requestItem);

            return redirect()
                ->route('material-requests.show', $materialRequest)
                ->with('success', 'Article retiré de la demande.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * API endpoint: Get available items (AJAX for form population)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getAvailable(Request $request): JsonResponse
    {
        $search = $request->input('q', '');
        $materialRequestId = $request->input('request_id');

        $materialRequest = MaterialRequest::findOrFail($materialRequestId);
        $this->authorize('update', $materialRequest);
        $addedItemIds = $materialRequest->requestItems->pluck('item_id')->toArray();

        $items = Item::where('is_active', true)
            ->whereNotIn('id', $addedItemIds)
            ->when($search, fn($q) => $q->where('description', 'like', "%{$search}%"))
            ->select('id', 'description', 'unit_of_measure', 'unit_price', 'current_stock')
            ->limit(10)
            ->get();

        return response()->json($items);
    }

    /**
     * API endpoint: Get item details (AJAX)
     *
     * @param Request $request
     * @param int $itemId
     * @return JsonResponse
     */
    public function getItem(Request $request, int $itemId): JsonResponse
    {
        $item = Item::findOrFail($itemId);

        if (!$item->is_active) {
            return response()->json(['error' => 'Item is not active'], 400);
        }

        $user = $request->user();
        $availableStock = $item->getAvailableStock($user->campus_id ?? null);

        return response()->json([
            'id' => $item->id,
            'description' => $item->description,
            'unit_of_measure' => $item->unit_of_measure,
            'unit_price' => $item->unit_price,
            'current_stock' => $item->current_stock,
            'available_stock' => $availableStock,
            'reorder_threshold' => $item->reorder_threshold,
            'is_low' => $item->isLowStock(),
        ]);
    }
}
