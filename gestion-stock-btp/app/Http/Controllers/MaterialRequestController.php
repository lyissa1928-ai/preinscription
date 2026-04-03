<?php

namespace App\Http\Controllers;

use App\Models\MaterialRequest;
use App\Models\Campus;
use App\Models\User;
use App\Models\RequestItem;
use App\Models\DeliverySlip;
use App\Models\UserStockMovement;
use App\Models\Item;
use App\Http\Requests\StoreMaterialRequestRequest;
use App\Services\RequestApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Database\UniqueConstraintViolationException;
use Carbon\Carbon;

/**
 * MaterialRequestController
 *
 * Manages material request workflow: creation, submission, approval
 * Delegates business logic to RequestApprovalService
 * Enforces authorization via Form Requests
 */
class MaterialRequestController extends Controller
{
    public function __construct(
        private RequestApprovalService $requestApprovalService
    ) {}

    /**
     * Display a listing of material requests
     *
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $user = $request->user();

        $query = MaterialRequest::with([
            'campus',
            'department',
            'requester',
            'approvedBy',
            'requestItems.item'
        ]);

        // Staff affilié à un campus : uniquement les activités de son campus (demandes dont il est requérant ou participant)
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $query->where('campus_id', $user->campus_id);
            $query->where(function ($q) use ($user) {
                $q->where('requester_user_id', $user->id)
                    ->orWhereHas('participants', fn ($q2) => $q2->where('user_id', $user->id));
            });
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
        } else {
            // Point focal / Directeur : toutes les demandes, filtres optionnels
            if ($request->filled('campus_id')) {
                $query->where('campus_id', $request->campus_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        $campuses = $user->hasAnyRole(['point_focal', 'director'])
            ? Campus::active()->orderBy('name')->get()
            : collect();

        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $myQuery = MaterialRequest::where('requester_user_id', $user->id)
                ->orWhereHas('participants', fn ($q2) => $q2->where('user_id', $user->id));
            $stats = [
                'total' => (clone $myQuery)->count(),
                'draft' => (clone $myQuery)->where('status', 'draft')->count(),
                'submitted' => (clone $myQuery)->where('status', 'submitted')->count(),
                'pending_director' => (clone $myQuery)->where('status', 'pending_director')->count(),
                'director_approved' => (clone $myQuery)->where('status', 'director_approved')->count(),
                'approved' => (clone $myQuery)->where('status', 'approved')->count(),
                'aggregated' => (clone $myQuery)->where('status', 'aggregated')->count(),
                'received' => (clone $myQuery)->where('status', 'received')->count(),
                'delivered' => (clone $myQuery)->where('status', 'delivered')->count(),
            ];
        } else {
            $stats = $this->requestApprovalService->getRequestStats(
                $user->hasAnyRole(['point_focal', 'director']) ? null : ($user->campus ?? null)
            );
        }

        return view('material-requests.index', [
            'materialRequests' => $requests,
            'stats' => $stats,
            'campuses' => $campuses,
        ]);
    }

    /**
     * Show the form for creating a new material request
     *
     * @return View
     */
    public function create(Request $request): View
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur n\'effectue pas de demandes de matériel. Il approuve les demandes transmises par le point focal.');
        }
        $user = $request->user();
        $campuses = $user->isSiteScoped()
            ? Campus::where('id', $user->campus_id)->get()
            : Campus::active()->get();

        $items = Item::active()->with('category:id,name')->orderBy('name')->get(['id', 'description', 'code', 'name', 'category_id']);

        return view('material-requests.create', [
            'campuses' => $campuses,
            'items' => $items,
        ]);
    }

    /**
     * Store a newly created material request
     *
     * @param StoreMaterialRequestRequest $request
     * @return RedirectResponse
     */
    public function store(StoreMaterialRequestRequest $request): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur n\'effectue pas de demandes de matériel. Il approuve les demandes transmises par le point focal.');
        }
        $validated = $request->validated();
        $user = $request->user();

        $attempt = 0;
        $maxAttempts = 5;
        do {
            try {
                $materialRequest = DB::transaction(function () use ($validated, $user) {
                    $mr = MaterialRequest::create([
                        'campus_id' => $validated['campus_id'],
                        'department_id' => $validated['department_id'] ?? null,
                        'requester_user_id' => $user->id,
                        'request_number' => $this->generateRequestNumber($validated['campus_id']),
                'status' => 'draft',
                'request_type' => $validated['request_type'] === 'grouped' ? 'grouped' : 'individual',
                'subject' => $validated['subject'],
                'justification' => $validated['justification'],
                'request_date' => Carbon::now()->toDate(),
                'needed_by_date' => $validated['needed_by_date'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['lines'] as $line) {
                $designation = isset($line['designation']) ? trim($line['designation']) : null;
                $itemId = isset($line['item_id']) && $line['item_id'] ? (int) $line['item_id'] : null;
                if (!$designation && !$itemId) {
                    continue;
                }
                if (!$designation && $itemId) {
                    $item = \App\Models\Item::find($itemId);
                    $designation = $item ? ($item->description ?: $item->name) : null;
                }
                $isUnlisted = !$itemId && !empty($designation);
                RequestItem::create([
                    'material_request_id' => $mr->id,
                    'requested_by_user_id' => $user->id,
                    'item_id' => $itemId ?: null,
                    'designation' => $designation,
                    'is_unlisted_material' => $isUnlisted,
                    'requested_quantity' => (int) ($line['quantity'] ?? 1),
                    'status' => 'pending',
                ]);
            }

                    return $mr;
                });
                break;
            } catch (UniqueConstraintViolationException $e) {
                if (++$attempt >= $maxAttempts) {
                    throw $e;
                }
            }
        } while (true);

        return redirect()
            ->route('material-requests.show', $materialRequest)
            ->with('success', 'Demande créée. Vous pouvez la soumettre quand vous êtes prêt.');
    }

    /**
     * Display the specified material request
     *
     * @param MaterialRequest $materialRequest
     * @return View
     */
    public function show(MaterialRequest $materialRequest): View
    {
        $this->authorize('view', $materialRequest);

        $me = auth()->user();
        $materialRequest->load(['campus', 'department', 'requester', 'approvedBy', 'rejectedBy', 'transmittedBy', 'directorApprovedBy', 'requestItems.item', 'participants']);

        $requestHistoryQuery = \App\Models\ActivityLog::where('loggable_type', MaterialRequest::class)
            ->where('loggable_id', $materialRequest->id)
            ->withoutDeletedUsers()
            ->with('user')
            ->orderByDesc('created_at')
            ->limit(20);
        // Le staff ne doit pas voir les activités réalisées par les autres (point focal, directeur, etc.).
        if (!$me->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $requestHistoryQuery->where('user_id', $me->id);
        }
        $requestHistory = $requestHistoryQuery->get();

        $pendingApprovals = $materialRequest->status === 'submitted'
            ? $this->requestApprovalService->getPendingApprovalsFor($me)
            : collect();
        $canManageParticipants = in_array($materialRequest->status, ['draft', 'submitted']) &&
            ($materialRequest->requester_user_id === $me->id || $me->hasAnyRole(['director', 'super_admin', 'point_focal']));
        $staffForParticipants = $canManageParticipants && $materialRequest->campus_id
            ? User::where('campus_id', $materialRequest->campus_id)->whereHas('roles', fn ($q) => $q->where('name', 'staff'))
                ->where('id', '!=', $materialRequest->requester_user_id)->orderBy('name')->get(['id', 'name', 'first_name', 'last_name', 'matricule'])
            : collect();

        $campusBudgetRemaining = null;
        $campusBudget = null;
        if ($materialRequest->campus_id) {
            $campusBudget = \App\Models\Budget::where('campus_id', $materialRequest->campus_id)
                ->where('fiscal_year', now()->year)
                ->where('status', 'active')
                ->first();
            if ($campusBudget) {
                $campusBudgetRemaining = $campusBudget->getRemainingAmount();
            }
        }

        $canTransmit = $materialRequest->status === 'submitted' && $me->hasAnyRole(['point_focal', 'super_admin']);
        $canDirectorApprove = $materialRequest->status === 'pending_director' && $me->hasAnyRole(['director', 'super_admin']);
        $canDirectorReject = $materialRequest->status === 'pending_director' && $me->hasAnyRole(['director', 'super_admin']);

        return view('material-requests.show', [
            'materialRequest' => $materialRequest,
            'requestHistory' => $requestHistory,
            'canApprove' => auth()->user()->can('approve', $materialRequest),
            'canTransmit' => $canTransmit,
            'canDirectorApprove' => $canDirectorApprove,
            'canDirectorReject' => $canDirectorReject,
            'canEdit' => auth()->user()->can('update', $materialRequest),
            'canManageParticipants' => $canManageParticipants,
            'staffForParticipants' => $staffForParticipants,
            'campusBudgetRemaining' => $campusBudgetRemaining,
            'campusBudget' => $campusBudget,
        ]);
    }

    /**
     * Formulaire de modification d'une demande (brouillon uniquement).
     */
    public function edit(MaterialRequest $materialRequest): View|RedirectResponse
    {
        $this->authorize('update', $materialRequest);
        if ($materialRequest->status !== 'draft') {
            return redirect()->route('material-requests.show', $materialRequest)
                ->withErrors(['error' => 'Seules les demandes en brouillon peuvent être modifiées.']);
        }
        $user = auth()->user();
        $campuses = $user->isSiteScoped()
            ? Campus::where('id', $user->campus_id)->get()
            : Campus::active()->orderBy('name')->get();
        $materialRequest->load(['requestItems.item']);
        return view('material-requests.edit', [
            'materialRequest' => $materialRequest,
            'campuses' => $campuses,
        ]);
    }

    /**
     * Mise à jour d'une demande (brouillon uniquement) : campus, date souhaitée, notes.
     */
    public function update(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $this->authorize('update', $materialRequest);
        if ($materialRequest->status !== 'draft') {
            return back()->withErrors(['error' => 'Seules les demandes en brouillon peuvent être modifiées.']);
        }
        $validated = $request->validate([
            'campus_id' => 'required|exists:campuses,id',
            'needed_by_date' => 'required|date|after_or_equal:today',
            'notes' => 'nullable|string|max:5000',
        ]);
        $materialRequest->update([
            'campus_id' => $validated['campus_id'],
            'needed_by_date' => $validated['needed_by_date'],
            'notes' => $validated['notes'] ?? null,
        ]);
        return redirect()->route('material-requests.show', $materialRequest)
            ->with('success', 'Demande mise à jour.');
    }

    /**
     * Submit a draft request for approval
     *
     * @param MaterialRequest $materialRequest
     * @param Request $request
     * @return RedirectResponse
     */
    public function submit(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        try {
            $this->requestApprovalService->submitRequest($materialRequest, $request->user());

            return redirect()
                ->route('material-requests.show', $materialRequest)
                ->with('success', 'Demande soumise pour approbation.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Approve a submitted request
     *
     * @param MaterialRequest $materialRequest
     * @param Request $request
     * @return RedirectResponse
     */
    public function approve(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $this->authorize('approve', $materialRequest);

        $raw = $request->input('unit_prices', []);
        if (!is_array($raw)) {
            $raw = [];
        }
        // Normaliser les clés en entiers (la requête HTTP peut envoyer "1", "2" en string)
        $itemUnitPrices = [];
        foreach ($raw as $k => $v) {
            $id = (int) $k;
            if ($k === '' || $k === null) {
                continue;
            }
            $itemUnitPrices[$id] = ($v !== '' && $v !== null) ? (float) $v : null;
        }

        // Récupération automatique du prix unitaire depuis le référentiel si non renseigné
        $materialRequest->load(['requestItems.item']);
        foreach ($materialRequest->requestItems as $requestItem) {
            $id = $requestItem->id;
            if (($itemUnitPrices[$id] ?? null) === null && $requestItem->item_id && $requestItem->item) {
                $refPrice = (float) $requestItem->item->unit_cost;
                if ($refPrice > 0) {
                    $itemUnitPrices[$id] = $refPrice;
                }
            }
        }

        try {
            $this->requestApprovalService->approveRequest(
                $materialRequest,
                $request->user(),
                $request->input('approval_notes'),
                $itemUnitPrices
            );

            return redirect()
                ->route('material-requests.show', $materialRequest)
                ->with('success', 'Demande approuvée.' . (array_sum(array_map(fn ($q) => $q * 1, $itemUnitPrices)) > 0 ? ' Le montant a été déduit du budget du campus.' : ''));
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()])->withInput();
        } catch (\Throwable $e) {
            report($e);
            return back()->withErrors(['error' => 'Une erreur inattendue s\'est produite lors de la validation. Veuillez réessayer ou contacter l\'administrateur.'])->withInput();
        }
    }

    /**
     * Reject a submitted request
     *
     * @param MaterialRequest $materialRequest
     * @param Request $request
     * @return RedirectResponse
     */
    public function reject(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        try {
            $this->requestApprovalService->rejectRequest(
                $materialRequest,
                $request->user(),
                $request->input('rejection_reason')
            );

            return redirect()
                ->route('material-requests.index')
                ->with('success', 'Demande rejetée.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Transmettre la demande au directeur (point focal)
     */
    public function transmitToDirector(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $this->authorize('treat', $materialRequest);
        try {
            $this->requestApprovalService->transmitToDirector($materialRequest, $request->user());
            return redirect()->route('material-requests.show', $materialRequest)
                ->with('success', 'Demande transmise au directeur.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Approuver la demande en tant que directeur (avant validation définitive par le point focal).
     * Optionnel : approved_items[] pour approuver par article ; sinon tous les articles sont approuvés.
     */
    public function directorApprove(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Seul le directeur peut approuver une demande transmise.');
        }
        $approvedItemIds = $request->input('approved_items', []);
        if (is_array($approvedItemIds)) {
            $approvedItemIds = array_filter(array_map('intval', $approvedItemIds));
        } else {
            $approvedItemIds = [];
        }
        try {
            $this->requestApprovalService->directorApprove($materialRequest, $request->user(), $approvedItemIds);
            return redirect()->route('material-requests.show', $materialRequest)
                ->with('success', 'Demande approuvée. Le point focal pourra valider définitivement les lignes approuvées.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Rejeter la demande en tant que directeur
     */
    public function directorReject(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
            abort(403, 'Seul le directeur peut rejeter une demande transmise.');
        }
        $request->validate(['rejection_reason' => 'required|string|max:1000']);
        try {
            $this->requestApprovalService->directorReject(
                $materialRequest,
                $request->user(),
                $request->input('rejection_reason')
            );
            return redirect()->route('material-requests.index')
                ->with('success', 'Demande rejetée par le directeur.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Passer la demande en "En cours de traitement" (point focal) — conservé pour compatibilité
     */
    public function setInTreatment(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $this->authorize('treat', $materialRequest);
        try {
            $materialRequest->setInTreatment();
            return redirect()->route('material-requests.show', $materialRequest)
                ->with('success', 'Demande mise en cours de traitement.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Mettre à jour les notes de traitement (point focal)
     */
    public function updateTreatmentNotes(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $this->authorize('treat', $materialRequest);
        $request->validate(['treatment_notes' => 'nullable|string|max:5000']);
        $materialRequest->update(['treatment_notes' => $request->input('treatment_notes')]);
        return redirect()->route('material-requests.show', $materialRequest)
            ->with('success', 'Observation enregistrée.');
    }

    /**
     * Clôturer / livrer la demande (point focal)
     */
    public function setDelivered(MaterialRequest $materialRequest): RedirectResponse
    {
        $this->authorize('treat', $materialRequest);
        try {
            $materialRequest->setDelivered();
            return redirect()->route('material-requests.show', $materialRequest)
                ->with('success', 'Demande clôturée / livrée.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Formulaire « Réception » : constater pour chaque ligne la quantité effectivement reçue (livrée).
     * Étape 1 uniquement : pas de saisie de répartition (stockée / utilisée) — celle-ci sera gérée plus tard.
     * Visible après livraison pour le demandeur (staff) ou le point focal / directeur.
     */
    public function storeStorageForm(MaterialRequest $materialRequest): View|RedirectResponse
    {
        $this->authorize('viewStorage', $materialRequest);
        if (!in_array($materialRequest->status, ['delivered', 'received'])) {
            return redirect()->route('material-requests.show', $materialRequest)
                ->withErrors(['error' => 'Seules les demandes livrées ou réceptionnées sont accessibles.']);
        }
        $materialRequest->load(['requestItems.item.category', 'campus', 'requester']);
        $canEdit = auth()->user()->can('storeStorage', $materialRequest);
        return view('material-requests.store-storage', [
            'materialRequest' => $materialRequest,
            'canEdit' => $canEdit,
        ]);
    }

    /**
     * POST : enregistrer la réception uniquement.
     * Règle : le staff constate la quantité reçue (≤ quantité demandée). La répartition (stockée / utilisée)
     * est dérivée ici : tout le reçu est considéré comme stocké (quantity_available = quantity_received,
     * quantity_used = 0). Une étape ultérieure de gestion du stock pourra modifier la répartition.
     * Persistance explicite en transaction pour garantir cohérence request_items + user_stock_movements.
     */
    public function storeStorage(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $this->authorize('storeStorage', $materialRequest);
        if (!in_array($materialRequest->status, ['delivered', 'received'])) {
            return back()->withErrors(['error' => 'Demande non éligible à l\'enregistrement de réception.']);
        }

        $requestItems = $materialRequest->requestItems;
        $itemIds = $requestItems->pluck('id')->all();
        $rules = [];
        foreach ($itemIds as $id) {
            $rules["items.{$id}.quantity_received"] = 'required|integer|min:0|max:99999';
        }
        $validated = $request->validate($rules);

        $itemsData = $validated['items'];
        $normalizedItems = [];
        foreach ($itemsData as $id => $row) {
            $normalizedItems[(int) $id] = [
                'quantity_received' => (int) ($row['quantity_received'] ?? 0),
            ];
        }

        $beneficiaryUserId = $materialRequest->requester_user_id;

        $totalReceived = 0;
        foreach ($requestItems as $requestItem) {
            $id = $requestItem->id;
            if (!isset($normalizedItems[$id])) {
                return back()->withErrors(['error' => 'Données manquantes pour une ligne. Rechargez le formulaire et réessayez.'])->withInput();
            }
            $received = $normalizedItems[$id]['quantity_received'];
            $totalReceived += $received;
            if ($received > $requestItem->requested_quantity) {
                return back()->withErrors(['error' => "Pour « {$requestItem->getDisplayLabelAttribute()} » : la quantité reçue ne peut pas dépasser la quantité demandée ({$requestItem->requested_quantity})."])->withInput();
            }
        }
        if ($totalReceived === 0) {
            return back()->withErrors(['error' => 'Indiquez au moins une quantité reçue pour enregistrer la réception.'])->withInput();
        }

        \DB::transaction(function () use ($materialRequest, $requestItems, $normalizedItems, $beneficiaryUserId) {
            UserStockMovement::where('reference_type', MaterialRequest::class)
                ->where('reference_id', $materialRequest->id)
                ->delete();

            foreach ($requestItems as $requestItem) {
                $id = $requestItem->id;
                $received = $normalizedItems[$id]['quantity_received'];
                $oldAvailable = (int) $requestItem->quantity_available;
                $available = $received;
                $used = 0;

                $requestItem->quantity_received = $received;
                $requestItem->quantity_available = $available;
                $requestItem->quantity_used = $used;
                $requestItem->status = 'received';
                $requestItem->save();

                if ($requestItem->item_id) {
                    Item::where('id', $requestItem->item_id)->decrement('stock_quantity', $oldAvailable);
                    Item::where('id', $requestItem->item_id)->increment('stock_quantity', $available);
                }

                if ($available > 0) {
                    $designation = $requestItem->designation ?: ($requestItem->item?->description ?? $requestItem->item?->name ?? 'Stock livré');
                    $movement = UserStockMovement::create([
                        'user_id' => $beneficiaryUserId,
                        'item_id' => $requestItem->item_id,
                        'designation' => $designation ?: 'Stock livré',
                        'quantity' => $available,
                        'type' => UserStockMovement::TYPE_RECEIVED,
                        'reference_type' => MaterialRequest::class,
                        'reference_id' => $materialRequest->id,
                        'notes' => 'Réception – ' . $materialRequest->request_number,
                    ]);
                    DeliverySlip::createFromMovement($movement, auth()->id());
                }
            }

            if ($materialRequest->status === 'delivered') {
                $materialRequest->update(['status' => 'received']);
            }
        });

        \App\Models\ActivityLog::logAction(
            $materialRequest,
            'reception_recorded',
            'Réception enregistrée : quantités reçues constatées.',
            $request->user(),
            ['request_number' => $materialRequest->request_number]
        );

        return redirect()->route('material-requests.show', $materialRequest)
            ->with('success', 'Réception enregistrée. Vous pouvez consulter « Mon stock » pour le détail. La répartition (stockée / utilisée) pourra être gérée dans une étape ultérieure.');
    }

    /**
     * Delete a draft request
     *
     * @param MaterialRequest $materialRequest
     * @param Request $request
     * @return RedirectResponse
     */
    public function destroy(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        if ($materialRequest->status !== 'draft') {
            return back()->withErrors(['error' => 'Seules les demandes en brouillon peuvent être supprimées.']);
        }

        $materialRequest->delete();

        return redirect()
            ->route('material-requests.index')
            ->with('success', 'Demande supprimée.');
    }

    /**
     * Ajouter un participant à une demande groupée (même campus).
     * Autorisé : demandeur, point focal, directeur, super admin.
     */
    public function addParticipant(MaterialRequest $materialRequest, Request $request): RedirectResponse
    {
        $this->authorize('update', $materialRequest);
        $request->validate(['user_id' => 'required|exists:users,id']);
        $userId = (int) $request->input('user_id');
        $user = \App\Models\User::findOrFail($userId);
        if ($user->id === $materialRequest->requester_user_id) {
            return back()->with('info', 'Le demandeur est déjà associé à la demande.');
        }
        if ($user->campus_id && $user->campus_id !== $materialRequest->campus_id) {
            return back()->withErrors(['error' => 'Le participant doit appartenir au même campus.']);
        }
        $materialRequest->participants()->syncWithoutDetaching([$userId]);
        return redirect()->route('material-requests.show', $materialRequest)
            ->with('success', 'Participant ajouté à la demande groupée.');
    }

    /**
     * Retirer un participant d'une demande groupée.
     */
    public function removeParticipant(MaterialRequest $materialRequest, User $user): RedirectResponse
    {
        $u = request()->user();
        if ($materialRequest->requester_user_id !== $u->id && !$u->hasAnyRole(['director', 'super_admin', 'point_focal'])) {
            abort(403, 'Vous n\'êtes pas autorisé à gérer les participants.');
        }
        $materialRequest->participants()->detach($user->id);
        return redirect()->route('material-requests.show', $materialRequest)
            ->with('success', 'Participant retiré.');
    }

    /**
     * Generate unique request number
     *
     * Format: REQ-YYYYMM-XXXXX (e.g., REQ-202603-00001)
     *
     * @param int $campusId
     * @return string
     */
    private function generateRequestNumber(int $campusId): string
    {
        $ym = now()->format('Ym');
        $prefix = 'REQ-' . $ym . '-';
        // Inclure les enregistrements soft-deleted pour éviter les doublons (contrainte UNIQUE sur request_number)
        $maxSeq = MaterialRequest::withTrashed()
            ->where('request_number', 'like', $prefix . '%')
            ->get()
            ->map(fn ($mr) => preg_match('/-(\d+)$/', $mr->request_number, $m) ? (int) $m[1] : 0)
            ->push(0)
            ->max();
        return sprintf('REQ-%s-%05d', $ym, $maxSeq + 1);
    }
}
