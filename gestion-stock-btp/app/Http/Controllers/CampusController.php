<?php

namespace App\Http\Controllers;

use App\Models\Campus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * CampusController
 *
 * Gestion des campus (Admin / Director uniquement).
 * Création, modification, association du responsable de commande.
 */
class CampusController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->hasAnyRole(['director', 'super_admin'])) {
                abort(403, 'Seul l\'administrateur peut gérer les campus.');
            }
            return $next($request);
        });
    }

    public function index(Request $request): View
    {
        $campuses = Campus::with('orderResponsible')
            ->orderBy('name')
            ->paginate(15);

        return view('campuses.index', [
            'campuses' => $campuses,
        ]);
    }

    public function create(Request $request): View
    {
        if (!$request->user()->hasRole('super_admin')) {
            abort(403, 'Seul l\'administrateur peut créer des campus.');
        }
        $usersWithRole = User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['point_focal', 'staff']);
        })->orderBy('name')->get();

        return view('campuses.create', [
            'usersForResponsible' => $usersWithRole,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:campuses,name',
            'code' => 'required|string|max:20|unique:campuses,code',
            'city' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'order_responsible_user_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Le nom du campus est obligatoire.',
            'name.unique' => 'Un campus avec ce nom existe déjà.',
            'code.required' => 'Le code est obligatoire.',
            'code.unique' => 'Ce code de campus est déjà utilisé.',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $campus = Campus::create($validated);

        if (!empty($validated['order_responsible_user_id']) && Schema::hasColumn('users', 'campus_id')) {
            User::where('id', $validated['order_responsible_user_id'])
                ->update(['campus_id' => $campus->id]);
        }

        return redirect()
            ->route('campuses.index')
            ->with('success', 'Campus créé avec succès.');
    }

    public function show(Campus $campus): View
    {
        $campus->load('orderResponsible', 'materialRequests.requester');
        $staff = User::where('campus_id', $campus->id)->with('roles')->orderBy('name')->get();
        return view('campuses.show', ['campus' => $campus, 'staff' => $staff]);
    }

    public function edit(Request $request, Campus $campus): View
    {
        if (!$request->user()->hasRole('super_admin')) {
            abort(403, 'Seul l\'administrateur peut modifier des campus.');
        }
        $usersWithRole = User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['point_focal', 'staff']);
        })->orderBy('name')->get();

        return view('campuses.edit', [
            'campus' => $campus,
            'usersForResponsible' => $usersWithRole,
        ]);
    }

    public function update(Request $request, Campus $campus): RedirectResponse
    {
        if (!$request->user()->hasRole('super_admin')) {
            abort(403, 'Seul l\'administrateur peut modifier des campus.');
        }
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:campuses,name,' . $campus->id,
            'code' => 'required|string|max:20|unique:campuses,code,' . $campus->id,
            'city' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'order_responsible_user_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Le nom du campus est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $oldResponsibleId = $campus->order_responsible_user_id;
        $campus->update($validated);

        if (Schema::hasColumn('users', 'campus_id')) {
            if ($oldResponsibleId && $oldResponsibleId !== (int) ($validated['order_responsible_user_id'] ?? 0)) {
                User::where('id', $oldResponsibleId)->update(['campus_id' => null]);
            }
            if (!empty($validated['order_responsible_user_id'])) {
                User::where('id', $validated['order_responsible_user_id'])
                    ->update(['campus_id' => $campus->id]);
            }
        }

        return redirect()
            ->route('campuses.index')
            ->with('success', 'Campus mis à jour.');
    }

    public function destroy(Request $request, Campus $campus): RedirectResponse
    {
        if (!$request->user()->hasRole('super_admin')) {
            abort(403, 'Seul l\'administrateur peut supprimer des campus.');
        }
        if ($campus->materialRequests()->exists() || $campus->budgets()->exists()) {
            return back()->withErrors(['error' => 'Impossible de supprimer un campus qui a des demandes ou budgets.']);
        }
        $campus->delete();
        return redirect()->route('campuses.index')->with('success', 'Campus supprimé.');
    }
}
