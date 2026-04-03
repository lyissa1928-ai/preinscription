<?php

namespace App\Http\Controllers;

use App\Models\MaterialRequest;
use App\Models\AggregatedOrder;
use App\Models\Budget;
use App\Models\Item;
use App\Models\ActivityLog;
use App\Services\RequestApprovalService;
use App\Services\RequestStatisticsService;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * DashboardController
 *
 * Tableau de bord : KPIs, alertes, demandes en attente de validation (point focal),
 * activité récente, tâches.
 */
class DashboardController extends Controller
{
    public function __construct(
        private RequestApprovalService $requestApprovalService,
        private RequestStatisticsService $requestStatistics
    ) {}

    public function __invoke(Request $request): View
    {
        $user = $request->user();
        $campus = $user->isSiteScoped() ? $user->campus : null;
        $isStaffOnly = $user->isSiteScoped() && !$user->hasAnyRole(['point_focal', 'director', 'super_admin']);

        $requestStats = null;
        if ($isStaffOnly) {
            $myRequestsQuery = MaterialRequest::where('requester_user_id', $user->id)
                ->orWhereHas('participants', fn ($q) => $q->where('user_id', $user->id));
            $stats = [
                'total_requests' => (clone $myRequestsQuery)->count(),
                'pending_approvals' => (clone $myRequestsQuery)->where('status', 'submitted')->count(),
                'active_orders' => 0,
                'confirmed_orders' => 0,
                'budget_utilization' => 0,
                'low_stock_items' => 0,
            ];
        } else {
            $requestStats = $this->requestApprovalService->getRequestStats($campus);
            $stats = [
                'total_requests' => $requestStats['total'],
                'pending_approvals' => $requestStats['submitted'],
                'active_orders' => AggregatedOrder::count(),
                'confirmed_orders' => AggregatedOrder::where('status', 'confirmed')->count(),
                'budget_utilization' => $this->getBudgetUtilization($campus),
                'low_stock_items' => Item::lowStock()->active()->count(),
            ];
        }

        $alerts = $this->buildAlerts($user, $requestStats['submitted'] ?? 0);
        $recentActivity = $this->getRecentActivity($user);
        $myTasks = $this->getMyTasks($user);

        // Mes demandes récentes : demandeur ou participant (demande groupée)
        $myRecentRequests = collect();
        if ($user->isSiteScoped() || $user->hasAnyRole(['director', 'point_focal', 'super_admin'])) {
            $myRecentRequests = MaterialRequest::where('requester_user_id', $user->id)
                ->orWhereHas('participants', fn ($q) => $q->where('user_id', $user->id))
                ->with(['campus'])
                ->orderByDesc('updated_at')
                ->limit(8)
                ->get();
        }

        // Demandes en attente de validation (point focal / director / super admin)
        $pendingValidationRequests = collect();
        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $pendingValidationRequests = $this->requestApprovalService->getPendingApprovalsFor($user);
        }

        // Commandes à traiter (point focal) : brouillon + à réceptionner
        $ordersToProcess = [
            'draft' => 0,
            'confirmed' => 0,
        ];
        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $ordersToProcess['draft'] = AggregatedOrder::where('status', 'draft')->count();
            $ordersToProcess['confirmed'] = AggregatedOrder::where('status', 'confirmed')->count();
        }

        // Indicateurs analytiques (director / point focal / super admin)
        $analytics = null;
        $requestStatsByCampus = [];
        $requestStatsByStatus = [];
        if ($user->hasAnyRole(['director', 'point_focal', 'super_admin'])) {
            $analytics = [
                'topCampuses' => $this->requestStatistics->topRequestingCampuses(5),
                'countMonth'  => $this->requestStatistics->countCurrentMonth(),
                'countYear'   => $this->requestStatistics->countCurrentYear(),
            ];
            $requestStatsByCampus = MaterialRequest::query()
                ->selectRaw('campus_id, count(*) as total')
                ->groupBy('campus_id')
                ->get()
                ->mapWithKeys(fn ($r) => [\App\Models\Campus::find($r->campus_id)?->name ?? 'Campus #' . $r->campus_id => (int) $r->total]);
            $requestStatsByStatus = MaterialRequest::query()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status');
        }

        return view('dashboard', [
            'stats' => $stats,
            'alerts' => $alerts,
            'recentActivity' => $recentActivity,
            'myTasks' => $myTasks,
            'myRecentRequests' => $myRecentRequests,
            'pendingValidationRequests' => $pendingValidationRequests,
            'ordersToProcess' => $ordersToProcess,
            'analytics' => $analytics,
            'requestStatsByCampus' => $requestStatsByCampus,
            'requestStatsByStatus' => $requestStatsByStatus,
        ]);
    }

    private function getBudgetUtilization($campus): float
    {
        $query = Budget::where('status', 'active');
        if ($campus) {
            $query->where('campus_id', $campus->id);
        }
        $budgets = $query->get();
        if ($budgets->isEmpty()) {
            return 0;
        }
        $total = $budgets->sum('total_budget');
        $spent = $budgets->sum('spent_amount');
        return $total > 0 ? round(($spent / $total) * 100, 1) : 0;
    }

    private function buildAlerts($user, int $pendingCount): array
    {
        $alerts = [];

        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin']) && $pendingCount > 0) {
            $pending = MaterialRequest::where('status', 'submitted')
                ->with('campus')
                ->orderBy('submitted_at')
                ->limit(5)
                ->get();
            foreach ($pending as $req) {
                $alerts[] = [
                    'type' => 'approval_pending',
                    'request_number' => $req->request_number,
                    'campus' => $req->campus->name ?? '',
                ];
            }
        }

        $lowStock = Item::lowStock()->active()->limit(3)->get();
        foreach ($lowStock as $item) {
            $alerts[] = [
                'type' => 'low_stock',
                'item' => $item->description ?? $item->name,
                'quantity' => $item->stock_quantity,
            ];
        }

        $budgetsHigh = Budget::where('status', 'active')
            ->whereRaw('total_budget > 0 AND (spent_amount / total_budget * 100) > 80')
            ->with('campus')
            ->limit(3)
            ->get();
        foreach ($budgetsHigh as $b) {
            $util = $b->total_budget > 0 ? round(($b->spent_amount / $b->total_budget) * 100, 1) : 0;
            $alerts[] = [
                'type' => 'budget_high',
                'campus' => $b->campus->name ?? '',
                'utilization' => $util,
            ];
        }

        return $alerts;
    }

    private function getRecentActivity($user, int $limit = 10): array
    {
        $query = ActivityLog::with('user')
            ->withoutDeletedUsers()
            ->whereIn('loggable_type', [MaterialRequest::class, AggregatedOrder::class, Budget::class])
            ->orderByDesc('created_at')
            ->limit($limit * 2);

        $logs = $query->get();

        // Le staff ne doit pas voir les activités réalisées par les autres : uniquement ses propres actions.
        if ($user->isSiteScoped() && !$user->hasAnyRole(['director', 'point_focal', 'super_admin'])) {
            $logs = $logs->filter(function ($log) use ($user) {
                return (int) $log->user_id === (int) $user->id;
            })->take($limit)->values();
        } else {
            $logs = $logs->take($limit);
        }

        $out = [];
        foreach ($logs as $log) {
            $out[] = [
                'loggable_type' => $log->loggable_type,
                'loggable_id' => $log->loggable_id ?? null,
                'action' => $log->action,
                'description' => $log->description,
                'user_name' => $log->user->name ?? null,
                'created_at' => $log->created_at ? $log->created_at->format('d/m/Y H:i') : '—',
            ];
        }
        return $out;
    }

    private function getMyTasks($user): array
    {
        $tasks = [];

        if ($user->hasAnyRole(['point_focal', 'director', 'super_admin'])) {
            $count = MaterialRequest::where('status', 'submitted')->count();
            if ($count > 0) {
                $tasks[] = [
                    'title' => 'Demandes en attente de validation',
                    'due_date' => '',
                    'count' => $count,
                    'url' => route('material-requests.index', ['status' => 'submitted']),
                ];
            }
        }

        if ($user->hasAnyRole(['point_focal', 'director'])) {
            $draftOrders = AggregatedOrder::where('status', 'draft')->count();
            if ($draftOrders > 0) {
                $tasks[] = [
                    'title' => 'Commandes en brouillon à confirmer',
                    'due_date' => '',
                    'count' => $draftOrders,
                    'url' => route('aggregated-orders.index', ['tab' => 'draft']),
                ];
            }
            $confirmedOrders = AggregatedOrder::where('status', 'confirmed')->count();
            if ($confirmedOrders > 0) {
                $tasks[] = [
                    'title' => 'Commandes à réceptionner',
                    'due_date' => '',
                    'count' => $confirmedOrders,
                    'url' => route('aggregated-orders.index', ['tab' => 'confirmed']),
                ];
            }
        }

        return $tasks;
    }
}
