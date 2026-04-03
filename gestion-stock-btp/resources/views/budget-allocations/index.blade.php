@extends('layouts.app')

@section('title', 'Budget Allocations')
@section('page-title', 'Budget Allocations')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <h5>Department Budget Allocations</h5>
    </div>
</div>

<!-- Filter by Campus  -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <form method="GET" class="d-flex gap-2 align-items-center">
                    <label for="campus_filter" class="form-label mb-0">Filter by Campus:</label>
                    <select class="form-select" name="campus_id" id="campus_filter" onchange="this.form.submit()" style="max-width: 300px;">
                        <option value="">-- All Campuses --</option>
                        @foreach ($campuses as $campus)
                            <option value="{{ $campus->id }}" {{ request('campus_id') == $campus->id ? 'selected' : '' }}>
                                {{ $campus->name }}
                            </option>
                        @endforeach
                    </select>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Allocations List -->
@forelse ($allocations->groupBy('budget.campus_id') as $campusAllocations)
    <div class="card mb-3">
        <div class="card-header">
            <strong>{{ $campusAllocations->first()->budget->campus->name }}</strong> 
            <span class="badge bg-light text-dark">FY {{ $campusAllocations->first()->budget->fiscal_year }}</span>
        </div>
        <div class="card-body">
            @php
                $campusTotal = $campusAllocations->sum('allocated_amount');
                $campusSpent = $campusAllocations->sum('spent_amount');
                $campusUtilization = $campusTotal > 0 ? ($campusSpent / $campusTotal) * 100 : 0;
            @endphp

            <!-- Campus Summary -->
            <div class="row mb-3 p-2 bg-light rounded">
                <div class="col-md-3">
                    <small style="color: #666;">Total Allocated</small><br>
                    <strong style="font-size: 16px; color: #2563eb;">{{ number_format($campusTotal, 0) }} XOF</strong>
                </div>
                <div class="col-md-3">
                    <small style="color: #666;">Total Spent</small><br>
                    <strong style="font-size: 16px; color: #f59e0b;">{{ number_format($campusSpent, 0) }} XOF</strong>
                </div>
                <div class="col-md-3">
                    <small style="color: #666;">Remaining</small><br>
                    <strong style="font-size: 16px; color: #059669;">{{ number_format($campusTotal - $campusSpent, 0) }} XOF</strong>
                </div>
                <div class="col-md-3">
                    <small style="color: #666;">Utilization</small><br>
                    <strong style="font-size: 16px; color: #2563eb;">{{ number_format($campusUtilization, 1) }}%</strong>
                </div>
            </div>

            <!-- Departments -->
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead style="background-color: #f8f9fa;">
                        <tr>
                            <th>Department</th>
                            <th class="text-center">Allocated</th>
                            <th class="text-center">Spent</th>
                            <th class="text-center">Remaining</th>
                            <th class="text-center">Usage %</th>
                            <th>Progress</th>
                            <th class="text-end">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($campusAllocations as $allocation)
                            @php
                                $remaining = $allocation->allocated_amount - $allocation->spent_amount;
                                $usage = $allocation->allocated_amount > 0 ? ($allocation->spent_amount / $allocation->allocated_amount) * 100 : 0;
                                $barColor = $usage >= 90 ? '#dc3545' : ($usage >= 75 ? '#ffc107' : '#198754');
                            @endphp
                            <tr>
                                <td>
                                    <strong style="font-size: 13px;">{{ $allocation->department->name }}</strong>
                                </td>
                                <td class="text-center" style="font-size: 13px;">
                                    {{ number_format($allocation->allocated_amount, 0) }}
                                </td>
                                <td class="text-center" style="font-size: 13px;">
                                    {{ number_format($allocation->spent_amount, 0) }}
                                </td>
                                <td class="text-center" style="font-size: 13px;">
                                    <strong style="color: {{ $remaining >= 0 ? '#198754' : '#dc3545' }};">
                                        {{ number_format($remaining, 0) }}
                                    </strong>
                                </td>
                                <td class="text-center" style="font-size: 13px;">
                                    <strong>{{ number_format($usage, 1) }}%</strong>
                                </td>
                                <td>
                                    <div class="progress" style="height: 20px;">
                                        <div class="progress-bar" style="width: {{ min($usage, 100) }}%; background-color: {{ $barColor }};"></div>
                                    </div>
                                </td>
                                <td class="text-end">
                                    <a href="{{ route('budget-allocations.show', $allocation) }}" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
@empty
    <div class="card">
        <div class="card-body text-center py-5">
            <p class="text-muted">No budget allocations found</p>
        </div>
    </div>
@endforelse
@endsection
