<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Page unique "Référentiel des matériels" : catalogue, catégories et gestion des matériels (prix).
 * Tout le monde voit l’onglet Catalogue ; point focal / directeur voient en plus Catégories et Gestion des matériels.
 */
class ReferentielController extends Controller
{
    public function index(Request $request): View|RedirectResponse
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return redirect()->route('dashboard')->with('info', 'L\'accès au référentiel des matériels est réservé au point focal et au directeur.');
        }
        $canManage = true;
        $canSeePrices = $canManage;
        // Directeur : lecture seule (pas de création / modification / suppression)
        $canEditReferentiel = !$user->hasRole('director') || $user->hasRole('super_admin');

        $tab = $request->get('tab', 'catalogue');
        if (!in_array($tab, ['catalogue', 'categories', 'gestion'], true)) {
            $tab = 'catalogue';
        }
        if ($tab !== 'catalogue' && !$canManage) {
            $tab = 'catalogue';
        }

        $categoriesDropdown = Category::where('is_active', true)->orderBy('name')->get();

        $itemsCatalogue = null;
        $categoriesPaginated = null;
        $itemsGestion = null;

        if ($tab === 'catalogue') {
            $query = Item::with('category')->where('is_active', true)->orderBy('name');
            if ($request->filled('category')) {
                $query->where('category_id', $request->get('category'));
            }
            if ($request->filled('search')) {
                $search = $request->get('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            }
            $itemsCatalogue = $query->paginate(20)->withQueryString();
        }

        if ($tab === 'categories' && $canManage) {
            $query = Category::query()->orderBy('type')->orderBy('name');
            if ($request->filled('type')) {
                $query->where('type', $request->get('type'));
            }
            if ($request->filled('actif')) {
                if ($request->get('actif') === '1') {
                    $query->where('is_active', true);
                } elseif ($request->get('actif') === '0') {
                    $query->where('is_active', false);
                }
            }
            $categoriesPaginated = $query->paginate(20)->withQueryString();
        }

        if ($tab === 'gestion' && $canManage) {
            $query = Item::with('category')->orderBy('name');
            if ($request->filled('q')) {
                $q = $request->get('q');
                $query->where(function ($qry) use ($q) {
                    $qry->where('name', 'like', "%{$q}%")
                        ->orWhere('code', 'like', "%{$q}%")
                        ->orWhere('description', 'like', "%{$q}%");
                });
            }
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->get('category_id'));
            }
            if ($request->filled('actif')) {
                if ($request->get('actif') === '1') {
                    $query->where('is_active', true);
                } elseif ($request->get('actif') === '0') {
                    $query->where('is_active', false);
                }
            }
            $itemsGestion = $query->paginate(20)->withQueryString();
        }

        return view('referentiel.index', [
            'tab' => $tab,
            'canManage' => $canManage,
            'canEditReferentiel' => $canEditReferentiel,
            'canSeePrices' => $canSeePrices,
            'categoriesDropdown' => $categoriesDropdown,
            'itemsCatalogue' => $itemsCatalogue,
            'categoriesPaginated' => $categoriesPaginated,
            'itemsGestion' => $itemsGestion,
        ]);
    }
}
