<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Asset;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\Campus;
use Illuminate\Database\Eloquent\Collection;
use InvalidArgumentException;

/**
 * StockService
 *
 * Manages inventory for both consommables (Items) and assets (Equipment)
 * Handles stock updates, alerts, and lifecycle tracking
 *
 * Key Responsibilities:
 * - Monitor stock levels and reorder thresholds
 * - Manage item allocations and reservations
 * - Track asset lifecycle states
 * - Generate low-stock and decommission alerts
 */
class StockService
{
    /**
     * Get all items with low stock
     *
     * @return Collection Items where stock_quantity <= reorder_threshold
     */
    public function getLowStockItems(): Collection
    {
        return Item::lowStock()
            ->active()
            ->with('category')
            ->get();
    }

    /**
     * Get low stock items for a specific campus (via requests)
     *
     * @param Campus $campus
     * @return Collection Low stock items relevant to this campus
     */
    public function getLowStockItemsForCampus(Campus $campus): Collection
    {
        // Get items from pending requests at this campus
        return Item::whereHas('requestItems', function ($query) use ($campus) {
            $query->whereHas('materialRequest', function ($q) use ($campus) {
                $q->where('campus_id', $campus->id)
                  ->where('status', '!=', 'cancelled');
            })
            ->where('status', 'pending');
        })
        ->lowStock()
        ->active()
        ->distinct()
        ->get();
    }

    /**
     * Get available stock for an item
     *
     * Subtracts pending and aggregated request quantities from physical stock
     *
     * @param Item $item
     * @return int Available quantity ready to fulfill
     */
    public function getAvailableStock(Item $item): int
    {
        return $item->getAvailableStock();
    }

    /**
     * Update item stock quantity
     *
     * Records changes in activity log for audit trail
     *
     * @param Item $item Item to update
     * @param int $quantity New quantity (absolute)
     * @param string $reason Reason for update
     * @param User|null $user User making change
     */
    public function updateStock(Item $item, int $quantity, string $reason, User $user = null): void
    {
        if ($quantity < 0) {
            throw new InvalidArgumentException('Stock quantity cannot be negative');
        }

        $previousQuantity = $item->stock_quantity;
        $item->update(['stock_quantity' => $quantity]);

        ActivityLog::logAction(
            $item,
            'updated',
            "Stock adjusted: {$reason}",
            $user,
            [
                'previous_quantity' => $previousQuantity,
                'new_quantity' => $quantity,
                'difference' => $quantity - $previousQuantity,
                'reason' => $reason,
            ]
        );
    }

    /**
     * Increment stock (receipt from order)
     *
     * @param Item $item
     * @param int $quantity Quantity to add
     * @param string $reason
     * @param User|null $user
     */
    public function incrementStock(Item $item, int $quantity, string $reason, User $user = null): void
    {
        $this->updateStock($item, $item->stock_quantity + $quantity, $reason, $user);
    }

    /**
     * Decrement stock (consumption)
     *
     * @param Item $item
     * @param int $quantity Quantity to subtract
     * @param string $reason
     * @param User|null $user
     * @throws InvalidArgumentException If insufficient stock
     */
    public function decrementStock(Item $item, int $quantity, string $reason, User $user = null): void
    {
        if ($this->getAvailableStock($item) < $quantity) {
            throw new InvalidArgumentException(
                "Insufficient stock for item {$item->code}. Available: " . $this->getAvailableStock($item)
            );
        }

        $this->updateStock($item, $item->stock_quantity - $quantity, $reason, $user);
    }

    /**
     * Get assets by status
     *
     * @param string $status 'en_service', 'maintenance', 'reformé'
     * @return Collection
     */
    public function getAssetsByStatus(string $status): Collection
    {
        return Asset::where('status', $status)
            ->with(['category', 'currentCampus', 'currentWarehouse'])
            ->get();
    }

    /**
     * Get assets at a specific campus
     *
     * @param Campus $campus
     * @return Collection
     */
    public function getAssetsAtCampus(Campus $campus): Collection
    {
        return Asset::where('current_campus_id', $campus->id)
            ->with('category')
            ->get();
    }

    /**
     * Transfer asset to maintenance
     *
     * @param Asset $asset
     * @param string $reason Maintenance reason
     * @param User $user User authorizing
     */
    public function transferToMaintenance(Asset $asset, string $reason, User $user): void
    {
        if ($asset->status === 'maintenance') {
            throw new InvalidArgumentException('Asset is already in maintenance');
        }

        $previousStatus = $asset->status;
        $asset->markForMaintenance();

        ActivityLog::logAction(
            $asset,
            'updated',
            "Asset transferred to maintenance: {$reason}",
            $user,
            ['previous_status' => $previousStatus, 'new_status' => 'maintenance']
        );
    }

    /**
     * Decommission (reform) an asset
     *
     * @param Asset $asset
     * @param string $reason Decommission reason
     * @param User $user User authorizing
     */
    public function decommissionAsset(Asset $asset, string $reason, User $user): void
    {
        if ($asset->status === 'reformé') {
            throw new InvalidArgumentException('Asset is already decommissioned');
        }

        $previousStatus = $asset->status;
        $asset->decommission();

        ActivityLog::logAction(
            $asset,
            'updated',
            "Asset decommissioned: {$reason}",
            $user,
            ['previous_status' => $previousStatus, 'new_status' => 'reformé']
        );
    }

    /**
     * Move asset to warehouse
     *
     * @param Asset $asset
     * @param Campus $campus
     * @param Warehouse|null $warehouse
     * @param string $locationDetail Additional location info
     * @param User $user
     */
    public function moveAsset(
        Asset $asset,
        Campus $campus,
        $warehouse = null,
        string $locationDetail = null,
        User $user = null
    ): void {
        $previousCampus = $asset->current_campus_id;
        $previousWarehouse = $asset->current_warehouse_id;

        $asset->update([
            'current_campus_id' => $campus->id,
            'current_warehouse_id' => $warehouse?->id,
            'location_detail' => $locationDetail,
        ]);

        ActivityLog::logAction(
            $asset,
            'updated',
            "Asset relocated to {$campus->name}" . ($warehouse ? " / {$warehouse->name}" : ''),
            $user,
            [
                'previous_campus' => $previousCampus,
                'previous_warehouse' => $previousWarehouse,
                'new_campus' => $campus->id,
                'new_warehouse' => $warehouse?->id,
            ]
        );
    }

    /**
     * Get assets requiring maintenance soon
     * (Check maintenance_tickets for pending ones)
     *
     * @return Collection
     */
    public function getAssetsRequiringMaintenance(): Collection
    {
        return Asset::whereHas('maintenanceTickets', function ($query) {
            $query->where('status', 'open');
        })
        ->where('status', '!=', 'reformé')
        ->get();
    }

    /**
     * Generate low stock alert report
     *
     * @return array Report with items and recommendations
     */
    public function generateLowStockAlert(): array
    {
        $lowStockItems = $this->getLowStockItems();

        return [
            'total_items_low' => $lowStockItems->count(),
            'items' => $lowStockItems->map(function ($item) {
                return [
                    'id' => $item->id,
                    'code' => $item->code,
                    'name' => $item->name,
                    'current_stock' => $item->stock_quantity,
                    'threshold' => $item->reorder_threshold,
                    'reorder_qty' => $item->reorder_quantity,
                    'unit' => $item->unit,
                    'unit_cost' => $item->unit_cost,
                    'estimated_cost' => $item->unit_cost * $item->reorder_quantity,
                ];
            })->all(),
            'total_estimated_cost' => $lowStockItems->sum(function ($item) {
                return $item->unit_cost * $item->reorder_quantity;
            }),
        ];
    }
}
