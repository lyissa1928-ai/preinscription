<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

/**
 * MaterialRequest Model
 *
 * Header table for material requisitions from campuses
 * Each campus submits requests containing multiple RequestItems
 * Foundation of the Federation workflow
 *
 * @property int $id
 * @property int $campus_id
 * @property int $requester_user_id
 * @property string $request_number Unique identifier
 * @property string $status 'draft', 'submitted', 'approved', 'aggregated', 'received', 'cancelled'
 * @property \Illuminate\Support\Carbon $request_date
 * @property \Illuminate\Support\Carbon $needed_by_date
 * @property string $notes
 * @property \Illuminate\Support\Carbon|null $submitted_at
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property int|null $approved_by_user_id
 */
class MaterialRequest extends Model
{
    /** @use HasFactory<\Database\Factories\MaterialRequestFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'material_requests';

    protected $fillable = [
        'campus_id',
        'department_id',
        'requester_user_id',
        'request_number',
        'status',
        'request_type',
        'subject',
        'justification',
        'request_date',
        'needed_by_date',
        'notes',
        'treatment_notes',
        'submitted_at',
        'transmitted_at',
        'transmitted_by_user_id',
        'approved_at',
        'approved_by_user_id',
        'director_approved_at',
        'director_approved_by_user_id',
        'rejection_reason',
        'rejected_at',
        'rejected_by_user_id',
    ];

    protected $casts = [
        'request_date' => 'date',
        'needed_by_date' => 'date',
        'submitted_at' => 'datetime',
        'transmitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'director_approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    /**
     * Get the requesting campus
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    /**
     * Get the department (service) of the request
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the user who submitted the request
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    /**
     * Get the approving user
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    /**
     * Get the user who rejected the request
     */
    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    /**
     * Get the user (point focal) who transmitted the request to the director
     */
    public function transmittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transmitted_by_user_id');
    }

    /**
     * Get the director who approved the request (before final validation by point focal)
     */
    public function directorApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'director_approved_by_user_id');
    }

    /**
     * Get all request items (line items)
     */
    public function requestItems(): HasMany
    {
        return $this->hasMany(RequestItem::class);
    }

    /**
     * Participants à la demande groupée (staff identifiés)
     */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'material_request_participants', 'material_request_id', 'user_id')
            ->withTimestamps();
    }

    /**
     * Submit a draft request
     */
    public function submit(User $user): void
    {
        $this->update([
            'status' => 'submitted',
            'submitted_at' => Carbon::now(),
        ]);
    }

    /**
     * Valider définitivement la demande (après approbation du directeur). Point focal uniquement.
     */
    public function approve(User $approver): void
    {
        $this->update([
            'status' => 'approved',
            'approved_at' => Carbon::now(),
            'approved_by_user_id' => $approver->id,
        ]);
    }

    /**
     * Cancel the request (optionally with rejection reason)
     */
    public function cancel(User $rejectedBy = null, string $rejectionReason = null): void
    {
        $data = ['status' => 'cancelled'];
        if ($rejectedBy !== null) {
            $data['rejected_at'] = Carbon::now();
            $data['rejected_by_user_id'] = $rejectedBy->id;
        }
        if ($rejectionReason !== null) {
            $data['rejection_reason'] = $rejectionReason;
        }
        $this->update($data);
        $this->requestItems()
            ->whereIn('status', ['pending', 'aggregated'])
            ->update(['status' => 'rejected']);
    }

    /**
     * Transmettre au directeur (point focal). Étape 1 du workflow.
     */
    public function transmitToDirector(User $transmittedBy): void
    {
        if ($this->status !== 'submitted') {
            throw new \InvalidArgumentException('Seules les demandes soumises peuvent être transmises au directeur.');
        }
        $this->update([
            'status' => 'pending_director',
            'transmitted_at' => Carbon::now(),
            'transmitted_by_user_id' => $transmittedBy->id,
        ]);
    }

    /**
     * Approbation par le directeur. Étape 2 du workflow. Ensuite le point focal pourra valider.
     */
    public function setDirectorApproved(User $director): void
    {
        if ($this->status !== 'pending_director') {
            throw new \InvalidArgumentException('Seules les demandes transmises au directeur peuvent être approuvées par celui-ci.');
        }
        $this->update([
            'status' => 'director_approved',
            'director_approved_at' => Carbon::now(),
            'director_approved_by_user_id' => $director->id,
        ]);
    }

    /**
     * Rejet par le directeur.
     */
    public function setDirectorRejected(User $director, string $reason = null): void
    {
        if ($this->status !== 'pending_director') {
            throw new \InvalidArgumentException('Seules les demandes en attente chez le directeur peuvent être rejetées.');
        }
        $this->cancel($director, $reason);
    }

    /**
     * Passer en "En cours de traitement" (point focal) — conservé pour compatibilité si besoin
     */
    public function setInTreatment(): void
    {
        if ($this->status !== 'submitted') {
            throw new \InvalidArgumentException('Seules les demandes soumises peuvent être mises en traitement.');
        }
        $this->update(['status' => 'in_treatment']);
    }

    /**
     * Clôturer / livrer la demande
     */
    public function setDelivered(): void
    {
        if (!in_array($this->status, ['approved', 'received', 'aggregated', 'partially_received'])) {
            throw new \InvalidArgumentException('La demande doit être validée ou déjà en cours de réception.');
        }
        $this->update(['status' => 'delivered']);
    }

    /**
     * Check if all items have been aggregated
     */
    public function isFullyAggregated(): bool
    {
        return $this->requestItems()
            ->where('status', 'pending')
            ->doesntExist();
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
}
