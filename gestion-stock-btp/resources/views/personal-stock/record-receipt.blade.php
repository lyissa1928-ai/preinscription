@extends('layouts.app')

@section('title', 'Enregistrer une réception - ESEBAT')
@section('page-title', 'Enregistrer une réception')

@section('content')
<div class="row justify-content-center">
    <div class="col-lg-6">
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0">Enregistrer une réception — Mise à jour du stock</h6>
            </div>
            <div class="card-body">
                @if (session('success'))
                    <div class="alert alert-success alert-dismissible fade show">
                        {{ session('success') }}
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif
                @if ($errors->any())
                    <div class="alert alert-danger">
                        <ul class="mb-0">
                            @foreach ($errors->all() as $e)
                                <li>{{ $e }}</li>
                            @endforeach
                        </ul>
                        @if (session('article_suggestions') && count(session('article_suggestions')) > 0)
                            <p class="mb-1 mt-2"><strong>Articles existants dans cette catégorie :</strong></p>
                            <p class="mb-0 small">Saisissez exactement un des noms ci‑dessous, ou <a href="{{ route('referentiel.index', ['tab' => 'gestion', 'category_id' => old('category_id')]) }}">ajoutez l’article dans le référentiel</a> (Gestion des matériels) puis réessayez.</p>
                            <ul class="mb-0 mt-1 small">
                                @foreach (session('article_suggestions') as $suggestion)
                                    <li><code>{{ $suggestion }}</code></li>
                                @endforeach
                            </ul>
                        @endif
                    </div>
                @endif

                <p class="small text-muted mb-3">En tant que <strong>point focal</strong>, vous saisissez le matériel reçu. La <strong>catégorie</strong> doit déjà exister. Si l’article n’existe pas encore dans cette catégorie, il sera <strong>créé automatiquement dans le référentiel des matériels</strong> puis le stock sera enregistré. Logique : pas de blocage — la réception alimente le référentiel.</p>
                <form action="{{ route('personal-stock.store-receipt') }}" method="POST" id="form-receipt">
                    @csrf
                    <div class="mb-3">
                        <label for="category_id" class="form-label">Catégorie <span class="text-danger">*</span></label>
                        <select name="category_id" id="category_id" class="form-select" required>
                            <option value="">— Choisir une catégorie —</option>
                            @foreach ($categories as $cat)
                                <option value="{{ $cat->id }}" {{ old('category_id') == $cat->id ? 'selected' : '' }}>{{ $cat->name }}</option>
                            @endforeach
                        </select>
                        <small class="text-muted">La catégorie existe déjà dans le référentiel ; choisissez-la dans la liste.</small>
                    </div>
                    <div class="mb-3">
                        <label for="article_name" class="form-label">Article (catalogue) <span class="text-danger">*</span></label>
                        <input type="text" name="article_name" id="article_name" class="form-control" value="{{ old('article_name') }}" maxlength="255" placeholder="Ex. Bureau standard, Câble USB…" required>
                        <small class="text-muted">Nom ou désignation. Si l’article n’existe pas dans la catégorie, il sera créé dans le référentiel.</small>
                    </div>
                    <div class="mb-3">
                        <label for="quantity" class="form-label">Quantité reçue <span class="text-danger">*</span></label>
                        <input type="number" name="quantity" id="quantity" class="form-control" min="1" max="99999" value="{{ old('quantity', 1) }}" required>
                        <small class="text-muted">Cette quantité sera ajoutée au stock de l’article (contrôle des demandes en cas de rupture).</small>
                    </div>
                    <div class="mb-3">
                        <label for="unit_price" class="form-label">Prix unitaire (FCFA)</label>
                        <input type="number" name="unit_price" id="unit_price" class="form-control" min="0" step="1" value="{{ old('unit_price') }}" placeholder="Ex. 150000">
                        <small class="text-muted">Optionnel. S’il est renseigné, le référentiel des matériels (prix unitaire) sera mis à jour pour cet article.</small>
                    </div>
                    <div class="mb-3">
                        <label for="notes" class="form-label">Note (optionnel)</label>
                        <textarea name="notes" id="notes" class="form-control" rows="2" maxlength="1000">{{ old('notes') }}</textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">Enregistrer la réception</button>
                        <a href="{{ route('personal-stock.index') }}" class="btn btn-outline-secondary">Annuler</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
