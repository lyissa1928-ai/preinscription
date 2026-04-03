<?php

namespace App\Http\Controllers;

use App\Models\MaterialRequest;
use App\Models\AggregatedOrder;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Recherche globale (topbar).
 * Ajout uniquement : n'altère aucun contrôleur, route ou vue existants.
 */
class SearchController extends Controller
{
    /**
     * Affiche les résultats de recherche (demandes, commandes, utilisateurs).
     * Si q est vide ou trop court, redirection vers le dashboard.
     */
    public function index(Request $request): View|RedirectResponse
    {
        $q = trim((string) $request->input('q', ''));
        $minLength = 2;

        if ($q === '' || strlen($q) < $minLength) {
            return redirect()->route('dashboard');
        }

        $user = $request->user();
        $term = '%' . $q . '%';

        $demandes = $this->searchDemandes($user, $term);
        $commandes = $this->searchCommandes($user, $term);
        $utilisateurs = $this->searchUtilisateurs($user, $term);

        return view('search.index', [
            'q' => $q,
            'demandes' => $demandes,
            'commandes' => $commandes,
            'utilisateurs' => $utilisateurs,
        ]);
    }

    private function searchDemandes($user, string $term)
    {
        $query = MaterialRequest::query()
            ->with(['campus'])
            ->where(function ($q) use ($term) {
                $q->where('request_number', 'like', $term)
                    ->orWhere('subject', 'like', $term)
                    ->orWhere('notes', 'like', $term);
            })
            ->orderByDesc('updated_at')
            ->limit(15);

        // Aligné sur MaterialRequestPolicy::view : staff ne voit que les demandes où il est demandeur ou participant
        if ($user->isSiteScoped() && !$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $query->where(function ($q) use ($user) {
                $q->where('requester_user_id', $user->id)
                    ->orWhereHas('participants', fn ($p) => $p->where('user_id', $user->id));
            });
        }

        return $query->get();
    }

    private function searchCommandes($user, string $term)
    {
        if (!$user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            return collect();
        }

        return AggregatedOrder::query()
            ->with(['supplier'])
            ->where(function ($q) use ($term) {
                $q->where('po_number', 'like', $term)
                    ->orWhere('notes', 'like', $term);
            })
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get();
    }

    private function searchUtilisateurs($user, string $term)
    {
        if (!$user->hasRole('super_admin')) {
            return collect();
        }

        return User::query()
            ->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term);
            })
            ->orderBy('name')
            ->limit(10)
            ->get();
    }
}
