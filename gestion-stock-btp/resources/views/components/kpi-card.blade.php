@props(['label', 'value', 'icon' => null, 'color' => '#2563eb', 'subtext' => null])

<div class="card">
    <div class="card-body text-center">
        @if ($icon)
            <div style="font-size: 28px; color: {{ $color }}; margin-bottom: 10px;">
                <i class="bi bi-{{ $icon }}"></i>
            </div>
        @endif
        
        <h6 style="color: #666; margin-bottom: 8px;">{{ $label }}</h6>
        <h3 style="color: {{ $color }};margin-bottom: 0;">{{ $value }}</h3>
        
        @if ($subtext)
            <small style="color: #999; display: block; margin-top: 5px;">{{ $subtext }}</small>
        @endif
    </div>
</div>
