<?php

namespace App\Services;

use App\Models\MaterialRequest;
use App\Models\RequestItem;
use App\Models\AggregatedOrder;
use App\Models\AggregatedOrderItem;
use App\Models\Supplier;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;
use InvalidArgumentException;

/**
 * FederationService
 *
 * Core service for the Federation workflow
 * Aggregates RequestItems from multiple campuses into single purchase orders
 * Maintains full traceability: which campus line is fulfilled by which PO
 *
 * Key Responsibilities:
 * - Aggregate pending RequestItems by supplier
 * - Create AggregatedOrders with proper linking
 * - Validate aggregation business rules
 * - Log all Federation transactions (immutable audit trail)
 *
 * All operations use database transactions for atomicity
 */
class FederationService
{
    /**
     * Get all pending RequestItems ready for aggregation
     *
     * @return Collection RequestItems with status 'pending'
     */
    public function getPendingItemsForAggregation(): Collection
    {
        return RequestItem::where('status', 'pending')
            ->with(['item', 'materialRequest', 'materialRequest.campus'])
            ->orderBy('item_id')
            ->get();
    }

    /**
     * Get pending items grouped by supplier
     *
     * Useful for Point Focal to see what can be ordered from each supplier
     *
     * @return array<int, Collection> Items grouped by supplier_id
     */
    public function getPendingItemsGroupedBySupplier(): array
    {
        $items = $this->getPendingItemsForAggregation();

        return $items->groupBy(function ($item) {
            // Assume Item has supplier relationship or we lookup from category
            // For now, return supplier_id if available
            return 1; // TODO: Link items to suppliers
        })->all();
    }

    /**
     * Aggregate RequestItems into a single PurchaseOrder
     *
     * Creates AggregatedOrder with AggregatedOrderItems linking back to RequestItems
     * Updates RequestItems status to 'aggregated'
     * Logs the aggregation action
     *
     * @param Supplier $supplier Supplier for this order
     * @param array<int> $requestItemIds RequestItem IDs to aggregate
     * @param User $createdBy User initiating aggregation (Point Focal)
     * @param array $options Optional: expected_delivery_date, notes
     *
     * @return AggregatedOrder The created order
     * @throws InvalidArgumentException If validation fails
     * @throws \RuntimeException On transaction failure
     */
    public function aggregateRequestItems(
        Supplier $supplier,
        array $requestItemIds,
        User $createdBy,
        array $options = []
    ): AggregatedOrder {
        // Validate Point Focal permission
        if (!$createdBy->hasRole('point_focal')) {
            throw new InvalidArgumentException('Only Point Focal users can aggregate requests');
        }

        // Fetch and validate request items
        $requestItems = RequestItem::whereIn('id', $requestItemIds)
            ->where('status', 'pending')
            ->with('item', 'materialRequest')
            ->get();

        if ($requestItems->count() !== count(array_unique($requestItemIds))) {
            throw new InvalidArgumentException('Some RequestItems not found or not in pending status');
        }

        // Validate all items belong to active categories
        $requestItems->each(function ($item) use ($supplier) {
            if (!$item->item->is_active) {
                throw new InvalidArgumentException(
                    "Item {$item->item->code} is inactive and cannot be aggregated"
                );
            }
        });

        return DB::transaction(function () use (
            $supplier,
            $requestItems,
            $createdBy,
            $options
        ) {
            // Create aggregated order
            $poNumber = $this->generatePONumber();

            $aggregatedOrder = AggregatedOrder::create([
                'supplier_id' => $supplier->id,
                'po_number' => $poNumber,
                'status' => 'draft',
                'order_date' => now()->toDate(),
                'expected_delivery_date' => $options['expected_delivery_date'] ?? null,
                'created_by_user_id' => $createdBy->id,
                'notes' => $options['notes'] ?? null,
            ]);

            // Create detail lines (AggregatedOrderItems) linking to RequestItems
            foreach ($requestItems as $requestItem) {
                AggregatedOrderItem::create([
                    'aggregated_order_id' => $aggregatedOrder->id,
                    'request_item_id' => $requestItem->id,
                    'quantity_ordered' => $requestItem->requested_quantity,
                    'unit_price' => $requestItem->unit_price ?? $requestItem->item->unit_cost,
                ]);

                // Update request item status
                $requestItem->update(['status' => 'aggregated']);

                // Log aggregation action
                ActivityLog::logAction(
                    $requestItem,
                    'aggregated',
                    "Item aggregated into PO {$poNumber}",
                    $createdBy,
                    ['previous_status' => 'pending', 'new_status' => 'aggregated']
                );
            }

            // Log aggregated order creation
            ActivityLog::logCreated($aggregatedOrder, $createdBy);

            return $aggregatedOrder;
        });
    }

    /**
     * Confirm (submit) an aggregated order to supplier
     *
     * State transition: draft → confirmed
     *
     * @param AggregatedOrder $order Order to confirm
     * @param User $confirmedBy User confirming
     */
    public function confirmOrder(AggregatedOrder $order, User $confirmedBy): void
    {
        if ($order->status !== 'draft') {
            throw new InvalidArgumentException('Only draft orders can be confirmed');
        }

        $order->confirm();

        ActivityLog::logAction(
            $order,
            'confirmed',
            "Order confirmed and sent to supplier {$order->supplier->name}",
            $confirmedBy,
            ['previous_status' => 'draft', 'new_status' => 'confirmed']
        );
    }

    /**
     * Record receipt of aggregated order items
     *
     * Updates quantities received and item statuses
     * Triggers inventory updates via StockService
     *
     * @param AggregatedOrder $order Order being received
     * @param array<int, int> $itemQuantities Map of AggregatedOrderItem ID to quantity received
     * @param User $receivedBy User processing receipt
     */
    public function recordOrderReceipt(
        AggregatedOrder $order,
        array $itemQuantities,
        User $receivedBy
    ): void {
        if ($order->status === 'cancelled' || $order->status === 'received') {
            throw new InvalidArgumentException('Cannot receive cancelled or already received orders');
        }

        DB::transaction(function () use ($order, $itemQuantities, $receivedBy) {
            foreach ($itemQuantities as $orderItemId => $quantity) {
                $orderItem = AggregatedOrderItem::findOrFail($orderItemId);

                if ($orderItem->aggregated_order_id !== $order->id) {
                    throw new InvalidArgumentException('OrderItem does not belong to this order');
                }

                $orderItem->recordReceipt($quantity);

                // Log receipt
                ActivityLog::logAction(
                    $orderItem->requestItem,
                    'received',
                    "Received {$quantity} units for RequestItem from {$order->supplier->name}",
                    $receivedBy,
                    ['quantity_received' => $quantity]
                );
            }

            // Update order status if fully received
            $totalOrdered = $order->aggregatedOrderItems()->sum('quantity_ordered');
            $totalReceived = $order->aggregatedOrderItems()->sum('quantity_received');

            if ($totalReceived >= $totalOrdered) {
                $order->recordReceipt();
            } elseif ($totalReceived > 0) {
                $order->update(['status' => 'partially_received']);
            }
        });
    }

    /**
     * Cancel an aggregated order
     *
     * Resets RequestItems back to pending status
     *
     * @param AggregatedOrder $order Order to cancel
     * @param string $reason Reason for cancellation
     * @param User $cancelledBy User cancelling
     */
    public function cancelOrder(AggregatedOrder $order, string $reason, User $cancelledBy): void
    {
        if ($order->status === 'cancelled' || $order->status === 'received') {
            throw new InvalidArgumentException('Cannot cancel already completed or cancelled orders');
        }

        DB::transaction(function () use ($order, $reason, $cancelledBy) {
            // Reset request items to pending (if not already received)
            $order->requestItems()
                ->where('status', '!=', 'received')
                ->update(['status' => 'pending']);

            $order->cancel();

            ActivityLog::logAction(
                $order,
                'cancelled',
                "Order cancelled: {$reason}",
                $cancelledBy,
                ['cancelled_by' => $cancelledBy->name]
            );
        });
    }

    /**
     * Generate unique PO number
     *
     * Format: PO-YYYY-XXXXX (e.g., PO-2026-00001)
     */
    private function generatePONumber(): string
    {
        $year = now()->year;
        $lastOrder = AggregatedOrder::where('po_number', 'like', "PO-{$year}-%")
            ->orderByDesc('id')
            ->first();

        $nextNumber = 1;
        if ($lastOrder) {
            $nextNumber = intval(substr($lastOrder->po_number, -5)) + 1;
        }

        return sprintf('PO-%d-%05d', $year, $nextNumber);
    }
}
