<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * CategoryFactory
 *
 * Generate item categories (consommables vs assets)
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $type = fake()->randomElement(['consommable', 'asset']);
        $word = fake()->unique()->word();
        $name = ucfirst($word);
        return [
            'name' => $name,
            'code' => 'CAT-' . strtoupper(substr($word, 0, 3)) . fake()->unique()->numberBetween(100, 999),
            'description' => $word,
            'type' => $type,
            'is_active' => true,
        ];
    }

    public function consommable(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'consommable',
        ]);
    }

    public function asset(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'asset',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
