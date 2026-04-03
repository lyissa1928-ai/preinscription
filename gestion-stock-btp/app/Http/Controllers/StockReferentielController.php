<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Page d’accueil unique « Stock et référentiel » : regroupe Référentiel des matériels,
 * Stock / Inventaire et Mon stock personnel sous un même nom.
 */
class StockReferentielController extends Controller
{
    public function index(Request $request): View|RedirectResponse
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return redirect()->route('dashboard')->with('info', 'L\'accès Stock et référentiel est réservé au point focal et au directeur.');
        }

        return view('stock-referentiel.index', [
            'canManage' => true,
        ]);
    }
}
