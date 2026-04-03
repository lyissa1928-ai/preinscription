<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\BudgetAllocation;

/**
 * RecordExpenseRequest
 *
 * Validates recording of expenses against budget allocations
 * Prevents overspending: validates remaining amount before recording
 * Campus managers and site managers can record expenses for their campus
 */
class RecordExpenseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        $allocation = BudgetAllocation::findOrFail($this->input('budget_allocation_id'));

        // Site-scoped users: only their campus
        if ($this->user()->isSiteScoped()) {
            return $allocation->budget->campus_id === $this->user()->campus_id;
        }

        // Directors can record expenses anywhere
        return $this->user()->hasAnyRole(['director', 'campus_manager']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'budget_allocation_id' => [
                'required',
                'integer',
                'exists:budget_allocations,id',
                // Allocation must be active
                function ($attribute, $value, $fail) {
                    $allocation = BudgetAllocation::find($value);
                    if ($allocation && $allocation->status === 'depleted') {
                        $fail('Budget allocation is depleted and cannot receive new expenses.');
                    }
                },
            ],
            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999.99',
                // Cannot exceed remaining allocation
                function ($attribute, $value, $fail) {
                    $allocation = BudgetAllocation::find($this->input('budget_allocation_id'));
                    if ($allocation && $value > $allocation->getRemainingAmount()) {
                        $remaining = $allocation->getRemainingAmount();
                        $fail("Expense amount (\${$value}) exceeds remaining allocation (\${$remaining}).");
                    }
                },
            ],
            'category' => [
                'required',
                'string',
                'in:material,service,maintenance,other',
            ],
            'description' => [
                'required',
                'string',
                'min:5',
                'max:500',
            ],
            'expense_date' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],
            'reference_number' => [
                'nullable',
                'string',
                'max:50',
                'unique:expenses,reference_number',
            ],
            'aggregated_order_id' => [
                'nullable',
                'integer',
                'exists:aggregated_orders,id',
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
            'budget_allocation_id.required' => 'Budget allocation is required.',
            'budget_allocation_id.exists' => 'The selected budget allocation does not exist.',
            'amount.required' => 'Expense amount is required.',
            'amount.numeric' => 'Expense amount must be a valid number.',
            'amount.min' => 'Expense amount must be greater than 0.',
            'amount.max' => 'Expense amount cannot exceed 999,999,999.99.',
            'category.required' => 'Category is required.',
            'category.in' => 'Category must be one of: material, service, maintenance, other.',
            'description.required' => 'Description is required.',
            'description.min' => 'Description must be at least 5 characters.',
            'description.max' => 'Description cannot exceed 500 characters.',
            'expense_date.date' => 'Expense date must be a valid date.',
            'expense_date.before_or_equal' => 'Expense date cannot be in the future.',
            'reference_number.unique' => 'A reference number must be unique.',
            'reference_number.max' => 'Reference number cannot exceed 50 characters.',
            'aggregated_order_id.exists' => 'The selected order does not exist.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation(): void
    {
        // Set default expense date to today if not provided
        if (!$this->input('expense_date')) {
            $this->merge([
                'expense_date' => now()->toDateString(),
            ]);
        }
    }
}
