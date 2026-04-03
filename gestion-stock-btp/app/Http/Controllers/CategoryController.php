<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Gestion des catégories (consommables / actifs).
 * Réservé au point focal, directeur et super_admin.
 */
class CategoryController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
                abort(403, 'Accès réservé au point focal et au directeur.');
            }
            return $next($request);
        });
    }

    public function index(Request $request): View
    {
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

        $categories = $query->paginate(20)->withQueryString();

        return view('categories.index', ['categories' => $categories]);
    }

    public function create(Request $request): View
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule aux catégories.');
        }
        return view('categories.create');
    }

    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule aux catégories.');
        }
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('categories', 'name')],
            'code' => ['required', 'string', 'max:20', Rule::unique('categories', 'code')],
            'type' => 'required|in:consommable,asset',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Le nom est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        Category::create($validated);

        if ($request->filled('return_to') && $request->get('return_to') === 'designations.create') {
            return redirect()
                ->route('designations.create')
                ->with('success', 'Catégorie créée. Vous pouvez maintenant ajouter la désignation.');
        }

        if ($request->filled('return_to') && $request->get('return_to') === 'referentiel') {
            return redirect()
                ->route('referentiel.index', ['tab' => 'categories'])
                ->with('success', 'Catégorie créée.');
        }

        return redirect()
            ->route('categories.index')
            ->with('success', 'Catégorie créée.');
    }

    public function edit(Request $request, Category $category): View
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule aux catégories.');
        }
        return view('categories.edit', ['category' => $category]);
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule aux catégories.');
        }
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('categories', 'name')->ignore($category->id)],
            'code' => ['required', 'string', 'max:20', Rule::unique('categories', 'code')->ignore($category->id)],
            'type' => 'required|in:consommable,asset',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $category->update($validated);

        return redirect()
            ->route('categories.index')
            ->with('success', 'Catégorie mise à jour.');
    }

    public function destroy(Request $request, Category $category): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule aux catégories.');
        }
        if ($category->items()->exists()) {
            return redirect()
                ->route('categories.index')
                ->with('error', 'Impossible de supprimer cette catégorie : des désignations y sont rattachées. Réaffectez-les ou supprimez-les d\'abord.');
        }

        if ($category->assets()->exists()) {
            return redirect()
                ->route('categories.index')
                ->with('error', 'Impossible de supprimer : des actifs utilisent cette catégorie.');
        }

        $category->delete();

        return redirect()
            ->route('categories.index')
            ->with('success', 'Catégorie supprimée.');
    }
}
