<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use App\Models\RequestItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Référentiel des désignations (matériels) et leurs prix.
 * Gestion des matériels non répertoriés proposés par les demandeurs.
 * Réservé au point focal et au directeur.
 */
class DesignationController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
                abort(403, 'Seuls le point focal et le directeur peuvent gérer le référentiel des désignations.');
            }
            return $next($request);
        });
    }

    /**
     * Liste des matériels non répertoriés proposés par les demandeurs.
     * Le point focal peut les valider et les intégrer au référentiel.
     */
    public function proposedIndex(Request $request): View
    {
        $rows = RequestItem::unlistedMaterial()
            ->select('designation', DB::raw('COUNT(*) as occurrences'), DB::raw('MIN(material_request_id) as sample_request_id'))
            ->groupBy('designation')
            ->orderBy('occurrences', 'desc')
            ->orderBy('designation')
            ->get();

        // Exclure les désignations qui existent déjà dans le catalogue (nom ou description identique)
        $existingNames = Item::pluck('name')->map(fn ($n) => mb_strtolower(trim($n)))->toArray();
        $existingDescriptions = Item::whereNotNull('description')->pluck('description')->map(fn ($d) => mb_strtolower(trim($d)))->toArray();
        $proposed = $rows->filter(function ($row) use ($existingNames, $existingDescriptions) {
            $key = mb_strtolower(trim($row->designation));
            return !in_array($key, $existingNames, true) && !in_array($key, $existingDescriptions, true);
        });

        return view('designations.proposed', [
            'proposed' => $proposed,
        ]);
    }

    /**
     * Liste des désignations (matériels) avec prix unitaire.
     */
    public function index(Request $request): View
    {
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

        $items = $query->paginate(20)->withQueryString();
        $categories = Category::where('is_active', true)->orderBy('name')->get();

        return view('designations.index', [
            'items' => $items,
            'categories' => $categories,
        ]);
    }

    /**
     * Formulaire de création d'une désignation.
     * Peut être pré-rempli depuis une proposition (query ?proposed=...).
     */
    public function create(Request $request): View|RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule à la gestion des articles et des prix.');
        }
        $categories = Category::where('is_active', true)->orderBy('name')->get();
        if ($categories->isEmpty()) {
            return view('designations.no-category');
        }

        $proposedLabel = $request->query('proposed');
        $fromProposed = !empty($proposedLabel);

        return view('designations.create', [
            'categories' => $categories,
            'proposedLabel' => $fromProposed ? trim($proposedLabel) : null,
        ]);
    }

    /**
     * Créer une catégorie consommable (point focal / directeur) pour débloquer l'ajout de désignations.
     */
    public function storeCategory(Request $request): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule à la gestion des articles et des prix.');
        }
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('categories', 'name')],
            'code' => ['required', 'string', 'max:20', Rule::unique('categories', 'code')],
        ], [
            'name.required' => 'Le nom de la catégorie est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
        ]);

        Category::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'type' => 'consommable',
            'is_active' => true,
        ]);

        return redirect()
            ->route('designations.create')
            ->with('success', 'Catégorie créée. Vous pouvez maintenant ajouter une désignation.');
    }

    /**
     * Enregistrement d'une nouvelle désignation (création manuelle ou intégration d'une proposition).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:items,name',
            'code' => 'required|string|max:30|unique:items,code',
            'description' => 'nullable|string|max:500',
            'image_path' => 'nullable|string|max:500',
            'image' => 'nullable|image|mimes:jpeg,png,gif,webp|max:2048',
            'category_id' => 'required|exists:categories,id',
            'unit' => 'required|string|max:20',
            'unit_cost' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Le nom du matériel est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
            'unit_cost.required' => 'Le prix unitaire est obligatoire.',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);
        $validated['reorder_threshold'] = 0;
        $validated['reorder_quantity'] = 0;
        $validated['stock_quantity'] = 0;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('items', 'public');
            $validated['image_path'] = $path;
        }
        if (empty($validated['image_path'] ?? null)) {
            unset($validated['image_path']);
        }

        Item::create($validated);

        $message = $request->has('from_proposed') ? 'Désignation intégrée au référentiel. Elle est désormais disponible dans le catalogue.' : 'Désignation ajoutée au référentiel.';

        if ($request->filled('return_to') && $request->get('return_to') === 'referentiel') {
            return redirect()->route('referentiel.index', ['tab' => 'gestion'])->with('success', $message);
        }

        return redirect()
            ->route('designations.index')
            ->with('success', $message);
    }

    /**
     * Formulaire d'édition d'une désignation.
     */
    public function edit(Request $request, Item $designation): View
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule à la gestion des articles et des prix.');
        }
        $categories = Category::where('is_active', true)->orderBy('name')->get();

        return view('designations.edit', [
            'item' => $designation,
            'categories' => $categories,
        ]);
    }

    /**
     * Mise à jour d'une désignation.
     */
    public function update(Request $request, Item $designation): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule à la gestion des articles et des prix.');
        }
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:items,name,' . $designation->id,
            'code' => 'required|string|max:30|unique:items,code,' . $designation->id,
            'description' => 'nullable|string|max:500',
            'image_path' => 'nullable|string|max:500',
            'image' => 'nullable|image|mimes:jpeg,png,gif,webp|max:2048',
            'category_id' => 'required|exists:categories,id',
            'unit' => 'required|string|max:20',
            'unit_cost' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Le nom du matériel est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
            'unit_cost.required' => 'Le prix unitaire est obligatoire.',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);
        if ($request->hasFile('image')) {
            $oldPath = $designation->image_path;
            if ($oldPath && !str_starts_with($oldPath, 'http')) {
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('items', 'public');
            $validated['image_path'] = $path;
        }
        if (!array_key_exists('image_path', $validated) || $validated['image_path'] === '') {
            $validated['image_path'] = null;
        }

        $designation->update($validated);

        if ($request->filled('return_to') && $request->get('return_to') === 'referentiel') {
            return redirect()->route('referentiel.index', ['tab' => 'gestion'])->with('success', 'Désignation mise à jour.');
        }

        return redirect()
            ->route('designations.index')
            ->with('success', 'Désignation mise à jour.');
    }

    /**
     * Supprimer une désignation (soft delete).
     */
    public function destroy(Request $request, Item $designation): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule à la gestion des articles et des prix.');
        }
        $designation->delete();

        if ($request->filled('return_to') && $request->get('return_to') === 'referentiel') {
            return redirect()->route('referentiel.index', ['tab' => 'gestion'])->with('success', 'Désignation supprimée.');
        }

        return redirect()
            ->route('designations.index')
            ->with('success', 'Désignation supprimée.');
    }

    /**
     * Suppression par lot : supprimer plusieurs articles sélectionnés.
     */
    public function batchDestroy(Request $request): RedirectResponse
    {
        if ($request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Le directeur a un accès en lecture seule à la gestion des articles et des prix.');
        }
        $ids = $request->input('ids', []);
        if (!is_array($ids)) {
            $ids = [];
        }
        $ids = array_filter(array_map('intval', $ids));
        if (empty($ids)) {
            $target = $request->get('return_to') === 'referentiel' ? route('referentiel.index', ['tab' => 'gestion']) : route('designations.index');
            return redirect($target)->with('error', 'Aucun article sélectionné.');
        }
        $count = Item::whereIn('id', $ids)->delete();
        if ($request->get('return_to') === 'referentiel') {
            return redirect()->route('referentiel.index', ['tab' => 'gestion'])->with('success', $count > 1 ? "{$count} articles supprimés." : 'Article supprimé.');
        }
        return redirect()
            ->route('designations.index')
            ->with('success', $count > 1 ? "{$count} articles supprimés." : 'Article supprimé.');
    }
}
