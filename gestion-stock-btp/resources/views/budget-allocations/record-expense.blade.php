@extends('layouts.app')

@section('title', 'Record Expense - ' . $allocation->department->name)
@section('page-title', 'Record Expense')

@section('content')
<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">Record Expense for {{ $allocation->department->name }}</div>
            <div class="card-body">
                @if ($errors->any())
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Erreur :</strong> Veuillez corriger les champs ci-dessous.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                <form action="{{ route('budget-allocations.recordExpense', $allocation) }}" method="POST">
                    @csrf

                    <div class="mb-3">
                        <label for="expense_category" class="form-label">Expense Category <span class="text-danger">*</span></label>
                        <select class="form-select @error('expense_category') is-invalid @enderror" 
                                id="expense_category" name="expense_category" required>
                            <option value="">-- Select Category --</option>
                            <option value="Materials" {{ old('expense_category') === 'Materials' ? 'selected' : '' }}>Materials</option>
                            <option value="Labor" {{ old('expense_category') === 'Labor' ? 'selected' : '' }}>Labor</option>
                            <option value="Services" {{ old('expense_category') === 'Services' ? 'selected' : '' }}>Services</option>
                            <option value="Utilities" {{ old('expense_category') === 'Utilities' ? 'selected' : '' }}>Utilities</option>
                            <option value="Maintenance" {{ old('expense_category') === 'Maintenance' ? 'selected' : '' }}>Maintenance</option>
                            <option value="Other" {{ old('expense_category') === 'Other' ? 'selected' : '' }}>Other</option>
                        </select>
                        @error('expense_category')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="amount" class="form-label">Amount <span class="text-danger">*</span></label>
                        <div class="input-group">
                            <input type="number" class="form-control @error('amount') is-invalid @enderror" 
                                   id="amount" name="amount" 
                                   value="{{ old('amount') }}" 
                                   placeholder="0.00" step="0.01" min="0" required>
                            <span class="input-group-text">XOF</span>
                        </div>
                        @error('amount')
                            <div class="invalid-feedback d-block">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description <span class="text-danger">*</span></label>
                        <textarea class="form-control @error('description') is-invalid @enderror" 
                                  id="description" name="description" rows="3" required>{{ old('description') }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="expense_date" class="form-label">Expense Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control @error('expense_date') is-invalid @enderror" 
                               id="expense_date" name="expense_date" 
                               value="{{ old('expense_date', now()->format('Y-m-d')) }}" required>
                        @error('expense_date')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="aggregated_order_id" class="form-label">Related Purchase Order (Optional)</label>
                        <select class="form-select @error('aggregated_order_id') is-invalid @enderror" 
                                id="aggregated_order_id" name="aggregated_order_id">
                            <option value="">-- Select Order (if applicable) --</option>
                            @foreach ($purchaseOrders as $order)
                                <option value="{{ $order->id }}" {{ old('aggregated_order_id') == $order->id ? 'selected' : '' }}>
                                    {{ $order->po_number }} - {{ $order->supplier->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('aggregated_order_id')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-success">
                            <i class="bi bi-check-circle"></i> Record Expense
                        </button>
                        <a href="{{ route('budget-allocations.show', $allocation) }}" class="btn btn-outline-secondary">
                            <i class="bi bi-x-circle"></i> Cancel
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Infos budget -->
    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">Allocation Summary</div>
            <div class="card-body">
                <table class="table table-sm table-borderless" style="font-size: 13px;">
                    <tr>
                        <th>Campus</th>
                        <td>{{ $allocation->budget->campus->name }}</td>
                    </tr>
                    <tr>
                        <th>Department</th>
                        <td>{{ $allocation->department->name }}</td>
                    </tr>
                    <tr>
                        <th>Allocated</th>
                        <td><strong>{{ number_format($allocation->allocated_amount, 0) }} XOF</strong></td>
                    </tr>
                    <tr>
                        <th>Spent</th>
                        <td><strong>{{ number_format($allocation->spent_amount, 0) }} XOF</strong></td>
                    </tr>
                    <tr>
                        <th>Remaining</th>
                        @php
                            $remaining = $allocation->getRemainingAmount();
                        @endphp
                        <td><strong style="color: {{ $remaining >= 0 ? '#198754' : '#dc3545' }};">
                            {{ number_format($remaining, 0) }} XOF
                        </strong></td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="card mt-3">
            <div class="card-header">Instructions</div>
            <div class="card-body" style="font-size: 12px;">
                <ol style="padding-left: 18px;">
                    <li>Select expense category</li>
                    <li>Enter amount (max: {{ number_format($remaining, 0) }} XOF)</li>
                    <li>Renseigner la description</li>
                    <li>Link to PO if applicable</li>
                    <li>Click Record Expense</li>
                </ol>

                <hr>

                <div class="alert alert-info" style="font-size: 11px;">
                    <strong>Status:</strong> After recording, expense must be approved by manager
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
