@extends('layouts.app')

@section('title', 'Purchase Order ' . $aggregatedOrder->po_number)
@section('page-title', 'Order ' . $aggregatedOrder->po_number)

@section('content')
<div class="row mb-3">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5>{{ $aggregatedOrder->po_number }}</h5>
                <small class="text-muted">Created: {{ $aggregatedOrder->created_at->format('M d, Y') }}</small>
            </div>
            <div>
                @if ($aggregatedOrder->status === 'draft')
                    <span class="badge bg-secondary" style="font-size: 14px;">Draft</span>
                @elseif ($aggregatedOrder->status === 'confirmed')
                    <span class="badge bg-info" style="font-size: 14px;">Confirmed</span>
                @elseif ($aggregatedOrder->status === 'received')
                    <span class="badge bg-success" style="font-size: 14px;">Received</span>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Order Details -->
<div class="row mb-4">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Order Details</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <th style="width: 40%;">Supplier</th>
                        <td>{{ $aggregatedOrder->supplier->name }}</td>
                    </tr>
                    <tr>
                        <th>Created By</th>
                        <td>{{ $aggregatedOrder->createdByUser->name }}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td>
                            @if ($aggregatedOrder->status === 'draft')
                                <span class="badge bg-secondary">Draft</span>
                            @elseif ($aggregatedOrder->status === 'confirmed')
                                <span class="badge bg-info">Confirmed</span>
                            @elseif ($aggregatedOrder->status === 'received')
                                <span class="badge bg-success">Received</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <th>Expected Delivery</th>
                        <td>{{ $aggregatedOrder->expected_delivery_date->format('M d, Y') }}</td>
                    </tr>
                    @if ($aggregatedOrder->confirmed_at)
                        <tr>
                            <th>Confirmed</th>
                            <td>{{ $aggregatedOrder->confirmed_at->format('M d, Y H:i') }}</td>
                        </tr>
                    @endif
                    @if ($aggregatedOrder->received_at)
                        <tr>
                            <th>Received</th>
                            <td>{{ $aggregatedOrder->received_at->format('M d, Y H:i') }}</td>
                        </tr>
                    @endif
                </table>
            </div>
        </div>
    </div>

    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Order Summary</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <th>Items</th>
                        <td><strong>{{ $aggregatedOrder->aggregatedOrderItems->count() }}</strong></td>
                    </tr>
                    <tr>
                        <th>Total Value</th>
                        <td><strong style="color: #2563eb; font-size: 16px;">{{ number_format($aggregatedOrder->getTotalValue(), 2) }} XOF</strong></td>
                    </tr>
                    <tr>
                        <th>Quantity Received</th>
                        <td>
                            @php
                                $totalOrdered = $aggregatedOrder->aggregatedOrderItems->sum('quantity_ordered');
                                $totalReceived = $aggregatedOrder->aggregatedOrderItems->sum('quantity_received');
                            @endphp
                            {{ $totalReceived }} / {{ $totalOrdered }}
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Order Items -->
<div class="card mb-4">
    <div class="card-header">Order Items ({{ $aggregatedOrder->aggregatedOrderItems->count() }})</div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th>Request</th>
                        <th>Item Description</th>
                        <th>Qty Ordered</th>
                        <th>Qty Received</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($aggregatedOrder->aggregatedOrderItems as $item)
                        <tr>
                            <td>
                                <small>
                                    <a href="{{ route('material-requests.show', $item->requestItem->materialRequest) }}" 
                                       class="text-decoration-none">
                                        {{ $item->requestItem->materialRequest->request_number }}
                                    </a>
                                </small>
                            </td>
                            <td>
                                <small>{{ $item->requestItem->item->description }}</small>
                            </td>
                            <td>
                                <small>{{ $item->quantity_ordered }} {{ $item->requestItem->item->unit_of_measure }}</small>
                            </td>
                            <td>
                                <small>{{ $item->quantity_received }} {{ $item->requestItem->item->unit_of_measure }}</small>
                            </td>
                            <td>
                                <small>{{ number_format($item->requestItem->unit_price ?? 0, 2) }} XOF</small>
                            </td>
                            <td>
                                <small>{{ number_format(($item->requestItem->unit_price ?? 0) * $item->quantity_ordered, 2) }} XOF</small>
                            </td>
                            <td>
                                @if ($item->quantity_received == 0)
                                    <span class="badge bg-warning text-dark" style="font-size: 11px;">Pending</span>
                                @elseif ($item->quantity_received < $item->quantity_ordered)
                                    <span class="badge bg-info" style="font-size: 11px;">Partial</span>
                                @else
                                    <span class="badge bg-success" style="font-size: 11px;">Complete</span>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" class="text-center text-muted py-3">No items in this order</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Action Buttons -->
<div class="card">
    <div class="card-body">
        <div class="d-flex gap-2 flex-wrap">
            @if ($aggregatedOrder->status === 'draft' && auth()->user()->can('confirm', $aggregatedOrder))
                <form action="{{ route('aggregated-orders.confirm', $aggregatedOrder) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-success"
                            onclick="return confirm('Confirmer cette commande ?')">
                        <i class="bi bi-check-circle"></i> Confirmer la commande
                    </button>
                </form>
            @endif

            @if ($aggregatedOrder->status === 'confirmed' && auth()->user()->can('receive', $aggregatedOrder))
                <a href="{{ route('aggregated-orders.receiveForm', $aggregatedOrder) }}" class="btn btn-sm btn-success">
                    <i class="bi bi-box-seam"></i> Enregistrer la réception
                </a>
            @endif

            @if ($aggregatedOrder->status !== 'received' && auth()->user()->can('cancel', $aggregatedOrder))
                <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#cancelModal">
                    <i class="bi bi-x-circle"></i> Annuler la commande
                </button>
            @endif

            <a href="{{ route('aggregated-orders.index') }}" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Retour
            </a>
        </div>
    </div>
</div>

<!-- Modal Annulation -->
@if ($aggregatedOrder->status !== 'received' && auth()->user()->can('cancel', $aggregatedOrder))
<div class="modal fade" id="cancelModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title">Annuler la commande</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form action="{{ route('aggregated-orders.cancel', $aggregatedOrder) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="cancellation_reason" class="form-label">Motif d'annulation</label>
                        <textarea class="form-control" id="cancellation_reason" name="cancellation_reason" rows="3" required></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Conserver la commande</button>
                    <button type="submit" class="btn btn-danger">Annuler la commande</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif
@endsection
