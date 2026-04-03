<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Bon de sortie : généré automatiquement après chaque livraison ou distribution.
 * Traçabilité : matériel, quantité, date, destinataire, auteur.
 */
class DeliverySlip extends Model
{
    protected $table = 'delivery_slips';

    protected $fillable = [
        'slip_number',
        'type',
        'user_stock_movement_id',
        'campus_id',
        'performed_at',
        'recipient_user_id',
        'recipient_label',
        'author_user_id',
        'item_id',
        'designation',
        'quantity',
        'reference_type',
        'reference_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'performed_at' => 'datetime',
        ];
    }

    public const TYPE_DELIVERY = 'delivery';
    public const TYPE_DISTRIBUTION = 'distribution';

    public function userStockMovement(): BelongsTo
    {
        return $this->belongsTo(UserStockMovement::class, 'user_stock_movement_id');
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function recipientUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function authorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Génère le prochain numéro de bon (BOS-AAAA-NNNNN).
     */
    public static function nextSlipNumber(): string
    {
        $year = date('Y');
        $last = static::where('slip_number', 'like', "BOS-{$year}-%")
            ->orderByRaw('CAST(SUBSTRING(slip_number, 10) AS UNSIGNED) DESC')
            ->value('slip_number');
        $num = $last ? (int) substr($last, 10) + 1 : 1;
        return 'BOS-' . $year . '-' . str_pad((string) $num, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Crée un bon de sortie à partir d'un mouvement de stock (livraison ou distribution).
     */
    public static function createFromMovement(UserStockMovement $movement, ?int $authorUserId = null): self
    {
        $authorUserId = $authorUserId ?? $movement->user_id;
        $isDelivery = $movement->type === UserStockMovement::TYPE_RECEIVED;

        $campusId = null;
        $recipientUserId = null;
        $recipientLabel = null;
        if ($isDelivery) {
            $campusId = $movement->user->campus_id;
            $recipientUserId = $movement->user_id;
            $recipientLabel = null;
        } else {
            $campusId = $movement->user->campus_id;
            $recipientUserId = $movement->distributed_to_user_id;
            $recipientLabel = $movement->recipient;
        }

        return static::create([
            'slip_number' => static::nextSlipNumber(),
            'type' => $isDelivery ? self::TYPE_DELIVERY : self::TYPE_DISTRIBUTION,
            'user_stock_movement_id' => $movement->id,
            'campus_id' => $campusId,
            'performed_at' => $isDelivery ? $movement->created_at : ($movement->distributed_at ?? $movement->created_at),
            'recipient_user_id' => $recipientUserId,
            'recipient_label' => $recipientLabel,
            'author_user_id' => $authorUserId,
            'item_id' => $movement->item_id,
            'designation' => $movement->designation,
            'quantity' => $movement->quantity,
            'reference_type' => $movement->reference_type,
            'reference_id' => $movement->reference_id,
            'notes' => $movement->notes,
        ]);
    }

    /**
     * Libellé type pour affichage.
     */
    public function getTypeLabelAttribute(): string
    {
        return $this->type === self::TYPE_DELIVERY ? 'Livraison' : 'Distribution';
    }

    /**
     * Scope : bons visibles par l'utilisateur (staff = concerné, point_focal/directeur = tous).
     */
    public function scopeVisibleBy($query, User $user): void
    {
        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return;
        }
        $query->where(function ($q) use ($user) {
            $q->where('recipient_user_id', $user->id)->orWhere('author_user_id', $user->id);
        });
    }
}
