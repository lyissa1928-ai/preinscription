<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

/**
 * MaintenanceTicket Model
 *
 * Tracks preventive and corrective maintenance for assets
 * Complements asset lifecycle management
 *
 * @property int $id
 * @property int $asset_id
 * @property string $ticket_number Unique identifier
 * @property string $type 'preventive' or 'corrective'
 * @property string $status 'open', 'in_progress', 'pending_parts', 'resolved', 'closed'
 * @property string $description
 * @property \Illuminate\Support\Carbon $reported_date
 * @property \Illuminate\Support\Carbon $scheduled_date
 * @property \Illuminate\Support\Carbon $completed_date
 * @property int|null $assigned_to_user_id
 * @property float $estimated_cost
 * @property float $actual_cost
 * @property string $resolution_notes
 */
class MaintenanceTicket extends Model
{
    /** @use HasFactory<\Database\Factories\MaintenanceTicketFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'maintenance_tickets';

    protected $fillable = [
        'asset_id',
        'ticket_number',
        'type',
        'status',
        'description',
        'reported_date',
        'scheduled_date',
        'completed_date',
        'assigned_to_user_id',
        'estimated_cost',
        'actual_cost',
        'resolution_notes',
    ];

    protected $casts = [
        'reported_date' => 'date',
        'scheduled_date' => 'date',
        'completed_date' => 'date',
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
    ];

    /**
     * Get the asset
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get assigned technician
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    /**
     * Assign ticket to technician
     */
    public function assign(User $technician): void
    {
        $this->update(['assigned_to_user_id' => $technician->id]);
    }

    /**
     * Start work on ticket
     */
    public function startWork(): void
    {
        $this->update(['status' => 'in_progress']);
    }

    /**
     * Mark as pending spare parts
     */
    public function markPendingParts(): void
    {
        $this->update(['status' => 'pending_parts']);
    }

    /**
     * Resolve ticket
     */
    public function resolve($notes, $actualCost = null): void
    {
        $this->update([
            'status' => 'resolved',
            'resolution_notes' => $notes,
            'actual_cost' => $actualCost,
        ]);
    }

    /**
     * Close ticket
     */
    public function close(): void
    {
        $this->update([
            'status' => 'closed',
            'completed_date' => Carbon::now(),
        ]);
    }

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['open', 'in_progress', 'pending_parts']);
    }

    public function scopeClosed($query)
    {
        return $query->whereIn('status', ['resolved', 'closed']);
    }
}
