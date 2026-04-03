<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AppNotification Model
 *
 * Notifications in-app pour les utilisateurs (validation/rejet de commande, etc.)
 *
 * @property int $id
 * @property int $user_id
 * @property string $type
 * @property string $title
 * @property string|null $message
 * @property array|null $data
 * @property \Illuminate\Support\Carbon|null $read_at
 */
class AppNotification extends Model
{
    protected $table = 'app_notifications';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markAsRead(): void
    {
        $this->update(['read_at' => now()]);
    }

    public static function notifyOrderValidated(MaterialRequest $request): void
    {
        static::create([
            'user_id' => $request->requester_user_id,
            'type' => 'order_validated',
            'title' => 'Demande validée',
            'message' => "Votre demande {$request->request_number} a été validée le " . now()->format('d/m/Y à H:i') . '.',
            'data' => [
                'material_request_id' => $request->id,
                'request_number' => $request->request_number,
                'processed_at' => now()->toIso8601String(),
            ],
        ]);
    }

    public static function notifyOrderRejected(MaterialRequest $request, string $reason): void
    {
        static::create([
            'user_id' => $request->requester_user_id,
            'type' => 'order_rejected',
            'title' => 'Demande rejetée',
            'message' => "Votre demande {$request->request_number} a été rejetée le " . now()->format('d/m/Y à H:i') . '. Motif : ' . $reason,
            'data' => [
                'material_request_id' => $request->id,
                'request_number' => $request->request_number,
                'rejection_reason' => $reason,
                'processed_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Notifier les directeurs lorsque le budget utilisé dépasse 70 % (alerte urgence).
     */
    public static function notifyBudgetAlert70(Budget $budget): void
    {
        $campusName = $budget->campus?->name ?? 'Campus';
        $pct = $budget->total_budget > 0
            ? round(($budget->spent_amount / $budget->total_budget) * 100, 1)
            : 0;
        $message = "Alerte budget : le budget de {$campusName} (exercice {$budget->fiscal_year}) a atteint {$pct} % d'utilisation. Solde restant : " . number_format($budget->getRemainingAmount(), 0, ',', ' ') . ' FCFA.';

        $directors = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['director', 'super_admin']))->get();
        foreach ($directors as $user) {
            static::create([
                'user_id' => $user->id,
                'type' => 'budget_alert_70',
                'title' => 'Urgence : budget à plus de 70 %',
                'message' => $message,
                'data' => [
                    'budget_id' => $budget->id,
                    'campus_id' => $budget->campus_id,
                    'utilization_percent' => $pct,
                    'remaining_amount' => (float) $budget->getRemainingAmount(),
                ],
            ]);
        }
    }
}
