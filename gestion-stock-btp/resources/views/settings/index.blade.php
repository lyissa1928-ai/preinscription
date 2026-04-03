@extends('layouts.app')

@section('title', 'Paramètres de l\'application - ESEBAT')
@section('page-title', 'Paramètres de l\'application')
@section('page-subtitle', 'Apparence et identité')

@section('content')
<div class="page-hero mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Paramètres de l'application</h1>
        <p class="page-hero-subtitle mb-0">Apparence, logo et identité visuelle</p>
    </div>
    <a href="{{ route('account.index') }}" class="btn btn-outline-secondary btn-sm"><i class="bi bi-gear me-1"></i> Retour à mes paramètres</a>
</div>
<div class="row justify-content-center">
    <div class="col-lg-8">
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white">
                <h5 class="mb-0"><i class="bi bi-gear me-2"></i> Apparence et identité</h5>
            </div>
            <div class="card-body">
                <form action="{{ route('settings.update') }}" method="POST" enctype="multipart/form-data">
                    @csrf

                    <div class="mb-4">
                        <label class="form-label fw-semibold">Couleur d'accent</label>
                        <select name="theme_color" class="form-select">
                            <option value="orange" {{ ($theme_color ?? 'orange') === 'orange' ? 'selected' : '' }}>Orange (sidebar, boutons, liens)</option>
                            <option value="blue" {{ ($theme_color ?? '') === 'blue' ? 'selected' : '' }}>Bleu</option>
                            <option value="green" {{ ($theme_color ?? '') === 'green' ? 'selected' : '' }}>Vert</option>
                        </select>
                        <small class="text-muted">Couleur de la barre latérale, des boutons et des liens.</small>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-semibold">Logo</label>
                        <small class="text-muted d-block mb-1">Vous pouvez aussi déposer <code>logo.png</code> ou <code>logo.svg</code> dans le dossier <code>public/</code> du projet : il sera utilisé sur toutes les pages.</small>
                        @if ($logoUrl ?? null)
                            <div class="mb-2">
                                <img src="{{ $logoUrl }}" alt="Logo" style="max-height: 48px;">
                            </div>
                        @endif
                        <input type="file" name="logo" class="form-control" accept=".png,.jpg,.jpeg,.svg,.webp">
                        <small class="text-muted">PNG, JPG, SVG ou WebP. Max 2 Mo.</small>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-semibold">Favicon</label>
                        <small class="text-muted d-block mb-1">Ou déposer <code>favicon.ico</code> ou <code>favicon.png</code> dans <code>public/</code>.</small>
                        @if ($faviconUrl ?? null)
                            <div class="mb-2">
                                <img src="{{ $faviconUrl }}" alt="Favicon" style="max-height: 32px;">
                            </div>
                        @endif
                        <input type="file" name="favicon" class="form-control" accept=".ico,.png,.svg">
                        <small class="text-muted">ICO, PNG ou SVG. Max 512 Ko.</small>
                    </div>

                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-check-lg me-1"></i> Enregistrer
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
