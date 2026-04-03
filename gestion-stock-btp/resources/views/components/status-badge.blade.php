@props(['status', 'size' => 'md'])

@php
    $badgeClasses = [
        'draft' => 'bg-secondary',
        'submitted' => 'bg-warning text-dark',
        'approved' => 'bg-success',
        'aggregated' => 'bg-info',
        'received' => 'bg-success',
        'pending' => 'bg-secondary',
        'confirmed' => 'bg-info',
        'in_progress' => 'bg-info',
        'resolved' => 'bg-success',
        'closed' => 'bg-secondary',
        'open' => 'bg-danger',
        'in_service' => 'bg-success',
        'maintenance' => 'bg-warning text-dark',
        'reformé' => 'bg-danger',
        'decommissioned' => 'bg-danger',
        'active' => 'bg-success',
    ];

    $badgeClass = $badgeClasses[$status] ?? 'bg-secondary';
    $fontSize = $size === 'sm' ? 'font-size: 11px;' : ($size === 'lg' ? 'font-size: 15px;' : 'font-size: 13px;');
    $label = ucfirst(str_replace('_', ' ', $status));
@endphp

<span class="badge {{ $badgeClass }}" style="{{ $fontSize }}">{{ $label }}</span>
