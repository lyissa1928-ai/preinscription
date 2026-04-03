<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Campus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * UserFactory
 *
 * Generate test users with various roles and campus associations
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * Define the model's default state
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'phone' => fake()->phoneNumber(),
            'campus_id' => Campus::query()->inRandomOrder()->first()?->id,
            'is_active' => true,
            'remember_token' => null,
        ];
    }

    /**
     * Indicate that the model should be unauthenticated
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Create a director user (global access)
     */
    public function director(): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => null,
            'name' => 'Director ' . fake()->lastName(),
        ])->afterCreating(fn (User $user) => $user->assignRole('director'));
    }

    /**
     * Create a point focal user
     */
    public function pointFocal(): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => null,
            'name' => 'Point Focal ' . fake()->lastName(),
        ])->afterCreating(fn (User $user) => $user->assignRole('point_focal'));
    }

    /**
     * Create a campus manager
     */
    public function campusManager(): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => Campus::query()->inRandomOrder()->first()?->id,
            'name' => 'Manager ' . fake()->lastName(),
        ])->afterCreating(fn (User $user) => $user->assignRole('campus_manager'));
    }

    /**
     * Create a site manager
     */
    public function siteManager(): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => Campus::query()->inRandomOrder()->first()?->id,
            'name' => 'Site Manager ' . fake()->lastName(),
        ])->afterCreating(fn (User $user) => $user->assignRole('site_manager'));
    }

    /**
     * Create staff member
     */
    public function staff(): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => Campus::query()->inRandomOrder()->first()?->id,
            'name' => 'Staff ' . fake()->lastName(),
        ])->afterCreating(fn (User $user) => $user->assignRole('staff'));
    }

    /**
     * Create technician
     */
    public function technician(): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => Campus::query()->inRandomOrder()->first()?->id,
            'name' => 'Technician ' . fake()->lastName(),
        ])->afterCreating(fn (User $user) => $user->assignRole('technician'));
    }

    /**
     * Set campus for user
     */
    public function forCampus(Campus $campus): static
    {
        return $this->state(fn (array $attributes) => [
            'campus_id' => $campus->id,
        ]);
    }

    /**
     * Inactive user
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
