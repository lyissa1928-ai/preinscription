<?php

namespace Database\Factories;

use App\Models\Warehouse;
use App\Models\Campus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * WarehouseFactory
 *
 * Generate warehouse/storage location records
 */
class WarehouseFactory extends Factory
{
    protected $model = Warehouse::class;

    public function definition(): array
    {
        return [
            'campus_id' => Campus::active()->inRandomOrder()->first()?->id 
                ?? Campus::factory()->create()->id,
            'name' => fake()->unique()->word() . ' Warehouse',
            'code' => fake()->unique()->bothify('WH-????'),
            'location' => fake()->address(),
            'capacity' => fake()->numberBetween(1000, 50000),
            'description' => fake()->optional(0.5)->sentence(),
            'is_active' => true,
        ];
    }

    public function forCampus(Campus $campus): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => $campus->id,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
