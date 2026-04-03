@extends('layouts.app')

@section('title', 'Gestion des campus - ESEBAT')
@section('page-title', 'Gestion des campus')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h5>Tous les campus</h5>
            @if (auth()->user()->hasRole('super_admin'))
                <a href="{{ route('campuses.create') }}" class="btn btn-primary btn-sm">
                    <i class="bi bi-plus-circle"></i> Nouveau campus
                </a>
            @endif
        </div>
    </div>
</div>

<div class="card">
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead>
                <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    <th>Localisation / Ville</th>
                    <th>Responsable de commande</th>
                    <th>Statut</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($campuses as $campus)
                    <tr>
                        <td><strong>{{ $campus->name }}</strong></td>
                        <td><code>{{ $campus->code }}</code></td>
                        <td>{{ $campus->city ?? '—' }}</td>
                        <td>{{ $campus->orderResponsible->name ?? '—' }}</td>
                        <td>
                            @if ($campus->is_active)
                                <span class="badge bg-success">Actif</span>
                            @else
                                <span class="badge bg-secondary">Inactif</span>
                            @endif
                        </td>
                        <td>
                            <a href="{{ route('campuses.show', $campus) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></a>
                            @if (auth()->user()->hasRole('super_admin'))
                            <a href="{{ route('campuses.edit', $campus) }}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                            @endif
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="text-center py-4 text-muted">Aucun campus.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>

@if ($campuses->hasPages())
    <div class="d-flex justify-content-center mt-4">
        {{ $campuses->links() }}
    </div>
@endif
@endsection
