<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Mouvement de stock LOCAL du staff (pas le stock central du point focal).
 * - type received : matériel livré au staff par le point focal → ajout au stock du staff.
 * - type distributed : sortie (utilisation/attribution) → décrémente le stock du staff.
 * Quantité restante staff = SUM(received) - SUM(distributed). Destinataire réel obligatoire pour toute sortie.
 */
class UserStockMovement extends Model
{
    protected $table = 'user_stock_movements';

    protected $fillable = [
        'user_id',
        'item_id',
        'category_id',
        'designation',
        'quantity',
        'type',
        'reference_type',
        'reference_id',
        'distributed_to_user_id',
        'recipient',
        'distributed_at',
        'notes',
    ];

    protected $casts = [
        'distributed_at' => 'date',
    ];

    public const TYPE_RECEIVED = 'received';
    public const TYPE_DISTRIBUTED = 'distributed';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function distributedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'distributed_to_user_id');
    }

    /**
     * Synthèse stock personnel par (user, item/designation) : reçus, distribués, restant.
     */
    public static function remainingByUserItem(int $userId): \Illuminate\Support\Collection
    {
        $received = static::where('user_id', $userId)
            ->where('type', self::TYPE_RECEIVED)
            ->selectRaw('item_id, designation, MAX(category_id) as category_id, SUM(quantity) as total')
            ->groupBy('item_id', 'designation')
            ->get();

        $distributed = static::where('user_id', $userId)
            ->where('type', self::TYPE_DISTRIBUTED)
            ->selectRaw('item_id, designation, SUM(quantity) as total')
            ->groupBy('item_id', 'designation')
            ->get();

        $itemIds = $received->pluck('item_id')->merge($distributed->pluck('item_id'))->filter()->unique()->values()->all();
        $itemsWithCategory = empty($itemIds) ? collect() : Item::with('category:id,name')->whereIn('id', $itemIds)->get()->keyBy('id');

        $byKey = [];
        foreach ($received as $r) {
            $key = ($r->item_id ?? 'n') . '|' . ($r->designation ?? '');
            $item = $r->item_id ? $itemsWithCategory->get($r->item_id) : null;
            $designation = $r->designation ?? ($item?->description ?? $item?->name ?? '—');
            $categoryName = $item?->category?->name ?? '—';
            $categoryId = $item?->category_id ?? $r->category_id;
            $byKey[$key] = [
                'item_id' => $r->item_id,
                'designation' => $designation,
                'category_id' => $categoryId,
                'category_name' => $categoryName,
                'quantity_received' => (int) $r->total,
                'quantity_distributed' => 0,
                'quantity_remaining' => (int) $r->total,
            ];
        }
        foreach ($distributed as $d) {
            $key = ($d->item_id ?? 'n') . '|' . ($d->designation ?? '');
            $item = $d->item_id ? $itemsWithCategory->get($d->item_id) : null;
            $designation = $d->designation ?? ($item?->description ?? $item?->name ?? '—');
            $categoryName = $item?->category?->name ?? '—';
            $categoryId = $item?->category_id ?? null;
            if (!isset($byKey[$key])) {
                $byKey[$key] = [
                    'item_id' => $d->item_id,
                    'designation' => $designation,
                    'category_id' => $categoryId,
                    'category_name' => $categoryName,
                    'quantity_received' => 0,
                    'quantity_distributed' => (int) $d->total,
                    'quantity_remaining' => -(int) $d->total,
                ];
            } else {
                $byKey[$key]['quantity_distributed'] = (int) $d->total;
                $byKey[$key]['quantity_remaining'] = $byKey[$key]['quantity_received'] - (int) $d->total;
            }
        }

        return collect($byKey)->map(fn ($row) => (object) $row)->sortByDesc('quantity_remaining')->values();
    }
}
