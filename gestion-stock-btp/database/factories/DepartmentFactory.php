<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Campus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * DepartmentFactory
 *
 * Generate department/organizational unit records
 */
class DepartmentFactory extends Factory
{
    protected $model = Department::class;

    public function definition(): array
    {
        $word = fake()->unique()->word();
        return [
            'campus_id' => Campus::active()->inRandomOrder()->first()?->id 
                ?? Campus::factory()->create()->id,
            'name' => $word . ' Department',
            'code' => 'DEPT-' . fake()->unique()->numberBetween(10000, 99999),
            'head_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
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
