<?php

namespace App\Http\Controllers;

use App\Models\DeliverySlip;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Bons de sortie : consultation uniquement (génération automatique).
 * Visibilité : staff concerné, point focal, directeur.
 */
class DeliverySlipController extends Controller
{
    public function index(Request $request): View
    {
        $query = DeliverySlip::with(['campus', 'recipientUser', 'authorUser', 'item'])
            ->visibleBy($request->user())
            ->orderByDesc('performed_at');

        if ($request->filled('type') && in_array($request->type, ['delivery', 'distribution'], true)) {
            $query->where('type', $request->type);
        }
        if ($request->filled('campus_id')) {
            $query->where('campus_id', $request->campus_id);
        }

        $slips = $query->paginate(20)->withQueryString();
        $campuses = \App\Models\Campus::orderBy('name')->get();

        return view('delivery-slips.index', [
            'slips' => $slips,
            'campuses' => $campuses,
        ]);
    }

    public function show(DeliverySlip $deliverySlip): View
    {
        $this->authorize('view', $deliverySlip);

        $deliverySlip->load(['campus', 'recipientUser', 'authorUser', 'item', 'userStockMovement']);

        return view('delivery-slips.show', ['slip' => $deliverySlip]);
    }
}
