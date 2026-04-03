<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Supplier;
use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * ItemFactory
 *
 * Generate consommable items for inventory
 */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        return [
            'category_id' => Category::consommables()->inRandomOrder()->first()?->id 
                ?? Category::factory()->consommable(),
            'supplier_id' => Supplier::active()->inRandomOrder()->first()?->id 
                ?? Supplier::factory(),
            'item_code' => fake()->unique()->bothify('IT-####'),
            'description' => fake()->sentence(),
            'unit_of_measure' => fake()->randomElement(['pcs', 'box', 'pack', 'roll', 'liter', 'kg']),
            'unit_price' => fake()->randomFloat(2, 1, 500),
            'current_stock' => fake()->numberBetween(0, 100),
            'reorder_threshold' => fake()->numberBetween(5, 20),
            'is_active' => true,
        ];
    }

    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_stock' => fake()->numberBetween(0, 5),
            'reorder_threshold' => fake()->numberBetween(10, 30),
        ]);
    }

    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_stock' => 0,
            'reorder_threshold' => fake()->numberBetween(5, 20),
        ]);
    }

    public function highStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_stock' => fake()->numberBetween(100, 500),
            'reorder_threshold' => fake()->numberBetween(5, 20),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
