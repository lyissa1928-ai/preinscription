<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Budget;
use App\Models\Department;

/**
 * AllocateBudgetRequest
 *
 * Validates allocation of campus budget to departments
 * Only directors can allocate budgets
 * Prevents overspending and allocations to wrong campus
 */
class AllocateBudgetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        // Only directors can allocate budgets
        return $this->user()->hasAnyRole(['director', 'super_admin']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'budget_id' => [
                'required',
                'integer',
                'exists:budgets,id',
                // Budget must be active
                function ($attribute, $value, $fail) {
                    $budget = Budget::find($value);
                    if ($budget && $budget->status !== 'active') {
                        $fail("Budget is not active (status: {$budget->status}). Only active budgets can receive allocations.");
                    }
                },
            ],
            'department_id' => [
                'required',
                'integer',
                'exists:departments,id',
                // Department must belong to budget's campus
                function ($attribute, $value, $fail) {
                    $budget = Budget::find($this->input('budget_id'));
                    $department = Department::find($value);

                    if ($budget && $department && $department->campus_id !== $budget->campus_id) {
                        $fail('Department must belong to the same campus as the budget.');
                    }
                },
                // Department must be active
                function ($attribute, $value, $fail) {
                    $department = Department::find($value);
                    if ($department && !$department->is_active) {
                        $fail("Department {$department->code} is inactive and cannot receive allocations.");
                    }
                },
                // Prevent duplicate allocations
                function ($attribute, $value, $fail) {
                    $budget = Budget::find($this->input('budget_id'));
                    if ($budget && $budget->budgetAllocations()
                        ->where('department_id', $value)
                        ->exists()) {
                        $fail('Allocation for this department already exists.');
                    }
                },
            ],
            'allocated_amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999.99',
                // Cannot exceed unallocated amount
                function ($attribute, $value, $fail) {
                    $budget = Budget::find($this->input('budget_id'));
                    if ($budget && $value > $budget->getRemainingUnallocated()) {
                        $remaining = $budget->getRemainingUnallocated();
                        $fail("Allocation cannot exceed unallocated amount (\${$remaining}).");
                    }
                },
            ],
            'notes' => [
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }

    /**
     * Get custom error messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'budget_id.required' => 'Budget is required.',
            'budget_id.exists' => 'The selected budget does not exist.',
            'department_id.required' => 'Department is required.',
            'department_id.exists' => 'The selected department does not exist.',
            'allocated_amount.required' => 'Allocation amount is required.',
            'allocated_amount.numeric' => 'Allocation amount must be a valid number.',
            'allocated_amount.min' => 'Allocation amount must be greater than 0.',
            'allocated_amount.max' => 'Allocation amount cannot exceed 999,999,999.99.',
            'notes.max' => 'Notes cannot exceed 500 characters.',
        ];
    }
}
