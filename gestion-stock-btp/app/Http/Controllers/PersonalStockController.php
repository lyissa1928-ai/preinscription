<?php

namespace App\Http\Controllers;

use App\Models\Campus;
use App\Models\Category;
use App\Models\Item;
use App\Models\MaterialRequest;
use App\Models\RequestItem;
use App\Models\User;
use App\Models\UserStockMovement;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Stock LOCAL du staff (pas le stock central du point focal).
 * Flux : point focal livre → matériel ajouté au stock du staff → chaque sortie (destinataire réel obligatoire) décrémente le stock et est historisée.
 */
class PersonalStockController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if ($request->user() && $request->user()->hasRole('director') && !$request->user()->hasRole('super_admin')) {
                abort(403, 'La fonctionnalité Mon stock n\'est pas disponible pour le directeur.');
            }
            return $next($request);
        });
    }

    /**
     * Formulaire d'enregistrement d'une réception (point focal / super_admin).
     * La réception ne concerne pas les demandeurs : on enregistre uniquement la quantité reçue
     * pour mettre à jour le stock de l'article, ce qui permet le contrôle des demandes (rupture de stock).
     */
    public function recordReceiptForm(Request $request): View
    {
        $this->authorizeReceipt($request->user());
        $categories = Category::orderBy('name')->get(['id', 'name']);
        return view('personal-stock.record-receipt', [
            'categories' => $categories,
        ]);
    }

    /**
     * Enregistrer une réception : met à jour le stock et alimente le référentiel si besoin.
     * Logique « pas de matériel, pas d'info dans le référentiel » : si l'article n'existe pas
     * dans la catégorie choisie, il est créé dans le référentiel des matériels puis le stock est enregistré.
     * La réception ne bloque jamais : elle crée l'article à la volée si nécessaire.
     */
    public function storeReceipt(Request $request): RedirectResponse
    {
        $this->authorizeReceipt($request->user());
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'article_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1|max:99999',
            'unit_price' => 'nullable|numeric|min:0|max:999999999',
            'notes' => 'nullable|string|max:1000',
        ]);
        $articleName = trim($request->article_name);
        $categoryId = (int) $request->category_id;
        $quantity = (int) $request->quantity;
        $unitPrice = $request->filled('unit_price') && is_numeric($request->unit_price) && (float) $request->unit_price >= 0
            ? (float) $request->unit_price
            : 0.0;

        $search = '%' . $articleName . '%';
        $item = Item::active()
            ->where('category_id', $categoryId)
            ->where(function ($q) use ($articleName, $search) {
                $q->where('name', $articleName)
                    ->orWhere('description', $articleName)
                    ->orWhereRaw('LOWER(name) LIKE LOWER(?)', [$search])
                    ->orWhereRaw('LOWER(description) LIKE LOWER(?)', [$search]);
            })
            ->orderByRaw("CASE WHEN LOWER(name) = LOWER(?) OR LOWER(description) = LOWER(?) THEN 0 ELSE 1 END", [$articleName, $articleName])
            ->first();

        if (!$item) {
            $category = Category::findOrFail($categoryId);
            $name = $articleName;
            $baseName = $name;
            $suffix = 0;
            while (Item::where('name', $name)->exists()) {
                $suffix++;
                $name = $baseName . ' (' . $category->name . ')' . ($suffix > 1 ? ' ' . $suffix : '');
                if (strlen($name) > 150) {
                    $name = substr($baseName, 0, 120) . ' ' . $category->code . '-' . $suffix;
                }
            }
            $code = 'R' . date('YmdHis') . rand(10, 99);
            while (Item::where('code', $code)->exists()) {
                $code = 'R' . date('YmdHis') . rand(10, 99);
            }
            $item = Item::create([
                'category_id' => $categoryId,
                'name' => $name,
                'code' => $code,
                'description' => $articleName,
                'unit' => 'unité',
                'unit_cost' => $unitPrice,
                'reorder_threshold' => 0,
                'reorder_quantity' => 0,
                'stock_quantity' => $quantity,
                'is_active' => true,
            ]);
            $msg = 'Réception enregistrée : l’article « ' . $item->name . ' » a été ajouté au référentiel des matériels (catégorie ' . $category->name . ') et le stock a été mis à jour (+' . $quantity . ').';
        } else {
            Item::where('id', $item->id)->increment('stock_quantity', $quantity);
            if ($unitPrice > 0) {
                $item->update(['unit_cost' => $unitPrice]);
            }
            $msg = 'Réception enregistrée : stock mis à jour (+' . $quantity . ') pour « ' . ($item->description ?: $item->name) . ' ».';
            if ($unitPrice > 0) {
                $msg .= ' Prix unitaire mis à jour dans le référentiel.';
            } else {
                $msg .= '.';
            }
        }

        return redirect()->route('personal-stock.record-receipt-form')->with('success', $msg);
    }

    private function authorizeReceipt($user): void
    {
        if (!$user->hasAnyRole(['point_focal', 'super_admin'])) {
            abort(403, 'Réservé au point focal et à l\'administrateur.');
        }
    }
    /**
     * Niveau de stock de chaque staff (point focal / directeur) : vue consolidée sans aller sur le tableau de bord de chaque staff.
     */
    public function stockByStaff(Request $request): View
    {
        if (!$request->user()->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            abort(403, 'Réservé au point focal et au directeur.');
        }
        $campusId = $request->get('campus_id');
        $staffQuery = User::with('campus:id,name')
            ->whereNotNull('campus_id')
            ->where('is_active', true)
            ->orderBy('name');
        if ($campusId) {
            $staffQuery->where('campus_id', $campusId);
        }
        $staffUsers = $staffQuery->get(['id', 'name', 'email', 'campus_id']);
        $staffStock = [];
        foreach ($staffUsers as $u) {
            $summary = UserStockMovement::remainingByUserItem($u->id);
            $staffStock[] = [
                'user' => $u,
                'summary' => $summary,
                'total_remaining' => $summary->sum('quantity_remaining'),
            ];
        }
        $campuses = Campus::orderBy('name')->get(['id', 'name']);
        return view('personal-stock.stock-by-staff', [
            'staffStock' => $staffStock,
            'campuses' => $campuses,
            'selectedCampusId' => $campusId,
        ]);
    }

    /**
     * Tableau de suivi du stock personnel (reçus, distribués, restant).
     * Le staff voit le stock déjà enregistré (quantité reçue) et après chaque sortie la quantité initiale décrémentée (solde).
     */
    public function index(Request $request): View
    {
        $user = $request->user();
        $path = $request->url();
        $query = $request->query();
        $movementsPaginated = new LengthAwarePaginator([], 0, 20, 1, ['path' => $path, 'query' => $query]);

        $summary = UserStockMovement::remainingByUserItem($user->id);
        $allMovements = UserStockMovement::where('user_id', $user->id)
            ->with(['item', 'distributedTo', 'category'])
            ->orderBy('created_at')
            ->get();

        // Solde après chaque mouvement : quantité initiale (reçue) décrémentée à chaque sortie
        $balancesByKey = [];
        foreach ($allMovements as $m) {
            $key = ($m->item_id ?? 'n') . '|' . ($m->designation ?? '');
            if ($m->type === UserStockMovement::TYPE_RECEIVED) {
                $balancesByKey[$key] = ($balancesByKey[$key] ?? 0) + $m->quantity;
            } else {
                $balancesByKey[$key] = ($balancesByKey[$key] ?? 0) - $m->quantity;
            }
            $m->balance_after = $balancesByKey[$key];
        }

        $page = (int) $request->get('page', 1);
        $perPage = 20;
        $movementsPaginated = new LengthAwarePaginator(
            $allMovements->reverse()->values()->forPage($page, $perPage),
            $allMovements->count(),
            $perPage,
            $page,
            ['path' => $path, 'query' => $query]
        );

        $categories = Category::orderBy('name')->get(['id', 'name']);
        $catalogueItems = Item::with('category:id,name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'category_id']);
        $usersSameCampus = $user->campus_id
            ? User::where('campus_id', $user->campus_id)->where('id', '!=', $user->id)->orderBy('name')->get(['id', 'name'])
            : collect();

        // Réceptions déjà enregistrées : uniquement les demandes dont le staff a enregistré la réception (status = received).
        // Les demandes "delivered" sans enregistrement ont quantités à 0 : on ne les affiche pas ici pour éviter des zéros incohérents.
        $recordedReceptions = RequestItem::whereHas('materialRequest', function ($q) use ($user) {
            $q->where('requester_user_id', $user->id)
                ->where('status', 'received');
        })
            ->with([
                'materialRequest:id,request_number,status,requester_user_id',
                'materialRequest.requester:id,name',
                'item:id,description,name,category_id',
                'item.category:id,name',
            ])
            ->orderByDesc('updated_at')
            ->get();

        // Demandes livrées en attente d'enregistrement de réception (pour lien rapide vers le formulaire)
        $pendingReceptionRequests = MaterialRequest::where('requester_user_id', $user->id)
            ->where('status', 'delivered')
            ->orderByDesc('updated_at')
            ->get(['id', 'request_number', 'status', 'updated_at']);

        // Map (item_id|designation) => quantity_remaining pour afficher le stock restant par article
        $remainingByKey = collect($summary)->keyBy(function ($row) {
            return ($row->item_id ?? 'n') . '|' . ($row->designation ?? '');
        });

        return view('personal-stock.index', [
            'summary' => $summary,
            'movements' => $movementsPaginated ?? new LengthAwarePaginator([], 0, 20, 1, ['path' => $path, 'query' => $query]),
            'recordedReceptions' => $recordedReceptions,
            'pendingReceptionRequests' => $pendingReceptionRequests,
            'remainingByKey' => $remainingByKey,
            'categories' => $categories,
            'catalogueItems' => $catalogueItems,
            'usersSameCampus' => $usersSameCampus,
        ]);
    }

    /**
     * Enregistrer une sortie : deux cas exclusifs.
     * CAS 1 — Article existant du stock : ligne choisie (item_id + designation cohérents), on saisit quantité, destinataire, date, etc.
     * CAS 2 — Désignation libre : catégorie + désignation requis, pas de choix d'article catalogue.
     */
    public function storeDistribution(Request $request): RedirectResponse
    {
        $request->validate([
            'source_type' => 'required|in:existing,free',
            'quantity' => 'required|integer|min:1|max:99999',
            'recipient' => 'required|string|max:500',
            'distributed_at' => 'required|date|before_or_equal:today',
            'distributed_to_user_id' => ['nullable', function ($attribute, $value, $fail) {
                if ($value !== null && $value !== '' && $value !== false) {
                    if (!User::where('id', (int) $value)->exists()) {
                        $fail('L\'utilisateur sélectionné n\'existe pas.');
                    }
                }
            }],
            'notes' => 'nullable|string|max:1000',
        ], [
            'recipient.required' => 'Le destinataire réel est obligatoire (ex. : étudiant, classe, salle).',
            'distributed_at.required' => 'La date de sortie est obligatoire.',
        ]);

        $user = $request->user();
        $sourceType = $request->input('source_type');
        $quantity = (int) $request->quantity;
        $recipient = trim((string) $request->input('recipient', ''));
        $distributedAt = $request->date('distributed_at');

        if ($quantity < 1) {
            return back()->withErrors(['quantity' => 'La quantité doit être au moins 1.'])->withInput();
        }
        if ($recipient === '') {
            return back()->withErrors(['recipient' => 'Le destinataire réel est obligatoire.'])->withInput();
        }

        $itemId = null;
        $categoryId = null;
        $designation = null;

        if ($sourceType === 'existing') {
            // CAS 1 : article existant — summary_key obligatoire (format item_id|designation)
            $summaryKey = $request->input('summary_key');
            if ($summaryKey === null || $summaryKey === '') {
                return back()->withErrors(['error' => 'Choisissez un article existant du stock (Bloc 1).'])->withInput();
            }
            $summary = UserStockMovement::remainingByUserItem($user->id);
            $keyStr = (string) $summaryKey;
            $current = $summary->first(function ($row) use ($keyStr) {
                $k = ($row->item_id ?? 'n') . '|' . ($row->designation ?? '');
                return $k === $keyStr;
            });
            if (!$current || (int) $current->quantity_remaining < 1) {
                return back()->withErrors(['error' => 'Ligne de stock invalide ou plus de stock disponible.'])->withInput();
            }
            if ($quantity > (int) $current->quantity_remaining) {
                return back()->withErrors(['quantity' => 'Quantité insuffisante. Stock restant : ' . $current->quantity_remaining . '.'])->withInput();
            }
            $itemId = $current->item_id;
            $categoryId = $current->category_id ?? (Item::find($current->item_id)?->category_id);
            $designation = $current->designation ?? (Item::find($current->item_id)?->description ?? Item::find($current->item_id)?->name ?? '—');
        } else {
            // CAS 2 : désignation libre — category_id et designation obligatoires
            $request->validate([
                'category_id' => 'required|exists:categories,id',
                'designation' => 'required|string|max:500',
            ], [
                'category_id.required' => 'La catégorie est obligatoire pour la désignation libre.',
                'designation.required' => 'La désignation libre est obligatoire.',
            ]);
            $categoryId = (int) $request->category_id;
            $designation = trim((string) $request->designation);
            if ($designation === '') {
                return back()->withErrors(['designation' => 'La désignation libre est obligatoire.'])->withInput();
            }
            $summary = UserStockMovement::remainingByUserItem($user->id);
            $current = $summary->first(function ($row) use ($designation) {
                return $row->item_id === null && (string) ($row->designation ?? '') === $designation;
            });
            if (!$current) {
                $current = $summary->first(function ($row) use ($designation) {
                    return (string) ($row->designation ?? '') === $designation;
                });
            }
            $remaining = $current ? (int) $current->quantity_remaining : 0;
            if ($remaining < $quantity) {
                return back()->withErrors(['quantity' => 'Quantité insuffisante. Stock restant pour cette désignation : ' . $remaining . '.'])->withInput();
            }
        }

        $movement = UserStockMovement::create([
            'user_id' => $user->id,
            'item_id' => $itemId,
            'category_id' => $categoryId,
            'designation' => $designation ?: null,
            'quantity' => $quantity,
            'type' => UserStockMovement::TYPE_DISTRIBUTED,
            'distributed_to_user_id' => $request->filled('distributed_to_user_id') ? (int) $request->distributed_to_user_id : null,
            'recipient' => $recipient,
            'distributed_at' => $distributedAt,
            'notes' => $request->filled('notes') ? $request->input('notes') : null,
        ]);

        \App\Models\DeliverySlip::createFromMovement($movement, $user->id);

        return redirect()->route('personal-stock.index')->with('success', 'Sortie enregistrée. Le stock a été décrémenté.');
    }
}
