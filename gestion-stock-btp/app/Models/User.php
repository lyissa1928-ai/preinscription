<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

/**
 * User Model with ESEBAT enhancements
 *
 * Extends Laravel's base User with RBAC via Spatie Permissions
 * Users belong to a campus (multi-tenancy) or are Global (Director, Point Focal)
 *
 * Roles:
 * - director: Global access, creates budgets, approves requests
 * - point_focal: Global access, aggregates requests, manages POs
 * - campus_manager: Campus-scoped access and requests
 * - site_manager: Campus-scoped inventory and allocation
 * - staff: Basic user access
 *
 * @property int $id
 * @property string $name
 * @property string $email Unique
 * @property \Illuminate\Support\Carbon $email_verified_at
 * @property string $password Hashed
 * @property int $campus_id For site-scoped users; null for global users
 * @property bool $is_active
 * @property string $remember_token
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, SoftDeletes;

    protected $table = 'users';

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'matricule',
        'email',
        'phone',
        'address',
        'profile_photo',
        'password',
        'campus_id',
        'is_active',
        'must_change_password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'bool',
            'must_change_password' => 'bool',
        ];
    }

    protected $guard_name = 'web';

    /**
     * Après une suppression (soft delete), vider les données personnelles pour
     * libérer email/matricule et anonymiser l'enregistrement.
     */
    protected static function booted(): void
    {
        static::deleted(function (User $user) {
            if ($user->isForceDeleting()) {
                return;
            }
            $user->updateQuietly([
                'name' => 'Utilisateur supprimé',
                'first_name' => null,
                'last_name' => null,
                'email' => 'deleted_' . $user->id . '@deleted.local',
                'matricule' => null,
                'phone' => null,
                'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(32)),
            ]);
        });
    }

    /**
     * Get the campus this user belongs to
     * Null = Global user (Director, Point Focal)
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    /**
     * Get material requests created by this user
     */
    public function submittedRequests(): HasMany
    {
        return $this->hasMany(MaterialRequest::class, 'requester_user_id');
    }

    /**
     * Get material requests this user participates in (demande groupée)
     */
    public function participatingRequests(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(MaterialRequest::class, 'material_request_participants', 'user_id', 'material_request_id')
            ->withTimestamps();
    }

    /**
     * Generate next matricule for role: staff = STF+3 digits, point_focal = PFE+2, director = DIR+2, super_admin = ADM+2.
     * Inclut les utilisateurs supprimés (withTrashed) pour ne jamais réutiliser un matricule existant.
     */
    public static function generateMatriculeForRole(string $role): ?string
    {
        if ($role === 'staff') {
            $last = static::withTrashed()
                ->whereNotNull('matricule')
                ->where('matricule', 'like', 'STF%')
                ->orderByRaw('CAST(SUBSTRING(matricule, 4) AS UNSIGNED) DESC')
                ->value('matricule');
            $num = $last ? (int) substr($last, 3) + 1 : 1;
            return 'STF' . str_pad((string) $num, 3, '0', STR_PAD_LEFT);
        }
        if ($role === 'point_focal') {
            $last = static::withTrashed()
                ->whereNotNull('matricule')
                ->where('matricule', 'like', 'PFE%')
                ->orderByRaw('CAST(SUBSTRING(matricule, 4) AS UNSIGNED) DESC')
                ->value('matricule');
            $num = $last ? (int) substr($last, 3) + 1 : 1;
            return 'PFE' . str_pad((string) $num, 2, '0', STR_PAD_LEFT);
        }
        if ($role === 'director') {
            $last = static::withTrashed()
                ->whereNotNull('matricule')
                ->where('matricule', 'like', 'DIR%')
                ->orderByRaw('CAST(SUBSTRING(matricule, 4) AS UNSIGNED) DESC')
                ->value('matricule');
            $num = $last ? (int) substr($last, 3) + 1 : 1;
            return 'DIR' . str_pad((string) $num, 2, '0', STR_PAD_LEFT);
        }
        if ($role === 'super_admin') {
            $last = static::withTrashed()
                ->whereNotNull('matricule')
                ->where('matricule', 'like', 'ADM%')
                ->orderByRaw('CAST(SUBSTRING(matricule, 4) AS UNSIGNED) DESC')
                ->value('matricule');
            $num = $last ? (int) substr($last, 3) + 1 : 1;
            return 'ADM' . str_pad((string) $num, 2, '0', STR_PAD_LEFT);
        }
        return null;
    }

    /**
     * URL publique de la photo de profil (storage link).
     */
    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (empty($this->profile_photo)) {
            return null;
        }
        return \Illuminate\Support\Facades\Storage::url($this->profile_photo);
    }

    /**
     * Get requests approved by this user
     */
    public function approvedRequests(): HasMany
    {
        return $this->hasMany(MaterialRequest::class, 'approved_by_user_id');
    }

    /**
     * Get aggregated orders created by this user
     */
    public function createdOrders(): HasMany
    {
        return $this->hasMany(AggregatedOrder::class, 'created_by_user_id');
    }

    /**
     * Get maintenance tickets assigned to this user
     */
    public function assignedTickets(): HasMany
    {
        return $this->hasMany(MaintenanceTicket::class, 'assigned_to_user_id');
    }

    /**
     * Get activity logs created by this user
     */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    /**
     * Notifications in-app (validation/rejet de commande, etc.)
     */
    public function appNotifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    /**
     * Check if user is global (Director or Point Focal)
     */
    public function isGlobal(): bool
    {
        return $this->campus_id === null;
    }

    /**
     * Check if user is site-scoped
     */
    public function isSiteScoped(): bool
    {
        return $this->campus_id !== null;
    }

    /**
     * Check if user can view all campuses
     */
    public function canViewAllCampuses(): bool
    {
        return $this->hasAnyRole(['super_admin', 'director', 'point_focal']);
    }

    /**
     * Check if user is active
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Scope: Only active users
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Global users (no campus)
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('campus_id');
    }

    /**
     * Scope: Campus-scoped users
     */
    public function scopeScoped($query)
    {
        return $query->whereNotNull('campus_id');
    }

    /**
     * Scope: By campus
     */
    public function scopeForCampus($query, Campus $campus)
    {
        return $query->where('campus_id', $campus->id);
    }

    /**
     * Scope: With specific role
     */
    public function scopeWithRole($query, string $role)
    {
        return $query->role($role);
    }

    /**
     * Nom complet : prénom + nom, ou name si pas de first_name/last_name
     */
    public function getDisplayNameAttribute(): string
    {
        if (!empty($this->first_name) || !empty($this->last_name)) {
            return trim($this->first_name . ' ' . $this->last_name) ?: $this->name;
        }
        return $this->name ?? '';
    }
}
