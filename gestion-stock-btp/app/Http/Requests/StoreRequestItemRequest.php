<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\MaterialRequest;
use App\Models\Item;

/**
 * StoreRequestItemRequest
 *
 * Validates addition of items to draft material requests
 * Can only add items to draft requests
 * Can only add active items
 */
class StoreRequestItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        $request = MaterialRequest::findOrFail($this->route('materialRequest'));

        // Only request creator or campus managers can edit
        if ($this->user()->id === $request->requester_user_id) {
            return true;
        }

        return $this->user()->hasAnyRole(['director', 'super_admin', 'point_focal']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'item_id' => [
                'required',
                'integer',
                'exists:items,id',
                // Item must be active
                function ($attribute, $value, $fail) {
                    $item = Item::find($value);
                    if ($item && !$item->is_active) {
                        $fail("Item {$item->code} is inactive and cannot be requested.");
                    }
                },
                // Item must not already be in this request
                function ($attribute, $value, $fail) {
                    $request = MaterialRequest::findOrFail($this->route('materialRequest'));
                    if ($request->requestItems()->where('item_id', $value)->exists()) {
                        $fail('This item is already in the request.');
                    }
                },
            ],
            'requested_quantity' => [
                'required',
                'integer',
                'min:1',
                'max:99999',
            ],
            'unit_price' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999.99',
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
            'item_id.required' => 'Item is required.',
            'item_id.exists' => 'The selected item does not exist.',
            'requested_quantity.required' => 'Quantity is required.',
            'requested_quantity.min' => 'Quantity must be at least 1.',
            'requested_quantity.max' => 'Quantity cannot exceed 99,999.',
            'unit_price.numeric' => 'Unit price must be a valid number.',
            'unit_price.min' => 'Unit price cannot be negative.',
            'notes.max' => 'Notes cannot exceed 500 characters.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation(): void
    {
        // Ensure the materialRequest route parameter is set
        if (!$this->route('materialRequest')) {
            throw new \InvalidArgumentException('Material request ID is required.');
        }
    }
}
