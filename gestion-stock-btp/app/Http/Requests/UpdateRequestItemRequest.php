<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\RequestItem;

/**
 * UpdateRequestItemRequest
 *
 * Validates updates to request items in draft material requests
 * Only draft requests can have items modified
 * Only quantity and notes can be updated
 */
class UpdateRequestItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        $requestItem = RequestItem::findOrFail($this->route('requestItem'));
        $materialRequest = $requestItem->materialRequest;

        // Request must be draft
        if ($materialRequest->status !== 'draft') {
            return false;
        }

        // Only request creator, campus manager, or director
        if ($this->user()->id === $materialRequest->requester_user_id) {
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
            'requested_quantity.required' => 'Quantity is required.',
            'requested_quantity.integer' => 'Quantity must be a whole number.',
            'requested_quantity.min' => 'Quantity must be at least 1.',
            'requested_quantity.max' => 'Quantity cannot exceed 99,999.',
            'unit_price.numeric' => 'Unit price must be a valid number.',
            'unit_price.min' => 'Unit price cannot be negative.',
            'unit_price.max' => 'Unit price cannot exceed 999,999.99.',
            'notes.max' => 'Notes cannot exceed 500 characters.',
        ];
    }
}
