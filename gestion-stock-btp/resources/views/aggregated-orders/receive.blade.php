@extends('layouts.app')

@section('title', 'Record Receipt - ' . $aggregatedOrder->po_number)
@section('page-title', 'Record Receipt from ' . $aggregatedOrder->supplier->name)

@section('content')
<div class="row">
    <div class="col-lg-10">
        <div class="card">
            <div class="card-header">Record Order Receipt</div>
            <div class="card-body">
                @if ($errors->any())
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Erreur :</strong> Veuillez corriger les champs ci-dessous.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                <form action="{{ route('aggregated-orders.receive', $aggregatedOrder) }}" method="POST" id="receiveForm">
                    @csrf

                    <div class="mb-4">
                        <h6>Items to Receive</h6>
                        <p class="text-muted">Enter the quantities received for each item</p>

                        <div class="table-responsive">
                            <table class="table table-sm table-bordered" style="margin-bottom: 0;">
                                <thead style="background-color: #f8f9fa;">
                                    <tr>
                                        <th width="35%">Item Description</th>
                                        <th width="15%" class="text-center">Qty Ordered</th>
                                        <th width="15%" class="text-center">Unit</th>
                                        <th width="20%" class="text-center">Qty Received</th>
                                        <th width="15%" class="text-center">Remaining</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @forelse ($aggregatedOrder->aggregatedOrderItems as $item)
                                        @php
                                            $remaining = $item->quantity_ordered - $item->quantity_received;
                                        @endphp
                                        <tr>
                                            <td>
                                                <input type="hidden" 
                                                       name="items[{{ $item->id }}][aggregated_order_item_id]"
                                                       value="{{ $item->id }}">
                                                <strong style="font-size: 13px;">
                                                    {{ $item->requestItem->item->description }}
                                                </strong><br>
                                                <small class="text-muted">
                                                    Request: {{ $item->requestItem->materialRequest->request_number }}
                                                </small>
                                            </td>
                                            <td class="text-center">
                                                {{ $item->quantity_ordered }}
                                            </td>
                                            <td class="text-center">
                                                <small>{{ $item->requestItem->item->unit_of_measure }}</small>
                                            </td>
                                            <td>
                                                <input type="number" 
                                                       class="form-control form-control-sm qty-input"
                                                       name="items[{{ $item->id }}][quantity_received]"
                                                       min="0" 
                                                       max="{{ $remaining }}"
                                                       value="{{ old('items.' . $item->id . '.quantity_received', 0) }}"
                                                       data-remaining="{{ $remaining }}"
                                                       data-ordered="{{ $item->quantity_ordered }}"
                                                       required
                                                       style="text-align: center; font-size: 13px;">
                                                <small class="form-text text-muted d-block">
                                                    Max: {{ $remaining }}
                                                </small>
                                            </td>
                                            <td class="text-center">
                                                <span class="remaining-qty">{{ $remaining }}</span>
                                            </td>
                                        </tr>
                                    @empty
                                        <tr>
                                            <td colspan="5" class="text-center text-muted py-3">No items to receive</td>
                                        </tr>
                                    @endforelse
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="receipt_date" class="form-label">Receipt Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control @error('receipt_date') is-invalid @enderror" 
                               id="receipt_date" name="receipt_date" 
                               value="{{ old('receipt_date', now()->format('Y-m-d')) }}" required>
                        @error('receipt_date')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="notes" class="form-label">Receiving Notes</label>
                        <textarea class="form-control @error('notes') is-invalid @enderror" 
                                  id="notes" name="notes" rows="3" 
                                  placeholder="e.g., Items damaged, partial delivery, etc.">{{ old('notes') }}</textarea>
                        @error('notes')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-success">
                            <i class="bi bi-check-circle"></i> Record Receipt
                        </button>
                        <a href="{{ route('aggregated-orders.show', $aggregatedOrder) }}" class="btn btn-outline-secondary">
                            <i class="bi bi-x-circle"></i> Annuler
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Sidebar: Summary -->
    <div class="col-lg-2">
        <div class="card">
            <div class="card-header">Summary</div>
            <div class="card-body">
                <table class="table table-sm table-borderless" style="font-size: 13px;">
                    <tr>
                        <th>Total Items</th>
                        <td><strong>{{ $aggregatedOrder->aggregatedOrderItems->count() }}</strong></td>
                    </tr>
                    <tr>
                        <th>Order Value</th>
                        <td><strong>{{ number_format($aggregatedOrder->getTotalValue(), 0) }} XOF</strong></td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td><span class="badge bg-info">{{ ucfirst($aggregatedOrder->status) }}</span></td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="card mt-3">
            <div class="card-header">Instructions</div>
            <div class="card-body" style="font-size: 12px;">
                <ol style="padding-left: 18px;">
                    <li>Enter quantity received for each item</li>
                    <li>Do not exceed qty ordered</li>
                    <li>Ajouter des notes si besoin</li>
                    <li>Click Record Receipt</li>
                </ol>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const qtyInputs = document.querySelectorAll('.qty-input');

    qtyInputs.forEach(input => {
        input.addEventListener('change', function() {
            const remaining = parseInt(this.dataset.remaining);
            const value = parseInt(this.value) || 0;

            if (value > remaining) {
                this.value = remaining;
                alert('Cannot exceed ordered quantity');
            }

            if (value < 0) {
                this.value = 0;
            }

            // Update remaining display
            const remainingQty = remaining - value;
            this.parentElement.parentElement.querySelector('.remaining-qty').textContent = remainingQty;
        });
    });
});
</script>
@endsection
