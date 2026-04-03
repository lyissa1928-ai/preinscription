<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\AggregatedOrder;
use App\Models\AggregatedOrderItem;

/**
 * RecordOrderReceiptRequest
 *
 * Validates receipt of aggregated order items from suppliers
 * Only Point Focal and directors can receive orders
 * Prevents receiving more than ordered
 */
class RecordOrderReceiptRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        // Point Focal and Directors can receive orders
        return $this->user()->hasAnyRole(['point_focal', 'director']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'aggregated_order_id' => [
                'required',
                'integer',
                'exists:aggregated_orders,id',
                // Order must be in receivable state
                function ($attribute, $value, $fail) {
                    $order = AggregatedOrder::find($value);
                    if ($order && in_array($order->status, ['cancelled', 'draft'])) {
                        $fail("Order {$order->po_number} is in {$order->status} state and cannot receive items.");
                    }
                },
            ],
            'items' => [
                'required',
                'array',
                'min:1',
            ],
            'items.*.aggregated_order_item_id' => [
                'required',
                'integer',
                'exists:aggregated_order_items,id',
            ],
            'items.*.quantity_received' => [
                'required',
                'integer',
                'min:1',
                // Cannot exceed order line quantity
                function ($attribute, $value, $fail) {
                    // Extract array index to get the item
                    $matches = [];
                    if (preg_match('/items\.(\d+)\.quantity_received/', $attribute, $matches)) {
                        $index = $matches[1];
                        $itemId = $this->input("items.{$index}.aggregated_order_item_id");

                        if ($itemId) {
                            $orderItem = AggregatedOrderItem::find($itemId);
                            if ($orderItem && $value > $orderItem->getRemainingQuantity()) {
                                $remaining = $orderItem->getRemainingQuantity();
                                $fail(
                                    "Item cannot receive {$value} units. " .
                                    "Only {$remaining} remaining to receive."
                                );
                            }
                        }
                    }
                },
            ],
            'receipt_date' => [
                'nullable',
                'date',
                'before_or_equal:today',
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
            'aggregated_order_id.required' => 'Order is required.',
            'aggregated_order_id.exists' => 'The selected order does not exist.',
            'items.required' => 'At least one item quantity must be recorded.',
            'items.min' => 'At least one item quantity must be recorded.',
            'items.*.aggregated_order_item_id.required' => 'Item is required.',
            'items.*.aggregated_order_item_id.exists' => 'One or more items do not exist.',
            'items.*.quantity_received.required' => 'Quantity received is required.',
            'items.*.quantity_received.integer' => 'Quantity must be a whole number.',
            'items.*.quantity_received.min' => 'Quantity must be at least 1.',
            'receipt_date.date' => 'Receipt date must be a valid date.',
            'receipt_date.before_or_equal' => 'Receipt date cannot be in the future.',
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
        // Set default receipt date to today if not provided
        if (!$this->input('receipt_date')) {
            $this->merge([
                'receipt_date' => now()->toDateString(),
            ]);
        }
    }
}
