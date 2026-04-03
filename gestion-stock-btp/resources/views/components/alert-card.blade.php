@props(['type' => 'info', 'title' => null, 'dismissible' => true])

@php
    $types = [
        'info' => 'alert-info',
        'success' => 'alert-success',
        'warning' => 'alert-warning',
        'danger' => 'alert-danger',
    ];
    $alertClass = $types[$type] ?? 'alert-info';
@endphp

<div class="alert {{ $alertClass }} {{ $dismissible ? 'alert-dismissible fade show' : '' }}" role="alert">
    @if ($title)
        <strong>{{ $title }}</strong><br>
    @endif

    {{ $slot }}

    @if ($dismissible)
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
    @endif
</div>
