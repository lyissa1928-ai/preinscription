<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Paramètres du compte utilisateur connecté (centralisés).
 * Profil, informations personnelles (lecture + modification selon droits), mot de passe.
 */
class AccountSettingsController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        $user->load('campus');

        return view('account.index', [
            'user' => $user,
            'campuses' => \App\Models\Campus::orderBy('name')->get(),
        ]);
    }

    /**
     * Mise à jour des champs que l'utilisateur a le droit de modifier (profil personnel).
     * Tous : first_name, last_name, phone, address, profile_photo.
     * Email / rôle / campus / matricule : super_admin uniquement (via users.edit).
     */
    public function updateProfile(Request $request): RedirectResponse
    {
        $user = $request->user();

        $rules = [
            'first_name' => 'required|string|max:80',
            'last_name' => 'required|string|max:80',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];

        $validated = $request->validate($rules, [
            'first_name.required' => 'Le prénom est obligatoire.',
            'last_name.required' => 'Le nom est obligatoire.',
        ]);

        $data = [
            'name' => trim($validated['first_name'] . ' ' . $validated['last_name']),
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
        ];

        if ($request->hasFile('profile_photo')) {
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }
            $data['profile_photo'] = $request->file('profile_photo')->store('profile_photos', 'public');
        }

        $user->update($data);

        return redirect()
            ->route('account.index')
            ->with('success', 'Vos informations ont été enregistrées.');
    }
}
