<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceTicket;
use App\Models\Asset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

/**
 * MaintenanceTicketController
 *
 * Manages asset maintenance workflow
 * Create, assign, track, and close maintenance work orders
 * Supports preventive and corrective maintenance
 */
class MaintenanceTicketController extends Controller
{
    /**
     * Display list of maintenance tickets
     *
     * Filter by status, asset, assigned user
     * Show open tickets in dashboard priority
     *
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $user = $request->user();

        $query = MaintenanceTicket::with([
            'asset.currentCampus',
            'asset.currentWarehouse',
            'assignedTo'
        ]);

        // Filter by tab or status
        $tab = $request->get('tab', $request->input('status') ? null : 'all');
        if ($tab === 'open') {
            $query->where('status', 'open');
        } elseif ($tab === 'in-progress') {
            $query->whereIn('status', ['in_progress', 'pending_parts']);
        } elseif ($tab === 'resolved') {
            $query->where('status', 'resolved');
        } elseif ($tab === 'all' || !$tab) {
            // all: show all non-closed by default
            $query->where('status', '!=', 'closed');
        }
        if ($request->input('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by assigned user (for technicians)
        if ($request->input('assigned_to')) {
            $query->where('assigned_to_user_id', $request->input('assigned_to'));
        } else if ($user->isSiteScoped() && !$user->hasAnyRole(['director', 'super_admin'])) {
            // Show only tickets assigned to this user (staff)
            $query->where('assigned_to_user_id', $user->id);
        }

        // Filter by campus if site-scoped
        if ($user->isSiteScoped()) {
            $query->whereHas('asset', fn($q) => $q->where('current_campus_id', $user->campus_id));
        }

        $tickets = $query->orderBy('created_at', 'desc')->paginate(15);

        $openCount = MaintenanceTicket::where('status', '!=', 'closed')->count();
        $myAssignedCount = $user->assignedTickets()->where('status', '!=', 'closed')->count();

        $stats = [
            'total' => MaintenanceTicket::count(),
            'open' => MaintenanceTicket::where('status', 'open')->count(),
            'in_progress' => MaintenanceTicket::whereIn('status', ['in_progress', 'pending_parts'])->count(),
            'resolved' => MaintenanceTicket::where('status', 'resolved')->count(),
        ];

        return view('maintenance-tickets.index', [
            'tickets' => $tickets,
            'stats' => $stats,
            'openCount' => $openCount,
            'myAssignedCount' => $myAssignedCount,
            'statuses' => ['open', 'in_progress', 'pending_parts', 'resolved', 'closed'],
        ]);
    }

    /**
     * Show form to create new maintenance ticket
     *
     * Select asset and ticket type
     *
     * @param Request $request
     * @return View
     */
    public function create(Request $request): View
    {
        $user = $request->user();

        $query = Asset::where('lifecycle_status', 'en_service')
            ->with('currentCampus', 'currentWarehouse');

        if ($user->isSiteScoped()) {
            $query->where('current_campus_id', $user->campus_id);
        }

        $assets = $query->orderBy('serial_number')->get();

        return view('maintenance-tickets.create', [
            'assets' => $assets,
        ]);
    }

    /**
     * Store new maintenance ticket
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'ticket_type' => 'required|in:preventive,corrective',
            'description' => 'required|string|min:10|max:1000',
            'risk_level' => 'nullable|in:low,medium,high',
            'estimated_cost' => 'nullable|numeric|min:0.01|max:999999.99',
        ]);

        $asset = Asset::findOrFail($validated['asset_id']);
        $this->authorize('create', [MaintenanceTicket::class, $asset]);

        $ticket = MaintenanceTicket::create([
            'asset_id' => $validated['asset_id'],
            'ticket_type' => $validated['ticket_type'],
            'status' => 'open',
            'description' => $validated['description'],
            'risk_level' => $validated['risk_level'] ?? 'low',
            'estimated_cost' => $validated['estimated_cost'] ?? null,
            'created_by_user_id' => $request->user()->id,
        ]);

        \App\Models\ActivityLog::logAction(
            $ticket,
            'created',
            [
                'ticket_type' => $validated['ticket_type'],
                'asset_id' => $validated['asset_id'],
            ],
            $request->user()
        );

        return redirect()
            ->route('maintenance-tickets.show', $ticket)
            ->with('success', 'Ticket de maintenance créé.');
    }

    /**
     * Display maintenance ticket details
     *
     * Show asset info, description, work log, assignments
     *
     * @param MaintenanceTicket $ticket
     * @return View
     */
    public function show(MaintenanceTicket $ticket): View
    {
        $this->authorize('view', $ticket);

        $ticket->load([
            'asset.category',
            'asset.currentCampus',
            'asset.currentWarehouse',
            'assignedTo',
            'createdBy'
        ]);

        $history = \App\Models\ActivityLog::where('loggable_type', MaintenanceTicket::class)
            ->where('loggable_id', $ticket->id)
            ->withoutDeletedUsers()
            ->with('user')
            ->latest('created_at')
            ->get();

        $assignableUsers = User::hasRole('staff')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return view('maintenance-tickets.show', [
            'ticket' => $ticket,
            'canAssign' => auth()->user()->hasAnyRole(['director', 'super_admin']),
            'canWork' => auth()->user()->id === $ticket->assigned_to_user_id || 
                        auth()->user()->hasAnyRole(['director', 'super_admin']),
            'history' => $history,
            'assignableUsers' => $assignableUsers,
        ]);
    }

    /**
     * Assign ticket to technician
     *
     * Campus Manager or Director only
     *
     * @param MaintenanceTicket $ticket
     * @param Request $request
     * @return RedirectResponse
     */
    public function assign(MaintenanceTicket $ticket, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Vous n\'êtes pas autorisé à assigner des tickets.');
        }

        $request->validate([
            'assigned_to_id' => 'required|exists:users,id',
        ]);

        try {
            $ticket->assign(
                User::findOrFail($request->input('assigned_to_id')),
                $request->user()
            );

            return redirect()
                ->route('maintenance-tickets.show', $ticket)
                ->with('success', 'Ticket assigné au technicien.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Mark ticket as in progress
     *
     * Technician starts work
     *
     * @param MaintenanceTicket $ticket
     * @param Request $request
     * @return RedirectResponse
     */
    public function startWork(MaintenanceTicket $ticket, Request $request): RedirectResponse
    {
        if ($ticket->assigned_to_user_id !== $request->user()->id && 
            !$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Vous n\'êtes pas assigné à ce ticket.');
        }

        try {
            $ticket->startWork($request->user());

            return redirect()
                ->route('maintenance-tickets.show', $ticket)
                ->with('success', 'Travaux de maintenance démarrés.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Add work notes to maintenance ticket
     *
     * Technician logs progress on the maintenance work
     *
     * @param MaintenanceTicket $ticket
     * @param Request $request
     * @return RedirectResponse
     */
    public function work(MaintenanceTicket $ticket, Request $request): RedirectResponse
    {
        $request->validate([
            'notes' => 'required|string|max:2000',
            'pending_parts' => 'nullable|boolean',
        ]);

        if ($ticket->assigned_to_user_id !== $request->user()->id && 
            !$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Vous n\'êtes pas assigné à ce ticket.');
        }

        try {
            // If already in progress, just add notes
            if ($ticket->status === 'in_progress') {
                $ticket->workNotes()->create([
                    'created_by_user_id' => $request->user()->id,
                    'notes' => $request->input('notes'),
                    'status' => $request->boolean('pending_parts') ? 'pending_parts' : null,
                ]);
            } else {
                // Start work and add notes
                $ticket->startWork($request->user());
                $ticket->workNotes()->create([
                    'created_by_user_id' => $request->user()->id,
                    'notes' => $request->input('notes'),
                    'status' => $request->boolean('pending_parts') ? 'pending_parts' : null,
                ]);
            }

            return redirect()
                ->route('maintenance-tickets.show', $ticket)
                ->with('success', 'Work note added.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Mark ticket as pending parts
     *
     * Work paused awaiting replacement parts
     *
     * @param MaintenanceTicket $ticket
     * @param Request $request
     * @return RedirectResponse
     */
    public function pendingParts(MaintenanceTicket $ticket, Request $request): RedirectResponse
    {
        $request->validate([
            'parts_description' => 'required|string|max:500',
            'expected_arrival' => 'nullable|date|after_or_equal:today',
        ]);

        if ($ticket->assigned_to_user_id !== $request->user()->id && 
            !$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403);
        }

        try {
            $ticket->markPendingParts(
                $request->input('parts_description'),
                $request->user(),
                $request->input('expected_arrival')
            );

            return redirect()
                ->route('maintenance-tickets.show', $ticket)
                ->with('success', 'Ticket marqué en attente de pièces.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Mark ticket as resolved
     *
     * Work complete, awaiting closure approval
     *
     * @param MaintenanceTicket $ticket
     * @param Request $request
     * @return RedirectResponse
     */
    public function resolve(MaintenanceTicket $ticket, Request $request): RedirectResponse
    {
        $request->validate([
            'resolution_notes' => 'required|string|max:1000',
            'actual_cost' => 'nullable|numeric|min:0|max:999999.99',
            'work_hours' => 'nullable|numeric|min:0.5|max:1000',
        ]);

        if ($ticket->assigned_to_user_id !== $request->user()->id && 
            !$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403);
        }

        try {
            $ticket->resolve(
                $request->input('resolution_notes'),
                $request->user(),
                [
                    'actual_cost' => $request->input('actual_cost'),
                    'work_hours' => $request->input('work_hours'),
                ]
            );

            return redirect()
                ->route('maintenance-tickets.show', $ticket)
                ->with('success', 'Travaux terminés. En attente de contrôle.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Close resolved ticket
     *
     * Manager approval of completed maintenance
     *
     * @param MaintenanceTicket $ticket
     * @param Request $request
     * @return RedirectResponse
     */
    public function close(MaintenanceTicket $ticket, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Vous n\'êtes pas autorisé à fermer des tickets.');
        }

        try {
            $ticket->close($request->user());

            return redirect()
                ->route('maintenance-tickets.show', $ticket)
                ->with('success', 'Ticket de maintenance clôturé.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * API endpoint: Get open tickets summary
     *
     * Dashboard widget showing open maintenance work
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function openSummary(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = MaintenanceTicket::where('status', '!=', 'closed')
            ->with('asset.currentCampus', 'assignedTo');

        if ($user->isSiteScoped()) {
            $query->whereHas('asset', fn($q) => $q->where('current_campus_id', $user->campus_id));
        }

        $tickets = $query->get();

        return response()->json([
            'total_open' => $tickets->count(),
            'by_status' => [
                'open' => $tickets->where('status', 'open')->count(),
                'in_progress' => $tickets->where('status', 'in_progress')->count(),
                'pending_parts' => $tickets->where('status', 'pending_parts')->count(),
                'resolved' => $tickets->where('status', 'resolved')->count(),
            ],
            'by_risk' => [
                'high' => $tickets->where('risk_level', 'high')->count(),
                'medium' => $tickets->where('risk_level', 'medium')->count(),
                'low' => $tickets->where('risk_level', 'low')->count(),
            ],
            'oldest_open' => $tickets->where('status', 'open')
                ->sortBy('created_at')
                ->first()?->map(fn($t) => [
                    'id' => $t->id,
                    'asset' => $t->asset->serial_number,
                    'days_open' => $t->created_at->diffInDays(now()),
                ]) ?? null,
        ]);
    }

    /**
     * API endpoint: Get technician workload
     *
     * Show assigned tickets for specific technician
     *
     * @param Request $request
     * @param int $userId
     * @return JsonResponse
     */
    public function getTechnicianWorkload(Request $request, int $userId): JsonResponse
    {
        $user = User::findOrFail($userId);

        if (!$user->hasRole('staff')) {
            return response()->json(['error' => 'User is not a staff member'], 400);
        }

        $tickets = MaintenanceTicket::where('assigned_to_user_id', $userId)
            ->where('status', '!=', 'closed')
            ->with('asset')
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'asset' => $t->asset->serial_number,
                'status' => $t->status,
                'risk_level' => $t->risk_level,
                'created_at' => $t->created_at->toDateString(),
            ]);

        return response()->json([
            'technician' => $user->name,
            'assigned_count' => $tickets->count(),
            'tickets' => $tickets,
        ]);
    }
}
