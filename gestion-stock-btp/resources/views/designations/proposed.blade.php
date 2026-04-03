@extends('layouts.app')

@section('title', 'Matériels non répertoriés - ESEBAT')
@section('page-title', 'Matériels non répertoriés (proposés)')

@section('content')
<div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
    <h5 class="mb-0"><i class="bi bi-inbox me-2"></i> Désignations proposées par les demandeurs</h5>
    <a href="{{ route('designations.index') }}" class="btn btn-outline-secondary btn-sm">
        <i class="bi bi-tag"></i> Retour au référentiel
    </a>
</div>

@if (session('success'))
    <div class="alert alert-success">{{ session('success') }}</div>
@endif

<div class="alert alert-info mb-4">
    <strong>Principe :</strong> Lorsqu’un demandeur saisit un matériel qui n’est pas dans le catalogue (« désignation libre »), la ligne est signalée comme <em>matériel non répertorié</em>.
    Vous pouvez examiner ces propositions, les valider et les intégrer au référentiel en renseignant catégorie, code et prix unitaire. Une fois intégrée, la désignation sera disponible pour toutes les prochaines demandes.
</div>

<div class="card">
    <div class="card-body p-0">
        @if ($proposed->isEmpty())
            <div class="p-4 text-center text-muted">
                <i class="bi bi-check-circle display-6 text-success"></i>
                <p class="mt-2 mb-0">Aucune désignation proposée en attente. Toutes les lignes « matériel non répertorié » ont été traitées ou correspondent déjà au catalogue.</p>
                <a href="{{ route('designations.index') }}" class="btn btn-sm btn-outline-primary mt-3">Voir le référentiel</a>
            </div>
        @else
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Désignation proposée</th>
                            <th class="text-center">Nombre de demandes</th>
                            <th class="text-end">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($proposed as $row)
                            <tr>
                                <td>
                                    <strong>{{ $row->designation }}</strong>
                                </td>
                                <td class="text-center">
                                    <span class="badge bg-secondary">{{ $row->occurrences }}</span>
                                    @if ($row->sample_request_id)
                                        <a href="{{ route('material-requests.show', $row->sample_request_id) }}" class="ms-1 small" target="_blank">Voir une demande <i class="bi bi-box-arrow-up-right"></i></a>
                                    @endif
                                </td>
                                <td class="text-end">
                                    <a href="{{ route('designations.create', ['proposed' => $row->designation]) }}" class="btn btn-sm btn-primary">
                                        <i class="bi bi-plus-circle"></i> Intégrer au référentiel
                                    </a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    </div>
</div>
@endsection
