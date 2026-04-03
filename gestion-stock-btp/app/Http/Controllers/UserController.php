<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Campus;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

/**
 * UserController
 *
 * Gestion des comptes utilisateurs : Super Admin et Directeur (admin).
 * Création, modification, association campus et rôle (RBAC).
 * Les rôles super_admin et director peuvent créer et gérer les utilisateurs.
 */
class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->hasAnyRole(['super_admin', 'director'])) {
                abort(403, 'Seuls le Super Admin et le Directeur peuvent gérer les utilisateurs.');
            }
            return $next($request);
        });
    }

    public function index(Request $request): View
    {
        $query = User::with(['campus', 'roles'])
            ->orderBy('name');

        if ($request->filled('campus_id')) {
            $query->where('campus_id', $request->campus_id);
        }
        if ($request->filled('role')) {
            $query->role($request->role);
        }
        if ($request->filled('active')) {
            if ($request->active === '1') {
                $query->where('is_active', true);
            } elseif ($request->active === '0') {
                $query->where('is_active', false);
            }
        }

        $users = $query->paginate(15)->withQueryString();
        $campuses = Campus::orderBy('name')->get();

        return view('users.index', [
            'users'    => $users,
            'campuses' => $campuses,
        ]);
    }

    public function create(): View
    {
        $campuses = Campus::orderBy('name')->get();
        $allRoles = \Spatie\Permission\Models\Role::where('guard_name', 'web')->orderBy('name')->get();
        // Super Admin peut créer Point focal, Staff et Directeur ; Directeur peut créer seulement Point focal et Staff
        $allowedRoles = request()->user()->hasRole('super_admin')
            ? ['point_focal', 'staff', 'director']
            : ['point_focal', 'staff'];
        $roles = $allRoles->filter(fn ($r) => in_array($r->name, $allowedRoles, true));

        return view('users.create', [
            'campuses' => $campuses,
            'roles'    => $roles->values(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $name = trim($validated['first_name'] . ' ' . $validated['last_name']);
        $role = $validated['role'];

        // Matricule généré automatiquement selon le rôle (STF001, PFE01, etc.)
        $matricule = User::generateMatriculeForRole($role);

        $user = User::create([
            'name'       => $name,
            'first_name' => $validated['first_name'],
            'last_name'  => $validated['last_name'],
            'matricule'  => $matricule,
            'email'      => $validated['email'],
            'phone'      => $validated['phone'] ?? null,
            'address'    => $validated['address'] ?? null,
            'password'   => $validated['password'],
            'campus_id'  => in_array($role, ['director', 'point_focal']) ? null : ($validated['campus_id'] ?? null),
            'is_active'  => $validated['is_active'] ?? true,
            'must_change_password' => true,
        ]);

        $user->syncRoles([$role]);

        // Si aucun matricule n'a été généré (rôle inattendu), en attribuer un après création
        if (empty($user->matricule)) {
            $user->matricule = 'USR' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT);
            $user->saveQuietly();
        }

        $message = $user->matricule
            ? "Utilisateur créé avec succès. Matricule : {$user->matricule}."
            : 'Utilisateur créé avec succès.';

        return redirect()
            ->route('users.show', $user)
            ->with('success', $message);
    }

    public function show(Request $request, User $user): View|RedirectResponse
    {
        if (!$request->user()->hasRole('super_admin') && $request->user()->id !== $user->id) {
            abort(403, 'Vous ne pouvez consulter que votre propre fiche ou les fiches gérées par l\'administrateur.');
        }
        // Centralisation : consulter sa propre fiche → redirection vers Paramètres du compte
        if ($request->user()->id === $user->id) {
            return redirect()->route('account.index');
        }
        $user->load(['campus', 'roles', 'submittedRequests' => fn ($q) => $q->latest()->limit(10)]);

        return view('users.show', ['user' => $user]);
    }

    public function edit(User $user): View
    {
        $campuses = Campus::orderBy('name')->get();
        $allRoles = \Spatie\Permission\Models\Role::where('guard_name', 'web')->orderBy('name')->get();
        // Super Admin ne peut pas changer le rôle en Directeur à la création ; en édition on autorise tous les rôles (y compris directeur pour modifier le compte directeur)
        $roles = $allRoles->filter(fn ($r) => in_array($r->name, ['director', 'point_focal', 'staff'], true));

        return view('users.edit', [
            'user'     => $user,
            'campuses' => $campuses,
            'roles'    => $roles->values(),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();
        $name = trim($validated['first_name'] . ' ' . $validated['last_name']);

        $data = [
            'name'       => $name,
            'first_name' => $validated['first_name'],
            'last_name'  => $validated['last_name'],
            'email'      => $validated['email'],
            'phone'      => $validated['phone'] ?? null,
            'address'    => $validated['address'] ?? null,
            'campus_id'  => in_array($validated['role'], ['director', 'point_focal']) ? null : ($validated['campus_id'] ?? null),
            'is_active'  => $validated['is_active'] ?? true,
        ];

        if (empty($user->matricule)) {
            $matricule = User::generateMatriculeForRole($validated['role']);
            if ($matricule) {
                $data['matricule'] = $matricule;
            }
        }

        if ($request->hasFile('profile_photo')) {
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }
            $path = $request->file('profile_photo')->store('profile_photos', 'public');
            $data['profile_photo'] = $path;
        }

        if (!empty($validated['password'])) {
            $data['password'] = $validated['password'];
            $data['must_change_password'] = true;
        }
        $user->update($data);
        $user->syncRoles([$validated['role']]);

        return redirect()
            ->route('users.show', $user)
            ->with('success', 'Utilisateur mis à jour.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return redirect()->route('users.index')->with('error', 'Vous ne pouvez pas supprimer votre propre compte.');
        }
        $user->delete();
        return redirect()->route('users.index')->with('success', 'Utilisateur supprimé.');
    }

    /**
     * Actions par lot
     */
    public function batchDestroy(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer|exists:users,id']);
        $me = $request->user()->id;
        $ids = array_filter($request->ids, fn ($id) => (int) $id !== $me);
        $count = User::whereIn('id', $ids)->delete();
        return redirect()->route('users.index')->with('success', $count . ' utilisateur(s) supprimé(s).');
    }

    public function batchAssignCampus(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:users,id',
            'campus_id' => 'required|exists:campuses,id',
        ]);
        $campusId = (int) $request->campus_id;
        $ids = $request->ids;
        $count = User::whereIn('id', $ids)->whereHas('roles', fn ($q) => $q->where('name', 'staff'))->update(['campus_id' => $campusId]);
        return redirect()->route('users.index')->with('success', 'Campus mis à jour pour ' . $count . ' utilisateur(s) staff.');
    }

    public function batchSuspend(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer|exists:users,id']);
        $me = $request->user()->id;
        $ids = array_filter($request->ids, fn ($id) => (int) $id !== $me);
        $count = User::whereIn('id', $ids)->update(['is_active' => false]);
        return redirect()->route('users.index')->with('success', $count . ' utilisateur(s) suspendu(s). Ils ne pourront plus faire de demandes.');
    }

    public function batchActivate(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer|exists:users,id']);
        $count = User::whereIn('id', $request->ids)->update(['is_active' => true]);
        return redirect()->route('users.index')->with('success', $count . ' utilisateur(s) réactivé(s).');
    }

    /**
     * Libellés des rôles pour l'affichage
     */
    public static function roleLabels(): array
    {
        return [
            'super_admin' => 'Super Admin',
            'director'    => 'Directeur',
            'point_focal' => 'Point focal logistique',
            'staff'       => 'Staff',
        ];
    }
}
