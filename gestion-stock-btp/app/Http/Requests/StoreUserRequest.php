<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['super_admin', 'director']);
    }

    public function rules(): array
    {
        $roles = $this->user()->hasRole('super_admin')
            ? ['point_focal', 'staff', 'director']
            : ['point_focal', 'staff'];
        return [
            'first_name' => 'required|string|max:80',
            'last_name'  => 'required|string|max:80',
            'email'      => 'required|email|unique:users,email',
            'phone'      => 'nullable|string|max:30',
            'address'    => 'nullable|string|max:500',
            'password'   => ['required', 'string', 'confirmed', Password::defaults()],
            'campus_id'  => [
                'nullable',
                'exists:campuses,id',
                function ($attr, $value, $fail) {
                    $role = $this->input('role');
                    if (! in_array($role, ['point_focal', 'director'], true) && empty($value)) {
                        $fail('Le campus est obligatoire pour le profil Staff.');
                    }
                },
            ],
            'role'       => ['required', 'string', Rule::in($roles)],
            'is_active'  => 'boolean',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active')) {
            $this->merge(['is_active' => (bool) $this->is_active]);
        } else {
            $this->merge(['is_active' => true]);
        }
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'Le prénom est obligatoire.',
            'last_name.required'  => 'Le nom est obligatoire.',
            'email.unique'        => 'Cet email est déjà utilisé.',
            'campus_id.required'  => 'Le campus est obligatoire pour ce profil.',
        ];
    }
}
