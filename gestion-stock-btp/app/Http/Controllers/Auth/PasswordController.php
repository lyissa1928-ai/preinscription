<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Changement obligatoire à la première connexion et changement volontaire par l'utilisateur connecté.
 */
class PasswordController
{
    /**
     * Formulaire de changement obligatoire (première connexion).
     */
    public function forceChangeForm(): View
    {
        if (!Auth::check() || !Auth::user()->must_change_password) {
            return redirect()->route('dashboard');
        }
        return view('auth.force-change-password');
    }

    /**
     * Enregistrement du nouveau mot de passe (première connexion).
     */
    public function forceChangeStore(Request $request): RedirectResponse
    {
        if (!Auth::check() || !Auth::user()->must_change_password) {
            return redirect()->route('dashboard');
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ], [
            'password.required' => 'Le nouveau mot de passe est obligatoire.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        $user = Auth::user();
        $user->update([
            'password' => $validated['password'],
            'must_change_password' => false,
        ]);

        return redirect()
            ->route('dashboard')
            ->with('success', 'Votre mot de passe a été défini. Vous pouvez utiliser la plateforme.');
    }

    /**
     * Formulaire de changement de mot de passe par l'utilisateur connecté.
     */
    public function edit(): View
    {
        return view('auth.change-password');
    }

    /**
     * Mise à jour du mot de passe par l'utilisateur connecté.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ], [
            'current_password.required' => 'L\'ancien mot de passe est obligatoire.',
            'current_password.current_password' => 'L\'ancien mot de passe est incorrect.',
            'password.required' => 'Le nouveau mot de passe est obligatoire.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        $request->user()->update(['password' => $validated['password']]);

        return redirect()
            ->route('account.index')
            ->with('success', 'Votre mot de passe a été modifié.');
    }
}
