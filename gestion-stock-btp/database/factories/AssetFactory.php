<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\Category;
use App\Models\Campus;
use App\Models\Warehouse;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * AssetFactory
 *
 * Generate fixed asset records
 */
class AssetFactory extends Factory
{
    protected $model = Asset::class;

    public function definition(): array
    {
        $campus = Campus::active()->inRandomOrder()->first() ?? Campus::factory()->create();
        $warehouse = Warehouse::where('campus_id', $campus->id)->inRandomOrder()->first()
            ?? Warehouse::factory()->forCampus($campus)->create();
        $acquisitionDate = fake()->dateTimeBetween('-5 years');

        return [
            'category_id' => Category::assets()->inRandomOrder()->first()?->id 
                ?? Category::factory()->asset(),
            'serial_number' => fake()->unique()->bothify('AS-########'),
            'description' => fake()->sentence(),
            'current_campus_id' => $campus->id,
            'current_warehouse_id' => $warehouse->id,
            'acquisition_date' => $acquisitionDate,
            'acquisition_cost' => fake()->randomFloat(2, 100, 10000),
            'warranty_expiry' => fake()->dateTimeBetween($acquisitionDate, '+3 years'),
            'lifecycle_status' => fake()->randomElement(['en_service', 'en_service', 'maintenance']),
            'created_by_user_id' => User::staff()->inRandomOrder()->first()?->id 
                ?? User::factory()->staff()->create()->id,
            'notes' => fake()->optional(0.3)->sentence(),
        ];
    }

    public function inService(): static
    {
        return $this->state(fn (array $attributes) => [
            'lifecycle_status' => 'en_service',
        ]);
    }

    public function inMaintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'lifecycle_status' => 'maintenance',
        ]);
    }

    public function decommissioned(): static
    {
        return $this->state(fn (array $attributes) => [
            'lifecycle_status' => 'reformé',
        ]);
    }

    public function forCampus(Campus $campus): static
    {
        $warehouse = Warehouse::where('campus_id', $campus->id)->inRandomOrder()->first()
            ?? Warehouse::factory()->forCampus($campus)->create();

        return $this->state(fn (array $attributes) => [
            'current_campus_id' => $campus->id,
            'current_warehouse_id' => $warehouse->id,
        ]);
    }
}
