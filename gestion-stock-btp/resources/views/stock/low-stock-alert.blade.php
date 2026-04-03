@extends('layouts.app')

@section('title', 'Low Stock Alert')
@section('page-title', 'Low Stock Reorder Report')

@section('content')
<!-- Export Options -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="window.print()">
                    <i class="bi bi-printer"></i> Print Report
                </button>
                <a href="#" class="btn btn-sm btn-outline-secondary" id="exportCSV">
                    <i class="bi bi-download"></i> Export CSV
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Summary -->
<div class="row mb-4">
    <div class="col-md-4">
        <div class="card">
            <div class="card-body text-center">
                <h6 style="color: #666;">Items Below Threshold</h6>
                <h3 style="color: #f59e0b;">{{ $lowStockItems->count() }}</h3>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card">
            <div class="card-body text-center">
                <h6 style="color: #666;">Out of Stock</h6>
                @php
                    $outOfStock = $lowStockItems->where('current_stock', 0)->count();
                @endphp
                <h3 style="color: #dc3545;">{{ $outOfStock }}</h3>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card">
            <div class="card-body text-center">
                <h6 style="color: #666;">Estimated Reorder Cost</h6>
                @php
                    $estimatedCost = $lowStockItems->sum(function($item) {
                        $deficit = $item->reorder_threshold - $item->current_stock;
                        return max(0, $deficit) * $item->unit_price;
                    });
                @endphp
                <h3 style="color: #2563eb;">{{ number_format($estimatedCost, 0) }} XOF</h3>
            </div>
        </div>
    </div>
</div>

<!-- Items Table -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h6>Items Requiring Reorder</h6>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-sm" id="alertTable">
                        <thead style="background-color: #f8f9fa;">
                            <tr>
                                <th>Item Description</th>
                                <th class="text-center">Category</th>
                                <th class="text-center">Current Stock</th>
                                <th class="text-center">Reorder Threshold</th>
                                <th class="text-center">Shortage</th>
                                <th class="text-center">Unit Price</th>
                                <th class="text-center">Est. Cost</th>
                                <th class="text-center">Supplier</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($lowStockItems as $item)
                                @php
                                    $shortage = max(0, $item->reorder_threshold - $item->current_stock);
                                    $estimatedItemCost = $shortage * $item->unit_price;
                                @endphp
                                <tr>
                                    <td>
                                        <strong style="font-size: 13px;">{{ $item->description }}</strong>
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        <span class="badge bg-light text-dark">{{ $item->category->name }}</span>
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        <strong>{{ $item->current_stock }} {{ $item->unit_of_measure }}</strong>
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        {{ $item->reorder_threshold }} {{ $item->unit_of_measure }}
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        <span class="badge bg-danger">
                                            {{ $shortage }} {{ $item->unit_of_measure }}
                                        </span>
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        {{ number_format($item->unit_price, 2) }} XOF
                                    </td>
                                    <td class="text-center" style="font-size: 13px;">
                                        <strong style="color: #f59e0b;">{{ number_format($estimatedItemCost, 0) }} XOF</strong>
                                    </td>
                                    <td class="text-center" style="font-size: 12px;">
                                        <small>{{ $item->supplier->name }}</small>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                        <tfoot style="background-color: #f8f9fa; font-weight: bold;">
                            <tr>
                                <td colspan="6" class="text-end">TOTAL ESTIMATED COST:</td>
                                <td class="text-center" style="color: #2563eb; font-size: 14px;">
                                    {{ number_format($estimatedCost, 0) }} XOF
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Recommendations -->
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">Recommendations</div>
            <div class="card-body">
                <ul style="font-size: 13px;">
                    <li>
                        <strong>Immediate Action:</strong> Order {{ $lowStockItems->where('current_stock', '<=', 0)->count() }} items that are out of stock
                    </li>
                    <li>
                        <strong>Budget Impact:</strong> Allocate approximately {{ number_format($estimatedCost, 0) }} XOF for reorder
                    </li>
                    <li>
                        <strong>Supplier Consolidation:</strong> Group by supplier to optimize delivery costs
                    </li>
                    <li>
                        <strong>Lead Time:</strong> Consider supplier lead times when scheduling reorders
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Supplier Summary -->
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">By Supplier</div>
            <div class="card-body">
                @php
                    $bySupplier = $lowStockItems->groupBy('supplier.name');
                @endphp
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead style="background-color: #f8f9fa;">
                            <tr>
                                <th>Supplier</th>
                                <th class="text-center">Items to Order</th>
                                <th class="text-center">Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($bySupplier as $supplierName => $items)
                                @php
                                    $supplierCost = $items->sum(function($item) {
                                        $shortage = max(0, $item->reorder_threshold - $item->current_stock);
                                        return $shortage * $item->unit_price;
                                    });
                                @endphp
                                <tr>
                                    <td><strong>{{ $supplierName }}</strong></td>
                                    <td class="text-center">{{ $items->count() }}</td>
                                    <td class="text-center">{{ number_format($supplierCost, 0) }} XOF</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('exportCSV').addEventListener('click', function(e) {
    e.preventDefault();
    const table = document.getElementById('alertTable');
    let csv = [];
    
    // Get headers
    let headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        headers.push(th.textContent.trim());
    });
    csv.push(headers.join(','));
    
    // Get rows
    table.querySelectorAll('tbody tr').forEach(tr => {
        let row = [];
        tr.querySelectorAll('td').forEach(td => {
            row.push('"' + td.textContent.trim() + '"');
        });
        csv.push(row.join(','));
    });
    
    // Trigger download
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'low-stock-alert-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
});
</script>
@endsection
