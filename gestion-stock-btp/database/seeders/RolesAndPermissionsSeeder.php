<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

/**
 * RolesAndPermissionsSeeder
 *
 * Rôles ESEBAT : super_admin, director, point_focal, staff.
 * Super Admin : peut tout faire SAUF allocation de budget (réservée au Directeur).
 * Director : accès complet métier dont allocation de budget.
 * Matricules : Staff = STF + 3 chiffres, Point Focal = PFE + 2 chiffres.
 *
 * Usage: php artisan db:seed --class=RolesAndPermissionsSeeder
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()['cache']->forget('spatie.permission.cache');

        $permissions = $this->definePermissions();
        $this->defineRoles($permissions);

        echo "✓ Roles and Permissions seeded successfully\n";
    }

    private function definePermissions(): array
    {
        $permissionList = [
            'material_request.view_all' => 'View all material requests',
            'material_request.view_own' => 'View own material requests',
            'material_request.create' => 'Create material request',
            'material_request.submit' => 'Submit request for approval',
            'material_request.approve' => 'Approve material requests',
            'material_request.reject' => 'Reject material requests',
            'material_request.edit_draft' => 'Edit draft requests',
            'material_request.delete_draft' => 'Delete draft requests',

            'request_item.add' => 'Add items to request',
            'request_item.edit_draft' => 'Edit items in draft request',
            'request_item.remove_draft' => 'Remove items from draft request',

            'aggregated_order.view_all' => 'View all purchase orders',
            'aggregated_order.create' => 'Create aggregated order (federation)',
            'aggregated_order.confirm' => 'Confirm purchase order',
            'aggregated_order.receive' => 'Record order receipt',
            'aggregated_order.cancel' => 'Cancel purchase order',
            'aggregated_order.export' => 'Export order details',

            'budget.view_all' => 'View all budgets',
            'budget.view_own_campus' => 'View campus budgets',
            'budget.create' => 'Create budget',
            'budget.approve' => 'Approve budget',
            'budget.activate' => 'Activate budget',
            'budget.view_report' => 'View budget reports',

            'budget_allocation.view_all' => 'View all allocations',
            'budget_allocation.view_campus' => 'View campus allocations',
            'budget_allocation.create' => 'Allocate budget to department',
            'budget_allocation.record_expense' => 'Record expense',
            'budget_allocation.approve_expense' => 'Approve expense',
            'budget_allocation.reconcile' => 'Reconcile expenses',

            'stock.view_all' => 'View system-wide inventory',
            'stock.view_campus' => 'View campus inventory',
            'stock.low_stock_alert' => 'View low stock alerts',
            'stock.update' => 'Update stock quantities',

            'asset.view_all' => 'View all assets',
            'asset.view_campus' => 'View campus assets',
            'asset.create' => 'Create asset',
            'asset.transfer' => 'Transfer asset location',
            'asset.maintain' => 'Send asset to maintenance',
            'asset.decommission' => 'Decommission asset',
            'asset.value_report' => 'View asset value reports',

            'maintenance_ticket.view_all' => 'View all maintenance tickets',
            'maintenance_ticket.view_campus' => 'View campus tickets',
            'maintenance_ticket.view_assigned' => 'View assigned tickets',
            'maintenance_ticket.create' => 'Create maintenance ticket',
            'maintenance_ticket.assign' => 'Assign ticket to technician',
            'maintenance_ticket.work' => 'Work on assigned ticket',
            'maintenance_ticket.resolve' => 'Mark maintenance resolved',
            'maintenance_ticket.close' => 'Close maintenance ticket',

            'audit_log.view_all' => 'View activity logs',
            'audit_log.view_campus' => 'View campus activity logs',

            'admin.view_reports' => 'View system reports',
            'admin.manage_users' => 'Manage users',
            'admin.manage_campuses' => 'Manage campuses',
            'admin.manage_departments' => 'Manage departments',
            'admin.manage_suppliers' => 'Manage suppliers',
        ];

        $permissions = [];
        foreach ($permissionList as $key => $description) {
            $permissions[$key] = Permission::firstOrCreate(
                ['name' => $key],
                ['description' => $description, 'guard_name' => 'web']
            );
        }
        echo sprintf("  Created %d permissions\n", count($permissions));
        return $permissions;
    }

    private function defineRoles(array $permissions): void
    {
        $all = array_values($permissions);

        // Permissions d'action sur les allocations : Super Admin ne peut pas allouer / enregistrer / approuver / réconcilier (Directeur uniquement)
        $budgetAllocationActionKeys = [
            'budget_allocation.create',
            'budget_allocation.record_expense',
            'budget_allocation.approve_expense',
            'budget_allocation.reconcile',
        ];
        $permissionsWithoutAllocationActions = array_filter($all, function ($p) use ($budgetAllocationActionKeys) {
            return !in_array($p->name, $budgetAllocationActionKeys, true);
        });

        // Super Admin - Tout sauf allocation de budget
        $superAdmin = Role::firstOrCreate(
            ['name' => 'super_admin'],
            ['description' => 'Super Administrateur - Peut tout faire sauf allocation de budget', 'guard_name' => 'web']
        );
        $superAdmin->syncPermissions(array_values($permissionsWithoutAllocationActions));
        echo "  ✓ Super Admin role created (all permissions except create/record/approve/reconcile budget allocation)\n";

        // Director - Accès complet métier (dont allocation de budget et gestion utilisateurs)
        $director = Role::firstOrCreate(
            ['name' => 'director'],
            ['description' => 'Directeur - Accès complet métier dont allocation de budget', 'guard_name' => 'web']
        );
        $director->syncPermissions($all);
        echo "  ✓ Director role created\n";

        // Point Focal - Agrégation et commandes
        $pointFocal = Role::firstOrCreate(
            ['name' => 'point_focal'],
            ['description' => 'Point focal logistique - Agrège les demandes, gère les commandes', 'guard_name' => 'web']
        );
        $pointFocal->syncPermissions([
            $permissions['material_request.view_all'],
            $permissions['material_request.create'],
            $permissions['material_request.submit'],
            $permissions['request_item.add'],
            $permissions['material_request.approve'],
            $permissions['material_request.reject'],
            $permissions['aggregated_order.view_all'],
            $permissions['aggregated_order.create'],
            $permissions['aggregated_order.confirm'],
            $permissions['aggregated_order.receive'],
            $permissions['aggregated_order.export'],
            $permissions['stock.view_all'],
            $permissions['stock.low_stock_alert'],
            $permissions['budget.view_all'],
            $permissions['budget.view_report'],
            $permissions['audit_log.view_all'],
        ]);
        echo "  ✓ Point Focal role created\n";

        // Staff - Demandes et vue limitée
        $staff = Role::firstOrCreate(
            ['name' => 'staff'],
            ['description' => 'Staff - Saisit des demandes, voit ses demandes et demandes groupées auxquelles il participe', 'guard_name' => 'web']
        );
        $staff->syncPermissions([
            $permissions['material_request.view_own'],
            $permissions['material_request.create'],
            $permissions['material_request.submit'],
            $permissions['material_request.edit_draft'],
            $permissions['material_request.delete_draft'],
            $permissions['request_item.add'],
            $permissions['request_item.edit_draft'],
            $permissions['request_item.remove_draft'],
            $permissions['stock.view_campus'],
            $permissions['asset.view_campus'],
            $permissions['maintenance_ticket.view_campus'],
            $permissions['audit_log.view_campus'],
        ]);
        echo "  ✓ Staff role created\n";
    }
}
