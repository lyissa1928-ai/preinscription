<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\Campus;
use App\Models\Item;
use App\Models\MaterialRequest;
use App\Models\RequestItem;
use App\Models\User;
use App\Models\ActivityLog;
use App\Models\AppNotification;
use App\Services\BudgetService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * RequestApprovalService
 *
 * Manages MaterialRequest workflow through approval process
 * Handles submission, approval, and rejection of campus requests
 *
 * Workflow States:
 * draft → submitted → approved → aggregated → received
 *
 * Key Responsibilities:
 * - Submit requests for approval
 * - Approve/reject requests with validation
 * - Track approval history
 * - Update request statuses atomically
 */
class RequestApprovalService
{
    public function __construct(
        private BudgetService $budgetService
    ) {}

    /**
     * Submit a draft request for approval
     *
     * Validates request has items and user has permission
     * State transition: draft → submitted
     *
     * @param MaterialRequest $request Request to submit
     * @param User $submittedByUser User submitting (must be requester or admin)
     *
     * @throws InvalidArgumentException If validation fails
     */
    public function submitRequest(MaterialRequest $request, User $submittedByUser): void
    {
        // Validate request status
        if ($request->status !== 'draft') {
            throw new InvalidArgumentException('Only draft requests can be submitted');
        }

        // Validate has request items
        if ($request->requestItems()->count() === 0) {
            throw new InvalidArgumentException('Request must have at least one item');
        }

        // L'allocation budgétaire ne bloque pas la soumission : le staff peut toujours soumettre.
        // Le point focal verra un avertissement si le montant de la demande dépasse le solde (voir fiche demande).

        // Validate user is requester or has permission
        if ($request->requester_user_id !== $submittedByUser->id && 
            !$submittedByUser->hasRole(['director', 'super_admin', 'point_focal'])) {
            throw new InvalidArgumentException('You do not have permission to submit this request');
        }

        $request->submit($submittedByUser);

        ActivityLog::logAction(
            $request,
            'submitted',
            'Request submitted for approval',
            $submittedByUser,
            [
                'previous_status' => 'draft',
                'new_status' => 'submitted',
                'item_count' => $request->requestItems()->count(),
            ]
        );
    }

    /**
     * Transmettre la demande au directeur (point focal uniquement).
     * submitted → pending_director
     */
    public function transmitToDirector(MaterialRequest $request, User $user): void
    {
        if ($request->status !== 'submitted') {
            throw new InvalidArgumentException('Seules les demandes soumises peuvent être transmises au directeur.');
        }
        if (!$user->hasRole(['point_focal', 'super_admin'])) {
            throw new InvalidArgumentException('Seul le point focal peut transmettre une demande au directeur.');
        }
        $request->transmitToDirector($user);
        ActivityLog::logAction(
            $request,
            'transmitted_to_director',
            'Demande transmise au directeur',
            $user,
            ['new_status' => 'pending_director']
        );
    }

    /**
     * Approuver la demande en tant que directeur (director_approved). Le point focal pourra ensuite valider définitivement.
     * @param array|null $approvedItemIds IDs des request_items à approuver ; si null ou vide, tous sont approuvés.
     */
    public function directorApprove(MaterialRequest $request, User $user, ?array $approvedItemIds = null): void
    {
        if ($request->status !== 'pending_director') {
            throw new InvalidArgumentException('Seules les demandes transmises au directeur peuvent être approuvées par celui-ci.');
        }
        if (!$user->hasRole(['director', 'super_admin'])) {
            throw new InvalidArgumentException('Seul le directeur peut approuver une demande transmise.');
        }
        $allIds = $request->requestItems()->pluck('id')->all();
        if ($approvedItemIds !== null) {
            $approved = array_map('intval', array_filter($approvedItemIds));
            if (count($approved) === 0) {
                throw new InvalidArgumentException('Sélectionnez au moins un article à approuver.');
            }
            $request->requestItems()->update(['director_approved' => false]);
            $request->requestItems()->whereIn('id', $approved)->update(['director_approved' => true]);
        } else {
            $request->requestItems()->update(['director_approved' => true]);
        }
        $request->setDirectorApproved($user);
        ActivityLog::logAction(
            $request,
            'director_approved',
            'Demande approuvée par le directeur (en attente de validation par le point focal)',
            $user,
            ['new_status' => 'director_approved']
        );
    }

    /**
     * Rejeter la demande par le directeur (pending_director → cancelled).
     */
    public function directorReject(MaterialRequest $request, User $user, string $reason): void
    {
        if ($request->status !== 'pending_director') {
            throw new InvalidArgumentException('Seules les demandes en attente chez le directeur peuvent être rejetées.');
        }
        if (!$user->hasRole(['director', 'super_admin'])) {
            throw new InvalidArgumentException('Seul le directeur peut rejeter une demande transmise.');
        }
        DB::transaction(function () use ($request, $user, $reason) {
            $request->setDirectorRejected($user, $reason);
            ActivityLog::logAction($request, 'rejected', "Demande rejetée par le directeur : {$reason}", $user, ['new_status' => 'cancelled']);
            $request->requestItems()->each(function ($item) use ($user, $reason) {
                ActivityLog::logAction($item, 'rejected', "Item rejeté avec la demande : {$reason}", $user);
            });
            AppNotification::notifyOrderRejected($request, $reason);
        });
    }

    /**
     * Valider définitivement la demande (point focal uniquement, après approbation du directeur).
     * Si des prix unitaires sont fournis, le coût total est déduit du budget actif du campus.
     *
     * @param MaterialRequest $request
     * @param User $approverUser Point focal ou super_admin
     * @param string|null $notes
     * @param array $itemUnitPrices [request_item_id => unit_price]
     */
    public function approveRequest(
        MaterialRequest $request,
        User $approverUser,
        string $notes = null,
        array $itemUnitPrices = []
    ): void {
        if ($request->status !== 'director_approved') {
            throw new InvalidArgumentException('Seules les demandes approuvées par le directeur peuvent être validées (par le point focal).');
        }
        if (!$approverUser->hasRole(['point_focal', 'super_admin'])) {
            throw new InvalidArgumentException('Seul le point focal peut valider définitivement la demande après approbation du directeur.');
        }

        // Ne traiter que les lignes approuvées par le directeur (le staff ne reçoit que ce qui est approuvé et disponible).
        $items = $request->requestItems()->where('director_approved', true)->with('item')->get();

        if ($items->isEmpty()) {
            throw new InvalidArgumentException('Aucune ligne approuvée par le directeur. Le directeur doit approuver au moins un article.');
        }

        // Rupture de stock : seul le matériel concerné ne peut pas être validé ; on bloque la validation et on liste les articles en rupture.
        $ruptures = [];
        foreach ($items as $item) {
            if (!$item->item_id || !$item->item) {
                continue;
            }
            $available = (int) $item->item->stock_quantity;
            if ($available < $item->requested_quantity) {
                $ruptures[] = $item->getDisplayLabelAttribute() . ' (disponible : ' . $available . ', demandé : ' . $item->requested_quantity . ')';
            }
        }
        if (count($ruptures) > 0) {
            throw new InvalidArgumentException(
                'Rupture de stock côté point focal. Les articles suivants ne peuvent pas être validés : ' . implode(' ; ', $ruptures) . '. Réapprovisionnez ou ajustez la demande.'
            );
        }

        $totalCost = 0;
        foreach ($items as $item) {
            $unitPrice = $itemUnitPrices[$item->id] ?? $item->unit_price;
            if ($unitPrice !== null && $unitPrice !== '') {
                $unitPrice = (float) $unitPrice;
                if ($unitPrice < 0) {
                    throw new InvalidArgumentException('Le prix unitaire ne peut pas être négatif.');
                }
                $totalCost += $unitPrice * $item->requested_quantity;
            }
        }

        if ($totalCost > 0) {
            $budget = Budget::where('campus_id', $request->campus_id)
                ->where('fiscal_year', now()->year)
                ->where('status', 'active')
                ->first();

            if (!$budget) {
                throw new InvalidArgumentException('Aucun budget actif pour ce campus pour l\'année en cours. Le directeur doit créer et activer un budget.');
            }

            if (!$budget->canSpend($totalCost)) {
                $remaining = $budget->getRemainingAmount();
                throw new InvalidArgumentException(
                    'Budget insuffisant pour valider cette demande. Solde disponible : ' . number_format($remaining, 0, ',', ' ') . ' FCFA. Coût total de la demande : ' . number_format($totalCost, 0, ',', ' ') . ' FCFA. Une nouvelle allocation budgétaire par le directeur est nécessaire.'
                );
            }

            DB::transaction(function () use ($request, $approverUser, $totalCost, $budget, $itemUnitPrices, $items) {
                foreach ($items as $item) {
                    $unitPrice = $itemUnitPrices[$item->id] ?? $item->unit_price;
                    if ($unitPrice !== null && $unitPrice !== '') {
                        $item->update(['unit_price' => (float) $unitPrice]);
                    }
                }
                $this->budgetService->recordExpenseAgainstBudget(
                    $budget,
                    $totalCost,
                    'Demande de matériel #' . ($request->request_number ?? $request->id),
                    $approverUser,
                    $request
                );
                $request->approve($approverUser);
                // La quantité d'un équipement diminue quand une demande validée concerne ce matériel
                foreach ($items as $requestItem) {
                    if ($requestItem->item_id && $requestItem->requested_quantity > 0) {
                        Item::where('id', $requestItem->item_id)->decrement('stock_quantity', $requestItem->requested_quantity);
                    }
                }
            });
        } else {
            foreach ($items as $item) {
                $unitPrice = $itemUnitPrices[$item->id] ?? $item->unit_price;
                if ($unitPrice !== null && $unitPrice !== '') {
                    $item->update(['unit_price' => (float) $unitPrice]);
                }
            }
            $request->approve($approverUser);
            foreach ($items as $requestItem) {
                if ($requestItem->item_id && $requestItem->requested_quantity > 0) {
                    Item::where('id', $requestItem->item_id)->decrement('stock_quantity', $requestItem->requested_quantity);
                }
            }
        }

        if ($notes) {
            $request->update(['notes' => $notes]);
        }

        ActivityLog::logAction(
            $request,
            'approved',
            'Request approved' . ($totalCost > 0 ? ' (déduction budget : ' . number_format($totalCost, 0, ',', ' ') . ' FCFA)' : ''),
            $approverUser,
            [
                'previous_status' => $request->getOriginal('status'),
                'new_status' => 'approved',
                'approved_by' => $approverUser->name,
            ]
        );

        AppNotification::notifyOrderValidated($request);
    }

    /**
     * Reject a submitted request
     *
     * Marks request and all items as cancelled/rejected
     * State transition: submitted → cancelled
     *
     * @param MaterialRequest $request
     * @param User $rejectingUser
     * @param string $reason Reason for rejection
     *
     * @throws InvalidArgumentException
     */
    public function rejectRequest(
        MaterialRequest $request,
        User $rejectingUser,
        string $reason
    ): void {
        if ($request->status !== 'submitted') {
            throw new InvalidArgumentException('Seules les demandes soumises peuvent être rejetées (avant transmission au directeur).');
        }

        if (!$rejectingUser->hasRole(['director', 'super_admin', 'point_focal'])) {
            throw new InvalidArgumentException('Vous n\'avez pas le droit de rejeter les demandes.');
        }

        DB::transaction(function () use ($request, $rejectingUser, $reason) {
            // Mark request as cancelled with rejection reason (and items as rejected)
            $request->cancel($rejectingUser, $reason);

            ActivityLog::logAction(
                $request,
                'rejected',
                "Request rejected: {$reason}",
                $rejectingUser,
                ['previous_status' => 'submitted', 'new_status' => 'cancelled']
            );

            // Log each rejected item
            $request->requestItems()->each(function ($item) use ($rejectingUser, $reason) {
                ActivityLog::logAction(
                    $item,
                    'rejected',
                    "Item rejected with request: {$reason}",
                    $rejectingUser
                );
            });

            AppNotification::notifyOrderRejected($request, $reason);
        });
    }

    /**
     * Add item to a draft request
     *
     * @param MaterialRequest $request
     * @param int $itemId
     * @param int $quantity
     * @param float|null $unitPrice Expected unit price
     * @param string|null $notes
     *
     * @return RequestItem
     */
    public function addItemToRequest(
        MaterialRequest $request,
        int $itemId,
        int $quantity,
        float $unitPrice = null,
        string $notes = null,
        ?int $requestedByUserId = null
    ): RequestItem {
        if ($request->status !== 'draft') {
            throw new InvalidArgumentException('Can only add items to draft requests');
        }

        if ($quantity <= 0) {
            throw new InvalidArgumentException('Quantity must be positive');
        }

        // Check if item already in request
        $existing = $request->requestItems()
            ->where('item_id', $itemId)
            ->first();

        if ($existing) {
            throw new InvalidArgumentException('Item already exists in this request');
        }

        // Alerte rupture de stock : si quantité demandée > stock disponible, refuser
        $item = Item::find($itemId);
        if ($item && $item->getAvailableStock() < $quantity) {
            $available = $item->getAvailableStock();
            throw new InvalidArgumentException(
                'Rupture de stock : ce matériel n\'est plus disponible en quantité suffisante. Stock disponible : ' . $available . '. Réduisez la quantité ou choisissez un autre article.'
            );
        }

        $requestItem = $request->requestItems()->create([
            'item_id' => $itemId,
            'requested_by_user_id' => $requestedByUserId,
            'requested_quantity' => $quantity,
            'unit_price' => $unitPrice,
            'notes' => $notes,
            'status' => 'pending',
        ]);

        ActivityLog::logCreated($requestItem);

        return $requestItem;
    }

    /**
     * Remove item from draft request
     *
     * @param MaterialRequest $request
     * @param RequestItem $item
     *
     * @throws InvalidArgumentException
     */
    public function removeItemFromRequest(MaterialRequest $request, RequestItem $item): void
    {
        if ($request->status !== 'draft') {
            throw new InvalidArgumentException('Can only remove items from draft requests');
        }

        if ($item->material_request_id !== $request->id) {
            throw new InvalidArgumentException('Item does not belong to this request');
        }

        $item->delete();

        ActivityLog::logAction(
            $item,
            'deleted',
            'Item removed from draft request',
            null,
            ['item_name' => $item->item->name]
        );
    }

    /**
     * Get pending approvals for a user
     *
     * Returns requests awaiting this user's approval
     *
     * @param User $user
     * @return \Illuminate\Database\Eloquent\Collection
     */
    /**
     * Demandes en attente selon le rôle : directeur = pending_director ; point focal = submitted (à transmettre) + director_approved (à valider).
     */
    public function getPendingApprovalsFor(User $user)
    {
        if ($user->hasRole(['director', 'super_admin'])) {
            return MaterialRequest::where('status', 'pending_director')
                ->with(['campus', 'requester', 'requestItems.item', 'transmittedBy'])
                ->orderBy('transmitted_at')
                ->get();
        }
        if ($user->hasRole(['point_focal', 'super_admin'])) {
            return MaterialRequest::whereIn('status', ['submitted', 'director_approved'])
                ->with(['campus', 'requester', 'requestItems.item', 'directorApprovedBy'])
                ->orderByRaw("CASE status WHEN 'submitted' THEN 0 WHEN 'director_approved' THEN 1 END")
                ->orderBy('created_at', 'desc')
                ->get();
        }
        return collect();
    }

    /**
     * Get request statistics for a campus (or global when $campus is null)
     *
     * @param Campus|null $campus When null (e.g. director), returns stats across all campuses
     * @return array Stats
     */
    public function getRequestStats(?Campus $campus): array
    {
        $query = MaterialRequest::query();
        if ($campus !== null) {
            $query->where('campus_id', $campus->id);
        }

        return [
            'total' => (clone $query)->count(),
            'draft' => (clone $query)->where('status', 'draft')->count(),
            'submitted' => (clone $query)->where('status', 'submitted')->count(),
            'pending_director' => (clone $query)->where('status', 'pending_director')->count(),
            'director_approved' => (clone $query)->where('status', 'director_approved')->count(),
            'approved' => (clone $query)->where('status', 'approved')->count(),
            'aggregated' => (clone $query)->where('status', 'aggregated')->count(),
            'received' => (clone $query)->where('status', 'received')->count(),
        ];
    }
}
