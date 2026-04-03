<?php

namespace Database\Factories;

use App\Models\Budget;
use App\Models\Campus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * BudgetFactory
 *
 * Generate budget records
 */
class BudgetFactory extends Factory
{
    protected $model = Budget::class;

    public function definition(): array
    {
        return [
            'campus_id' => Campus::active()->inRandomOrder()->first()?->id 
                ?? Campus::factory()->create()->id,
            'fiscal_year' => fake()->randomElement([2024, 2025, 2026]),
            'total_budget_amount' => fake()->randomFloat(2, 10000, 100000),
            'allocated_amount' => 0,
            'spent_amount' => 0,
            'status' => fake()->randomElement(['draft', 'approved', 'active']),
            'approved_by_user_id' => null,
            'approved_at' => null,
            'activated_at' => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'approved_by_user_id' => null,
            'approved_at' => null,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_by_user_id' => User::director()->inRandomOrder()->first()?->id 
                ?? User::factory()->director()->create()->id,
            'approved_at' => now(),
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'approved_by_user_id' => User::director()->inRandomOrder()->first()?->id 
                ?? User::factory()->director()->create()->id,
            'approved_at' => now(),
            'activated_at' => now(),
        ]);
    }

    public function forCampus(Campus $campus): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => $campus->id,
        ]);
    }

    public function withAllocations(): static
    {
        return $this->state(fn (array $attributes) => [
            'allocated_amount' => fake()->randomFloat(2, 1000, $attributes['total_budget_amount'] * 0.8),
        ]);
    }

    public function withExpenses(): static
    {
        return $this->state(fn (array $attributes) => [
            'spent_amount' => fake()->randomFloat(2, 1000, $attributes['allocated_amount'] ?? 1000),
        ]);
    }
}
