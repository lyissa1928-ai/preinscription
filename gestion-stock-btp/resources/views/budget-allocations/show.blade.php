@extends('layouts.app')

@section('title', 'Allocation - ' . $allocation->department->name)
@section('page-title', $allocation->department->name . ' Budget Allocation')

@section('content')
<div class="row mb-3">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5>{{ $allocation->department->name }}</h5>
                <small class="text-muted">Campus: {{ $allocation->budget->campus->name }} | FY {{ $allocation->budget->fiscal_year }}</small>
            </div>
        </div>
    </div>
</div>

<!-- Allocation Overview -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Allocated</small>
                <h4 style="color: #2563eb;">{{ number_format($allocation->allocated_amount, 0) }} XOF</h4>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Spent</small>
                <h4 style="color: #f59e0b;">{{ number_format($allocation->spent_amount, 0) }} XOF</h4>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Remaining</small>
                @php
                    $remaining = $allocation->allocated_amount - $allocation->spent_amount;
                    $remainingColor = $remaining >= 0 ? '#198754' : '#dc3545';
                @endphp
                <h4 style="color: {{ $remainingColor }};">{{ number_format($remaining, 0) }} XOF</h4>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-body text-center">
                <small class="text-muted">Usage</small>
                @php
                    $usage = $allocation->allocated_amount > 0 ? ($allocation->spent_amount / $allocation->allocated_amount) * 100 : 0;
                @endphp
                <h4 style="color: #2563eb;">{{ number_format($usage, 1) }}%</h4>
            </div>
        </div>
    </div>
</div>

<!-- Usage Bar -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <div class="progress" style="height: 30px;">
                    <div class="progress-bar" 
                         style="width: {{ min($usage, 100) }}%; 
                                background-color: {{ $usage >= 90 ? '#dc3545' : ($usage >= 75 ? '#ffc107' : '#198754') }};">
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Expenses -->
<div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span>Recorded Expenses ({{ $allocation->expenses->count() }})</span>
        @if ($allocation->getRemainingAmount() > 0 && auth()->user()->can('recordExpense', $allocation))
            <a href="{{ route('budget-allocations.recordExpenseForm', $allocation) }}" class="btn btn-sm btn-success">
                <i class="bi bi-plus-circle"></i> Record Expense
            </a>
        @endif
    </div>
    <div class="card-body">
        @forelse ($allocation->expenses as $expense)
            <div class="row align-items-center border-bottom py-3">
                <div class="col-md-4">
                    <div>
                        <strong style="font-size: 13px;">{{ $expense->expense_category }}</strong>
                        <div style="font-size: 12px; color: #666;">
                            {{ $expense->description }}
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div style="font-size: 13px;">
                        <strong>Amount:</strong> {{ number_format($expense->amount, 0) }} XOF
                    </div>
                </div>
                <div class="col-md-2">
                    <div style="font-size: 13px;">
                        <strong>Date:</strong> {{ $expense->expense_date->format('M d, Y') }}
                    </div>
                </div>
                <div class="col-md-2">
                    <div>
                        @if ($expense->status === 'pending')
                            <span class="badge bg-warning text-dark">Pending</span>
                        @elseif ($expense->status === 'approved')
                            <span class="badge bg-success">Approved</span>
                        @elseif ($expense->status === 'reconciled')
                            <span class="badge bg-info">Reconciled</span>
                        @endif
                    </div>
                </div>
                <div class="col-md-2 text-end">
                    @if ($expense->status === 'pending' && auth()->user()->can('approveExpense', $allocation))
                        <form action="{{ route('budget-allocations.approveExpense', $expense) }}" method="POST" style="display: inline;">
                            @csrf
                            <button type="submit" class="btn btn-sm btn-outline-success" 
                                    onclick="return confirm('Approve this expense?')">
                                <i class="bi bi-check"></i>
                            </button>
                        </form>
                    @endif
                </div>
            </div>
        @empty
            <div class="text-center py-4">
                <p class="text-muted">No expenses recorded yet</p>
            </div>
        @endforelse
    </div>
</div>

<!-- Action Buttons -->
<div class="card">
    <div class="card-body">
        <div class="d-flex gap-2 flex-wrap">
            <a href="{{ route('budget-allocations.index') }}" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Retour aux allocations
            </a>
        </div>
    </div>
</div>
@endsection
