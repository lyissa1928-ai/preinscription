<?php

namespace Database\Factories;

use App\Models\MaterialRequest;
use App\Models\Campus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * MaterialRequestFactory
 *
 * Generate material request records
 */
class MaterialRequestFactory extends Factory
{
    protected $model = MaterialRequest::class;

    public function definition(): array
    {
        $campus = Campus::active()->inRandomOrder()->first() ?? Campus::factory()->create();
        $requester = User::staff()->where('campus_id', $campus->id)->inRandomOrder()->first()
            ?? User::factory()->staff()->forCampus($campus)->create();
        $requestDate = fake()->dateTimeBetween('-3 months');

        return [
            'campus_id' => $campus->id,
            'request_number' => 'REQ-' . now()->format('Ym') . '-' . fake()->unique()->numberBetween(1, 9999),
            'requester_user_id' => $requester->id,
            'request_date' => $requestDate,
            'needed_by_date' => fake()->dateTimeBetween($requestDate, '+3 months'),
            'status' => fake()->randomElement(['draft', 'submitted', 'approved']),
            'approved_by_user_id' => null,
            'approved_at' => null,
            'notes' => fake()->optional(0.5)->paragraph(),
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

    public function submitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'submitted',
            'approved_by_user_id' => null,
            'approved_at' => null,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_by_user_id' => User::campusManager()->inRandomOrder()->first()?->id 
                ?? User::factory()->campusManager()->create()->id,
            'approved_at' => now(),
        ]);
    }

    public function forCampus(Campus $campus): static
    {
        $requester = User::staff()->where('campus_id', $campus->id)->inRandomOrder()->first()
            ?? User::factory()->staff()->forCampus($campus)->create();

        return $this->state(fn (array $attributes) => [
            'campus_id' => $campus->id,
            'requester_user_id' => $requester->id,
        ]);
    }

    public function byUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'requester_user_id' => $user->id,
            'campus_id' => $user->campus_id,
        ]);
    }
}
