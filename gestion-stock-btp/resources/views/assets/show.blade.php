@extends('layouts.app')

@section('title', 'Asset ' . $asset->serial_number)
@section('page-title', $asset->serial_number)

@section('content')
<div class="row mb-3">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5>{{ $asset->serial_number }}</h5>
                <small class="text-muted">{{ $asset->description }}</small>
            </div>
            <div>
                @if ($asset->lifecycle_status === 'en_service')
                    <span class="badge bg-success" style="font-size: 14px;">In Service</span>
                @elseif ($asset->lifecycle_status === 'maintenance')
                    <span class="badge bg-warning text-dark" style="font-size: 14px;">In Maintenance</span>
                @elseif ($asset->lifecycle_status === 'reformé')
                    <span class="badge bg-danger" style="font-size: 14px;">Decommissioned</span>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Asset Details -->
<div class="row mb-4">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Asset Information</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <th style="width: 40%;">Serial Number</th>
                        <td><strong>{{ $asset->serial_number }}</strong></td>
                    </tr>
                    <tr>
                        <th>Category</th>
                        <td>{{ $asset->category->name }}</td>
                    </tr>
                    <tr>
                        <th>Description</th>
                        <td>{{ $asset->description }}</td>
                    </tr>
                    <tr>
                        <th>Acquisition Date</th>
                        <td>{{ $asset->acquisition_date->format('M d, Y') }}</td>
                    </tr>
                    <tr>
                        <th>Acquisition Cost</th>
                        <td>{{ number_format($asset->acquisition_cost, 2) }} XOF</td>
                    </tr>
                    @if ($asset->warranty_expiry)
                        <tr>
                            <th>Warranty Expiry</th>
                            <td>
                                {{ $asset->warranty_expiry->format('M d, Y') }}
                                @if ($asset->warranty_expiry < now())
                                    <span class="badge bg-danger" style="font-size: 11px;">Expired</span>
                                @else
                                    <span class="badge bg-success" style="font-size: 11px;">Active</span>
                                @endif
                            </td>
                        </tr>
                    @endif
                </table>
            </div>
        </div>
    </div>

    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Location & Status</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <th style="width: 40%;">Current Campus</th>
                        <td>{{ $asset->currentCampus->name ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Current Warehouse</th>
                        <td>{{ $asset->currentWarehouse->name ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td>
                            @if ($asset->lifecycle_status === 'en_service')
                                <span class="badge bg-success">In Service</span>
                            @elseif ($asset->lifecycle_status === 'maintenance')
                                <span class="badge bg-warning text-dark">In Maintenance</span>
                            @elseif ($asset->lifecycle_status === 'reformé')
                                <span class="badge bg-danger">Decommissioned</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <th>Last Updated</th>
                        <td>{{ $asset->updated_at->format('M d, Y H:i') }}</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Maintenance Tickets -->
@if ($asset->lifecycle_status !== 'reformé')
<div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span>Maintenance Tickets ({{ $asset->maintenanceTickets->count() }})</span>
        @if ($asset->lifecycle_status === 'en_service' && auth()->user()->can('maintain', $asset))
            <button class="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#maintenanceModal">
                <i class="bi bi-tools"></i> Send to Maintenance
            </button>
        @elseif ($asset->lifecycle_status === 'maintenance' && auth()->user()->can('maintain', $asset))
            <form action="{{ route('assets.recallFromMaintenance', $asset) }}" method="POST" style="display: inline;">
                @csrf
                <button type="submit" class="btn btn-sm btn-success"
                        onclick="return confirm('Recall from maintenance?')">
                    <i class="bi bi-arrow-counterclockwise"></i> Recall from Maintenance
                </button>
            </form>
        @endif
    </div>
    <div class="card-body">
        @forelse ($asset->maintenanceTickets as $ticket)
            <div class="border-bottom py-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong style="font-size: 13px;">{{ $ticket->title }}</strong>
                        <div style="font-size: 12px; color: #666;">
                            {{ $ticket->description }}
                        </div>
                    </div>
                    <div>
                        @if ($ticket->status === 'open')
                            <span class="badge bg-warning text-dark" style="font-size: 11px;">Open</span>
                        @elseif ($ticket->status === 'in_progress')
                            <span class="badge bg-info" style="font-size: 11px;">In Progress</span>
                        @elseif ($ticket->status === 'resolved')
                            <span class="badge bg-success" style="font-size: 11px;">Resolved</span>
                        @elseif ($ticket->status === 'closed')
                            <span class="badge bg-secondary" style="font-size: 11px;">Closed</span>
                        @endif
                    </div>
                </div>
            </div>
        @empty
            <p class="text-muted text-center py-3">No maintenance tickets</p>
        @endforelse
    </div>
</div>
@endif

<!-- Action Buttons -->
<div class="card">
    <div class="card-body">
        <div class="d-flex gap-2 flex-wrap">
            @if ($asset->lifecycle_status === 'en_service' && auth()->user()->can('transfer', $asset))
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#transferModal">
                    <i class="bi bi-arrow-left-right"></i> Transfer Asset
                </button>
            @endif

            @if ($asset->lifecycle_status !== 'reformé' && auth()->user()->can('decommission', $asset))
                <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#decommissionModal">
                    <i class="bi bi-archive"></i> Decommission
                </button>
            @endif

            <a href="{{ route('assets.index') }}" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Retour
            </a>
        </div>
    </div>
</div>

<!-- Transfer Modal -->
@if ($asset->lifecycle_status === 'en_service' && auth()->user()->can('transfer', $asset))
<div class="modal fade" id="transferModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title">Transfer Asset</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form action="{{ route('assets.transfer', $asset) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="target_campus_id" class="form-label">Target Campus</label>
                        <select class="form-select" id="target_campus_id" name="target_campus_id" required 
                                onchange="updateWarehouses(this.value)">
                            <option value="">-- Select Campus --</option>
                            @foreach ($campuses as $campus)
                                <option value="{{ $campus->id }}">{{ $campus->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="target_warehouse_id" class="form-label">Target Warehouse</label>
                        <select class="form-select" id="target_warehouse_id" name="target_warehouse_id" required>
                            <option value="">-- Select Warehouse --</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="transfer_reason" class="form-label">Transfer Reason</label>
                        <textarea class="form-control" id="transfer_reason" name="transfer_reason" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Transfer</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif

<!-- Maintenance Modal -->
@if ($asset->lifecycle_status === 'en_service' && auth()->user()->can('maintain', $asset))
<div class="modal fade" id="maintenanceModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title">Send to Maintenance</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form action="{{ route('assets.sendToMaintenance', $asset) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="maintenance_reason" class="form-label">Reason for Maintenance</label>
                        <textarea class="form-control" id="maintenance_reason" name="maintenance_reason" rows="3" required></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-warning">Send to Maintenance</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif

<!-- Decommission Modal -->
@if ($asset->lifecycle_status !== 'reformé' && auth()->user()->can('decommission', $asset))
<div class="modal fade" id="decommissionModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title">Decommission Asset</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form action="{{ route('assets.decommission', $asset) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <strong>Attention :</strong> Cet actif sera marqué comme réformé et ne pourra plus être utilisé.
                    </div>
                    <div class="mb-3">
                        <label for="decommission_reason" class="form-label">Reason for Decommissioning</label>
                        <textarea class="form-control" id="decommission_reason" name="decommission_reason" rows="3" required></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-danger">Decommission</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif

<script>
const warehouseData = @json($warehouses);

function updateWarehouses(campusId) {
    const warehouseSelect = document.getElementById('target_warehouse_id');
    warehouseSelect.innerHTML = '<option value="">-- Select Warehouse --</option>';

    if (campusId) {
        const campusWarehouses = warehouseData.filter(w => w.campus_id == campusId);
        campusWarehouses.forEach(warehouse => {
            const option = document.createElement('option');
            option.value = warehouse.id;
            option.textContent = warehouse.name;
            warehouseSelect.appendChild(option);
        });
    }
}
</script>
@endsection
