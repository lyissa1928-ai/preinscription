<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Supplier;
use App\Models\RequestItem;

/**
 * CreateAggregatedOrderRequest
 *
 * Validates creation of aggregated orders (POs) from pending request items
 * CRITICAL: Only Point Focal users can aggregate requests
 * Validates supplier exists and request items are pending
 *
 * Federation workflow enforcement:
 * pending RequestItems → aggregated order → confirmed with supplier
 */
class CreateAggregatedOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        // STRICT: Only Point Focal can aggregate requests
        return $this->user()->hasRole('point_focal');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'supplier_id' => [
                'required',
                'integer',
                'exists:suppliers,id',
                // Supplier must be active
                function ($attribute, $value, $fail) {
                    $supplier = Supplier::find($value);
                    if ($supplier && !$supplier->is_active) {
                        $fail("Supplier {$supplier->name} is inactive and cannot receive orders.");
                    }
                },
            ],
            'request_item_ids' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],
            'request_item_ids.*' => [
                'integer',
                'exists:request_items,id',
                // Each item must be pending
                function ($attribute, $value, $fail) {
                    $item = RequestItem::find($value);
                    if ($item && $item->status !== 'pending') {
                        throw new \InvalidArgumentException(
                            "RequestItem {$value} is not in pending status (currently: {$item->status})"
                        );
                    }
                },
            ],
            'expected_delivery_date' => [
                'nullable',
                'date',
                'after_or_equal:today',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
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
            'supplier_id.required' => 'Supplier is required.',
            'supplier_id.exists' => 'The selected supplier does not exist.',
            'request_item_ids.required' => 'At least one request item must be selected.',
            'request_item_ids.min' => 'At least one request item must be selected.',
            'request_item_ids.max' => 'Cannot aggregate more than 100 items at once.',
            'request_item_ids.*.exists' => 'One or more selected items do not exist.',
            'expected_delivery_date.date' => 'Expected delivery date must be a valid date.',
            'expected_delivery_date.after_or_equal' => 'Expected delivery date must be today or later.',
            'notes.max' => 'Notes cannot exceed 1000 characters.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation(): void
    {
        // If request_item_ids is a string (comma-separated), split it
        if (is_string($this->input('request_item_ids'))) {
            $this->merge([
                'request_item_ids' => array_filter(
                    explode(',', $this->input('request_item_ids'))
                ),
            ]);
        }
    }
}
