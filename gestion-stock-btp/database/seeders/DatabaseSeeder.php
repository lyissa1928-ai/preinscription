<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Campus;
use App\Models\Warehouse;
use App\Models\Department;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\Item;
use App\Models\Asset;
use App\Models\Budget;
use App\Models\User;
use App\Models\MaterialRequest;
use App\Models\RequestItem;

/**
 * DatabaseSeeder
 *
 * Orchestrate database seeding for development/testing
 * Calls all child seeders and creates test data
 *
 * Usage: php artisan db:seed
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database
     */
    public function run(): void
    {
        echo "\n🌱 Starting database seeding...\n";

        // 1. Seed roles and permissions first (required for user role assignment)
        echo "\n--- Step 1: Roles & Permissions ---\n";
        $this->call(RolesAndPermissionsSeeder::class);

        // 2. Create infrastructure (campuses, warehouses, departments)
        echo "\n--- Step 2: Infrastructure ---\n";
        $this->seedInfrastructure();

        // 3. Create users with roles
        echo "\n--- Step 3: Users ---\n";
        $this->seedUsers();

        // 4. Create logistics setup (categories, suppliers, items)
        echo "\n--- Step 4: Logistics Setup ---\n";
        $this->seedLogistics();

        // 5. Create assets
        echo "\n--- Step 5: Assets ---\n";
        $this->seedAssets();

        // 6. Create budgets
        echo "\n--- Step 6: Budgets ---\n";
        $this->seedBudgets();

        // 7. Create sample material requests and items
        echo "\n--- Step 7: Material Requests ---\n";
        $this->seedMaterialRequests();

        echo "\n✅ Database seeding completed!\n\n";
    }

    /**
     * Seed infrastructure: campuses, warehouses, departments
     */
    private function seedInfrastructure(): void
    {
        // Create 3 campuses
        Campus::factory(3)->create()->each(function (Campus $campus) {
            // Create 2-3 warehouses per campus
            Warehouse::factory(fake()->numberBetween(2, 3))->forCampus($campus)->create();

            // Create 3-4 departments per campus
            Department::factory(fake()->numberBetween(3, 4))->forCampus($campus)->create();
        });

        echo "  ✓ Created 3 campuses with warehouses and departments\n";
    }

    /**
     * Seed users: Super Admin, Directeur, Point focal, Staff uniquement
     */
    private function seedUsers(): void
    {
        $campuses = Campus::all();

        // Super Admin plateforme (login: issa.ly@esebat.com / Admin@2020)
        $superAdmin = User::firstOrCreate(
            ['email' => 'issa.ly@esebat.com'],
            [
                'name' => 'Super Admin',
                'first_name' => 'Issa',
                'last_name' => 'Ly',
                'password' => 'Admin@2020',
                'email_verified_at' => now(),
                'campus_id' => null,
                'is_active' => true,
            ]
        );
        $superAdmin->password = 'Admin@2020';
        $superAdmin->save();
        if (\Schema::hasColumn('users', 'campus_id')) {
            $superAdmin->forceFill(['campus_id' => null])->save();
        }
        if (\Schema::hasColumn('users', 'is_active')) {
            $superAdmin->forceFill(['is_active' => true])->save();
        }
        if (!$superAdmin->hasRole('super_admin')) {
            $superAdmin->assignRole('super_admin');
        }
        echo "  ✓ Super Admin: issa.ly@esebat.com / Admin@2020\n";

        // Compte Directeur (admin secondaire)
        $admin = User::firstOrCreate(
            ['email' => 'admin@esebat.local'],
            [
                'name' => 'Administrateur',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );
        $admin->password = 'password';
        $admin->save();
        if (\Schema::hasColumn('users', 'campus_id')) {
            $admin->forceFill(['campus_id' => null])->save();
        }
        if (\Schema::hasColumn('users', 'is_active')) {
            $admin->forceFill(['is_active' => true])->save();
        }
        if (!$admin->hasRole('director')) {
            $admin->assignRole('director');
        }
        echo "  ✓ Directeur: admin@esebat.local / password\n";

        // Point focal avec matricule PFE01, PFE02...
        for ($i = 0; $i < 2; $i++) {
            $pf = User::factory()->pointFocal()->create();
            if (\Schema::hasColumn('users', 'matricule')) {
                $pf->update(['matricule' => User::generateMatriculeForRole('point_focal')]);
            }
        }

        // Staff par campus avec matricule STF001, STF002...
        foreach ($campuses as $campus) {
            foreach (range(1, 3) as $_) {
                $staff = User::factory()->staff()->forCampus($campus)->create();
                if (\Schema::hasColumn('users', 'matricule')) {
                    $staff->update(['matricule' => User::generateMatriculeForRole('staff')]);
                }
            }
        }

        echo "  ✓ Created point focal and staff with matricules (PFExx, STFxxx)\n";
    }

    /**
     * Seed logistics: categories, suppliers, items
     */
    private function seedLogistics(): void
    {
        // Create categories
        Category::factory()->consommable()->create(['description' => 'Office Supplies']);
        Category::factory()->consommable()->create(['description' => 'Cleaning Materials']);
        Category::factory()->asset()->create(['description' => 'Furniture']);
        Category::factory()->asset()->create(['description' => 'Equipment']);

        // Create suppliers
        Supplier::factory(5)->create();

        // Create items
        Item::factory(20)->create();
        Item::factory(5)->lowStock()->create();
        Item::factory(3)->outOfStock()->create();

        echo "  ✓ Created categories, suppliers, and items\n";
    }

    /**
     * Seed assets
     */
    private function seedAssets(): void
    {
        $campuses = Campus::all();

        foreach ($campuses as $campus) {
            Asset::factory(5)->inService()->forCampus($campus)->create();
            Asset::factory(2)->inMaintenance()->forCampus($campus)->create();
            Asset::factory(1)->decommissioned()->forCampus($campus)->create();
        }

        echo "  ✓ Created assets across campuses\n";
    }

    /**
     * Seed budgets
     */
    private function seedBudgets(): void
    {
        $campuses = Campus::all();

        foreach ($campuses as $campus) {
            // Create a mix of draft, approved, and active budgets
            Budget::factory()->draft()->forCampus($campus)->create();
            Budget::factory()->approved()->forCampus($campus)->create();
            Budget::factory()->active()->forCampus($campus)->create();
        }

        echo "  ✓ Created budgets for each campus\n";
    }

    /**
     * Seed material requests with items
     */
    private function seedMaterialRequests(): void
    {
        $campuses = Campus::all();
        $items = Item::all();

        foreach ($campuses as $campus) {
            // Create 5 requests per campus
            for ($i = 0; $i < 5; $i++) {
                $request = MaterialRequest::factory()
                    ->forCampus($campus)
                    ->create();

                // Add 2-5 items to each request
                $randomItems = $items->random(fake()->numberBetween(2, 5));
                foreach ($randomItems as $item) {
                    RequestItem::create([
                        'material_request_id' => $request->id,
                        'item_id' => $item->id,
                        'requested_quantity' => fake()->numberBetween(1, 50),
                        'unit_price' => $item->unit_price,
                        'status' => 'pending',
                        'notes' => null,
                    ]);
                }
            }
        }

        echo "  ✓ Created material requests with items\n";
    }
}
