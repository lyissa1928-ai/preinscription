@extends('layouts.app')

@section('title', 'Bons de sortie - ESEBAT')
@section('page-title', 'Bons de sortie')
@section('page-subtitle', 'Traçabilité des livraisons et distributions')

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Bons de sortie</h1>
        <p class="page-hero-subtitle mb-0">Consultation des bons générés après chaque livraison ou distribution</p>
    </div>
</div>

<form method="GET" class="card mb-4">
    <div class="card-header"><i class="bi bi-funnel"></i> Filtres</div>
    <div class="card-body row g-3 align-items-end">
        <div class="col-md-3">
            <label for="type" class="form-label">Type</label>
            <select name="type" id="type" class="form-select form-select-sm">
                <option value="">Tous</option>
                <option value="delivery" {{ request('type') === 'delivery' ? 'selected' : '' }}>Livraison</option>
                <option value="distribution" {{ request('type') === 'distribution' ? 'selected' : '' }}>Distribution</option>
            </select>
        </div>
        @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']) && $campuses->isNotEmpty())
        <div class="col-md-3">
            <label for="campus_id" class="form-label">Campus</label>
            <select name="campus_id" id="campus_id" class="form-select form-select-sm">
                <option value="">Tous les campus</option>
                @foreach ($campuses as $c)
                    <option value="{{ $c->id }}" {{ request('campus_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                @endforeach
            </select>
        </div>
        @endif
        <div class="col-md-2">
            <button type="submit" class="btn btn-sm btn-outline-primary">Filtrer</button>
        </div>
    </div>
</form>

<div class="card">
    <div class="card-header"><i class="bi bi-list-ul"></i> Liste des bons</div>
    <div class="card-body p-0">
        @if ($slips->isEmpty())
            <p class="text-muted p-4 mb-0">Aucun bon de sortie pour le moment.</p>
        @else
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>N° bon</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th class="text-start">Matériel / Désignation</th>
                            <th class="text-end">Quantité</th>
                            <th class="text-start">Destinataire</th>
                            <th>Auteur</th>
                            @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
                            <th>Campus</th>
                            @endif
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($slips as $slip)
                        <tr>
                            <td><code>{{ $slip->slip_number }}</code></td>
                            <td>
                                <span class="badge bg-{{ $slip->type === 'delivery' ? 'success' : 'info' }}">{{ $slip->type_label }}</span>
                            </td>
                            <td>{{ $slip->performed_at->format('d/m/Y H:i') }}</td>
                            <td class="text-start">{{ $slip->designation ?? ($slip->item?->description ?? $slip->item?->name ?? '—') }}</td>
                            <td class="text-end">{{ $slip->quantity }}</td>
                            <td>
                                @if ($slip->recipientUser)
                                    {{ $slip->recipientUser->display_name ?? $slip->recipientUser->name }}
                                @elseif ($slip->recipient_label)
                                    {{ $slip->recipient_label }}
                                @else
                                    —
                                @endif
                            </td>
                            <td>{{ $slip->authorUser->display_name ?? $slip->authorUser->name }}</td>
                            @if (auth()->user()->hasAnyRole(['point_focal', 'director', 'super_admin']))
                            <td>{{ $slip->campus?->name ?? '—' }}</td>
                            @endif
                            <td>
                                <a href="{{ route('delivery-slips.show', $slip) }}" class="btn btn-sm btn-outline-primary">Voir</a>
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <div class="p-3 border-top">
                {{ $slips->links() }}
            </div>
        @endif
    </div>
</div>
@endsection
