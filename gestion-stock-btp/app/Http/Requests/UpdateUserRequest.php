<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['super_admin', 'director']);
    }

    public function rules(): array
    {
        $user = $this->route('user');
        $roles = ['director', 'point_focal', 'staff'];
        $rules = [
            'first_name' => 'required|string|max:80',
            'last_name'  => 'required|string|max:80',
            'email'      => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone'      => 'nullable|string|max:30',
            'address'    => 'nullable|string|max:500',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'campus_id'  => [
                'nullable',
                'exists:campuses,id',
                function ($attr, $value, $fail) {
                    if ($this->input('role') !== 'point_focal' && $this->input('role') !== 'director' && empty($value)) {
                        $fail('Le campus est obligatoire pour le profil Staff.');
                    }
                },
            ],
            'role'       => ['required', 'string', Rule::in($roles)],
            'is_active' => 'boolean',
        ];
        if ($this->filled('password')) {
            $rules['password'] = ['string', 'confirmed', Password::defaults()];
        }
        return $rules;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active')) {
            $this->merge(['is_active' => (bool) $this->is_active]);
        }
    }
}
