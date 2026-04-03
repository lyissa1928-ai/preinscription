@extends('layouts.app')

@section('title', (($canEdit ?? true) ? 'Enregistrer la réception' : 'Réception (lecture seule)') . ' – ' . $materialRequest->request_number . ' - ESEBAT')
@section('page-title', ($canEdit ?? true) ? 'Enregistrer la réception' : 'Réception – Lecture seule')

@section('content')
<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Demande {{ $materialRequest->request_number }} – Réception du matériel @if (!($canEdit ?? true))<span class="badge bg-secondary ms-2">Lecture seule</span>@endif</h6>
        <a href="{{ route('material-requests.show', $materialRequest) }}" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> Retour à la demande
        </a>
    </div>
    <div class="card-body">
        @if ($canEdit ?? true)
        <div class="alert alert-light border mb-4">
            <strong><i class="bi bi-info-circle me-1"></i> Règle à ce stade :</strong><br>
            <span class="text-dark">Constatez uniquement la quantité effectivement reçue (livrée) pour chaque ligne. Pour une réception complète, la quantité reçue est égale à la quantité demandée.</span>
        </div>
        @else
        <div class="alert alert-info border mb-4">
            <i class="bi bi-eye me-1"></i> Consultation de la réception enregistrée par le demandeur.
        </div>
        @endif

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
            </div>
        @endif

        @if ($canEdit ?? true)
        <form action="{{ route('material-requests.store-storage', $materialRequest) }}" method="POST" id="form-store-storage">
            @csrf
        @endif
            <div class="table-responsive">
                <table class="table table-bordered align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>Catégorie</th>
                            <th>Matériel</th>
                            <th class="text-center">Quantité demandée</th>
                            <th class="text-center">Quantité reçue</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($materialRequest->requestItems as $item)
                            <tr>
                                <td>{{ $item->item?->category?->name ?? ($item->item_id ? '—' : 'Non répertorié') }}</td>
                                <td>
                                    <strong>{{ $item->display_label }}</strong>
                                    @if ($item->item?->unit_of_measure)
                                        <small class="text-muted">({{ $item->item->unit_of_measure }})</small>
                                    @endif
                                </td>
                                <td class="text-center">{{ $item->requested_quantity }}</td>
                                <td class="text-center">
                                    @if ($canEdit ?? true)
                                        @php
                                            $defaultQty = ($item->quantity_received > 0) ? $item->quantity_received : $item->requested_quantity;
                                        @endphp
                                        <input type="number" name="items[{{ $item->id }}][quantity_received]"
                                               class="form-control form-control-sm text-center"
                                               value="{{ old("items.{$item->id}.quantity_received", $defaultQty) }}"
                                               min="0" max="{{ $item->requested_quantity }}">
                                    @else
                                        {{ $item->quantity_received ?? 0 }}
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if ($canEdit ?? true)
            <div class="d-flex gap-2 mt-3">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-check-lg"></i> Enregistrer la réception
                </button>
                <a href="{{ route('material-requests.show', $materialRequest) }}" class="btn btn-outline-secondary">Annuler</a>
            </div>
        </form>
            @else
            <div class="mt-3">
                <a href="{{ route('material-requests.show', $materialRequest) }}" class="btn btn-outline-secondary">Retour à la demande</a>
            </div>
            @endif
    </div>
</div>
@endsection
