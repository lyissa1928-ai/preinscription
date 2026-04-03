@props(['percentage', 'label' => null, 'showPercentage' => true])

@php
    $barColor = $percentage >= 90 ? '#dc3545' : ($percentage >= 75 ? '#ffc107' : '#198754');
@endphp

<div>
    @if ($label || $showPercentage)
        <div class="d-flex justify-content-between align-items-center mb-2">
            @if ($label)
                <strong style="font-size: 13px;">{{ $label }}</strong>
            @endif
            @if ($showPercentage)
                <span style="color: {{ $barColor }}; font-weight: bold;">{{ number_format($percentage, 1) }}%</span>
            @endif
        </div>
    @endif
    
    <div class="progress" style="height: 22px;">
        <div class="progress-bar" 
             style="width: {{ min($percentage, 100) }}%; 
                    background-color: {{ $barColor }};
                    transition: width 0.3s ease;">
        </div>
    </div>
</div>
