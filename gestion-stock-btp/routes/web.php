<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    DashboardController,
    DeliverySlipController,
    InboxController,
    SearchController,
    MaterialRequestController,
    RequestItemController,
    DesignationController,
    CategoryController,
    ReferentielController,
    StockReferentielController,
    AggregatedOrderController,
    BudgetController,
    BudgetAllocationController,
    StockController,
    AssetController,
    MaintenanceTicketController,
    CampusController,
    NotificationController,
    UserController,
    AnalyticsController,
    LogistiqueDashboardController,
    GuideController,
    SettingsController,
    PersonalStockController,
    CampusMonthlyReportController
};
use App\Models\Item;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| ESEBAT Logistics & Budget Management ERP
| Multi-campus school asset & procurement system
|
*/

// Load authentication routes
require __DIR__.'/auth.php';

Route::middleware(['web', 'auth', 'password.changed'])->group(function () {

    // Changement de mot de passe (formulaire intégré dans Paramètres compte ; routes conservées pour le POST)
    Route::get('compte/mot-de-passe', fn () => redirect()->route('account.index')->withFragment('mot-de-passe'))->name('password.edit');
    Route::put('compte/mot-de-passe', [\App\Http\Controllers\Auth\PasswordController::class, 'update'])->name('password.update');

    // Paramètres du compte (tous les profils) : profil, infos personnelles, mot de passe
    Route::get('compte/parametres', [\App\Http\Controllers\AccountSettingsController::class, 'index'])->name('account.index');
    Route::put('compte/parametres', [\App\Http\Controllers\AccountSettingsController::class, 'updateProfile'])->name('account.update');

    // Dashboard
    Route::get('/', DashboardController::class)->name('dashboard');

    // Recherche globale (topbar)
    Route::get('recherche', [SearchController::class, 'index'])->name('search.index');

    // Guide utilisateur (tous les profils)
    Route::get('guide-utilisateur', GuideController::class)->name('guide.index');
    Route::get('guide-utilisateur/export-pdf', [GuideController::class, 'exportPdf'])->name('guide.export-pdf');

    // Paramètres de l'application (Super Admin uniquement)
    Route::get('parametres-application', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('parametres-application', [SettingsController::class, 'update'])->name('settings.update');

    // ==================== Messagerie interne (règles par rôle) ====================
    Route::get('messagerie', [InboxController::class, 'index'])->name('inbox.index');
    Route::get('messagerie/nouvelle', [InboxController::class, 'create'])->name('inbox.create');
    Route::post('messagerie', [InboxController::class, 'store'])->name('inbox.store');
    Route::get('messagerie/pieces-jointes/{attachment}', [InboxController::class, 'downloadAttachment'])->name('inbox.attachment.download');
    Route::get('messagerie/{conversation}', [InboxController::class, 'show'])->name('inbox.show');
    Route::post('messagerie/{conversation}/messages', [InboxController::class, 'storeMessage'])->name('inbox.storeMessage');
    Route::delete('messagerie/{conversation}/messages/{inbox_message}/pour-moi', [InboxController::class, 'deleteMessageForMe'])->name('inbox.message.deleteForMe');
    Route::delete('messagerie/{conversation}/messages/{inbox_message}/pour-tous', [InboxController::class, 'deleteMessageForEveryone'])->name('inbox.message.deleteForEveryone');
    Route::delete('messagerie/{conversation}/supprimer', [InboxController::class, 'destroyForMe'])->name('inbox.destroyForMe');

    // ==================== Campus (Admin only) ====================
    Route::resource('campuses', CampusController::class);

    // ==================== Utilisateurs (Admin only) ====================
    Route::resource('users', UserController::class);
    Route::post('users/batch-destroy', [UserController::class, 'batchDestroy'])->name('users.batch-destroy');
    Route::post('users/batch-assign-campus', [UserController::class, 'batchAssignCampus'])->name('users.batch-assign-campus');
    Route::post('users/batch-suspend', [UserController::class, 'batchSuspend'])->name('users.batch-suspend');
    Route::post('users/batch-activate', [UserController::class, 'batchActivate'])->name('users.batch-activate');

    // ==================== Statistiques & analyse (Director, Point focal) ====================
    Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics.index');

    // ==================== Tableau de suivi logistique — Dashboard DG (Director, Point focal) ====================
    Route::get('tableau-suivi-logistique', [LogistiqueDashboardController::class, 'index'])->name('tableau-suivi-logistique.index');
    Route::get('tableau-suivi-logistique/export', [LogistiqueDashboardController::class, 'export'])->name('tableau-suivi-logistique.export');

    // Rapport mensuel par campus (point focal / directeur)
    Route::get('rapports/rapport-mensuel-campus', [CampusMonthlyReportController::class, 'index'])->name('reports.campus-monthly.index');
    Route::get('rapports/rapport-mensuel-campus/export', [CampusMonthlyReportController::class, 'export'])->name('reports.campus-monthly.export');

    // ==================== Stock et référentiel (accueil unique : référentiel, stock, mon stock) ====================
    Route::get('stock-et-referentiel', [StockReferentielController::class, 'index'])->name('stock-referentiel.index');

    // ==================== Référentiel des matériels (une page : catalogue, catégories, gestion) ====================
    Route::get('referentiel-materiel', [ReferentielController::class, 'index'])->name('referentiel.index');

    // ==================== Référentiel des désignations (point focal / directeur) ====================
    Route::bind('designation', fn ($value) => Item::findOrFail($value));
    Route::get('designations/proposed', [DesignationController::class, 'proposedIndex'])->name('designations.proposed');
    Route::post('designations/batch-destroy', [DesignationController::class, 'batchDestroy'])->name('designations.batch-destroy');
    Route::post('designations/create-category', [DesignationController::class, 'storeCategory'])->name('designations.store-category');
    Route::resource('designations', DesignationController::class)->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);
    Route::resource('categories', CategoryController::class);

    // ==================== Material Requests ====================
    Route::resource('material-requests', MaterialRequestController::class);
    
    // Material Request Actions
    Route::post('material-requests/{materialRequest}/submit', [MaterialRequestController::class, 'submit'])
        ->name('material-requests.submit');
    Route::post('material-requests/{materialRequest}/approve', [MaterialRequestController::class, 'approve'])
        ->name('material-requests.approve');
    Route::post('material-requests/{materialRequest}/reject', [MaterialRequestController::class, 'reject'])
        ->name('material-requests.reject');
    Route::post('material-requests/{materialRequest}/transmit', [MaterialRequestController::class, 'transmitToDirector'])
        ->name('material-requests.transmit');
    Route::post('material-requests/{materialRequest}/director-approve', [MaterialRequestController::class, 'directorApprove'])
        ->name('material-requests.director-approve');
    Route::post('material-requests/{materialRequest}/director-reject', [MaterialRequestController::class, 'directorReject'])
        ->name('material-requests.director-reject');
    Route::post('material-requests/{materialRequest}/in-treatment', [MaterialRequestController::class, 'setInTreatment'])
        ->name('material-requests.set-in-treatment');
    Route::put('material-requests/{materialRequest}/treatment-notes', [MaterialRequestController::class, 'updateTreatmentNotes'])
        ->name('material-requests.update-treatment-notes');
    Route::post('material-requests/{materialRequest}/delivered', [MaterialRequestController::class, 'setDelivered'])
        ->name('material-requests.set-delivered');
    Route::get('material-requests/{materialRequest}/store-storage', [MaterialRequestController::class, 'storeStorageForm'])
        ->name('material-requests.store-storage-form');
    Route::post('material-requests/{materialRequest}/store-storage', [MaterialRequestController::class, 'storeStorage'])
        ->name('material-requests.store-storage');
    Route::post('material-requests/{materialRequest}/participants', [MaterialRequestController::class, 'addParticipant'])
        ->name('material-requests.participants.add');
    Route::delete('material-requests/{materialRequest}/participants/{user}', [MaterialRequestController::class, 'removeParticipant'])
        ->name('material-requests.participants.remove');

    // ==================== Request Items (Nested) ====================
    Route::resource('material-requests.request-items', RequestItemController::class)
        ->shallow()
        ->parameter('material_requests', 'materialRequest')
        ->parameter('request_items', 'requestItem');

    // Request Item Actions
    Route::get('request-items/{requestItem}/edit', [RequestItemController::class, 'edit'])
        ->name('request-items.edit');
    Route::put('request-items/{requestItem}', [RequestItemController::class, 'update'])
        ->name('request-items.update');
    
    // AJAX Endpoints
    Route::get('api/request-items/{requestItem}', [RequestItemController::class, 'getItem'])
        ->name('request-items.getItem');
    Route::get('api/items/available/{materialRequest}', [RequestItemController::class, 'getAvailable'])
        ->name('request-items.getAvailable');

    // ==================== Aggregated Orders ====================
    Route::resource('aggregated-orders', AggregatedOrderController::class)
        ->except(['edit', 'update']);
    
    // Aggregated Order Actions
    Route::post('aggregated-orders/{aggregatedOrder}/confirm', [AggregatedOrderController::class, 'confirm'])
        ->name('aggregated-orders.confirm');
    Route::get('aggregated-orders/{aggregatedOrder}/receive-form', [AggregatedOrderController::class, 'receiveForm'])
        ->name('aggregated-orders.receiveForm');
    Route::post('aggregated-orders/{aggregatedOrder}/receive', [AggregatedOrderController::class, 'receive'])
        ->name('aggregated-orders.receive');
    Route::post('aggregated-orders/{aggregatedOrder}/cancel', [AggregatedOrderController::class, 'cancel'])
        ->name('aggregated-orders.cancel');

    // ==================== Budgets ====================
    Route::get('budgets/strategic-dashboard', [BudgetController::class, 'strategicDashboard'])->name('budgets.strategic-dashboard');
    Route::resource('budgets', BudgetController::class)
        ->except(['edit', 'update']);
    
    // Budget Actions
    Route::post('budgets/{budget}/approve', [BudgetController::class, 'approve'])
        ->name('budgets.approve');
    Route::post('budgets/{budget}/add-amount', [BudgetController::class, 'addAmount'])
        ->name('budgets.add-amount');
    Route::post('budgets/{budget}/activate', [BudgetController::class, 'activate'])
        ->name('budgets.activate');
    Route::post('budgets/{budget}/close-and-rollover', [BudgetController::class, 'closeAndRollover'])
        ->name('budgets.close-and-rollover');

    // ==================== Budget Allocations ====================
    Route::resource('budget-allocations', BudgetAllocationController::class)
        ->except(['create', 'store', 'edit', 'update', 'destroy']);
    
    // Budget Allocations (nested under budgets)
    Route::post('budgets/{budget}/allocations', [BudgetAllocationController::class, 'store'])
        ->name('budget-allocations.store');
    Route::get('budgets/{budget}/allocations/create', [BudgetAllocationController::class, 'create'])
        ->name('budget-allocations.create');

    // Budget Allocation Actions
    Route::get('budget-allocations/{allocation}/record-expense', [BudgetAllocationController::class, 'recordExpenseForm'])
        ->name('budget-allocations.recordExpenseForm');
    Route::post('budget-allocations/{allocation}/record-expense', [BudgetAllocationController::class, 'recordExpense'])
        ->name('budget-allocations.recordExpense');
    Route::post('budget-allocations/{allocation}/approve-expense/{expense}', [BudgetAllocationController::class, 'approveExpense'])
        ->name('budget-allocations.approveExpense');
    Route::get('budget-allocations/{allocation}/expenses', [BudgetAllocationController::class, 'expenses'])
        ->name('budget-allocations.expenses');

    // ==================== Stock personnel (suivi reçus / distribués / restant) ====================
    Route::get('mon-stock', [PersonalStockController::class, 'index'])->name('personal-stock.index');
    Route::get('mon-stock/stock-par-staff', [PersonalStockController::class, 'stockByStaff'])->name('personal-stock.stock-by-staff');
    Route::post('mon-stock/distribution', [PersonalStockController::class, 'storeDistribution'])->name('personal-stock.store-distribution');
    Route::get('mon-stock/enregistrer-reception', [PersonalStockController::class, 'recordReceiptForm'])->name('personal-stock.record-receipt-form');
    Route::post('mon-stock/enregistrer-reception', [PersonalStockController::class, 'storeReceipt'])->name('personal-stock.store-receipt');

    // ==================== Bons de sortie (consultation) ====================
    Route::get('bons-de-sortie', [DeliverySlipController::class, 'index'])->name('delivery-slips.index');
    Route::get('bons-de-sortie/{deliverySlip}', [DeliverySlipController::class, 'show'])->name('delivery-slips.show');

    // ==================== Stock Management ====================
    Route::prefix('stock')->name('stock.')->group(function () {
        // Stock de mon campus (lecture seule, staff uniquement — permission stock.view_campus)
        Route::get('mon-campus', [StockController::class, 'monCampus'])->name('mon-campus');
        // Dashboard & List Views
        Route::get('/', [StockController::class, 'index'])->name('index');
        Route::get('dashboard', [StockController::class, 'dashboard'])->name('dashboard');
        Route::get('{item}', [StockController::class, 'show'])->name('show');
        
        // Stock Actions
        Route::get('low-stock-alert', [StockController::class, 'lowStockAlert'])->name('lowStockAlert');
        Route::get('reorder-list', [StockController::class, 'reorderList'])->name('reorderList');
        Route::get('history/{item}', [StockController::class, 'history'])->name('history');
        
        // AJAX Endpoints
        Route::get('api/low-items', [StockController::class, 'getLowStockItems'])->name('getLowStockItems');
        Route::get('api/available/{item}', [StockController::class, 'getAvailableStock'])->name('getAvailableStock');
    });

    // ==================== Assets ====================
    Route::resource('assets', AssetController::class);
    
    // Asset Actions
    Route::get('assets/{asset}/transfer-form', [AssetController::class, 'transferForm'])
        ->name('assets.transferForm');
    Route::post('assets/{asset}/transfer', [AssetController::class, 'transfer'])
        ->name('assets.transfer');
    Route::post('assets/{asset}/send-to-maintenance', [AssetController::class, 'sendToMaintenance'])
        ->name('assets.sendToMaintenance');
    Route::post('assets/{asset}/recall-from-maintenance', [AssetController::class, 'recallFromMaintenance'])
        ->name('assets.recallFromMaintenance');
    Route::post('assets/{asset}/decommission', [AssetController::class, 'decommission'])
        ->name('assets.decommission');

    // ==================== Maintenance Tickets ====================
    Route::resource('maintenance-tickets', MaintenanceTicketController::class);
    
    // Maintenance Ticket Actions
    Route::post('maintenance-tickets/{ticket}/assign', [MaintenanceTicketController::class, 'assign'])
        ->name('maintenance-tickets.assign');
    Route::post('maintenance-tickets/{ticket}/start-work', [MaintenanceTicketController::class, 'startWork'])
        ->name('maintenance-tickets.startWork');
    Route::post('maintenance-tickets/{ticket}/work', [MaintenanceTicketController::class, 'work'])
        ->name('maintenance-tickets.work');
    Route::post('maintenance-tickets/{ticket}/resolve', [MaintenanceTicketController::class, 'resolve'])
        ->name('maintenance-tickets.resolve');
    Route::post('maintenance-tickets/{ticket}/close', [MaintenanceTicketController::class, 'close'])
        ->name('maintenance-tickets.close');

    // AJAX Endpoints
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');

    Route::get('api/pending-approvals', [MaterialRequestController::class, 'getPendingApprovals'])
        ->name('getPendingApprovals');
    Route::get('api/low-stock-items', [StockController::class, 'getLowStockItems'])
        ->name('getLowStockItems');

});
