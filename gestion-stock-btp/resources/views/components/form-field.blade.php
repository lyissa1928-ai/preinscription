@props(['label', 'name', 'type' => 'text', 'value' => null, 'required' => false, 'placeholder' => null, 'error' => null, 'hint' => null])

<div class="mb-3">
    <label for="{{ $name }}" class="form-label">
        {{ $label }}
        @if ($required)
            <span class="text-danger">*</span>
        @endif
    </label>
    
    @if ($type === 'textarea')
        <textarea class="form-control @error($name) is-invalid @enderror"
                  id="{{ $name }}" name="{{ $name }}"
                  placeholder="{{ $placeholder }}"
                  {{ $required ? 'required' : '' }}
                  rows="4">{{ old($name, $value) }}</textarea>
    @elseif ($type === 'select')
        <select class="form-select @error($name) is-invalid @enderror"
                id="{{ $name }}" name="{{ $name }}"
                {{ $required ? 'required' : '' }}>
            <option value="">— Choisir —</option>
            {{ $slot }}
        </select>
    @else
        <input type="{{ $type }}"
               class="form-control @error($name) is-invalid @enderror"
               id="{{ $name }}" name="{{ $name }}"
               value="{{ old($name, $value) }}"
               placeholder="{{ $placeholder }}"
               {{ $required ? 'required' : '' }}>
    @endif
    
    @error($name)
        <div class="invalid-feedback d-block">{{ $message }}</div>
    @enderror
    
    @if ($hint)
        <small class="form-text text-muted d-block mt-1">{{ $hint }}</small>
    @endif
</div>
