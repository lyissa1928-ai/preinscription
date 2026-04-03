@extends('layouts.app')

@section('title', 'Ticket #' . $ticket->id)
@section('page-title', 'Ticket maintenance #' . $ticket->id)

@section('content')
<div class="row mb-3">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5>{{ $ticket->title }}</h5>
                <small class="text-muted">Équipement : {{ $ticket->asset->serial_number }}</small>
            </div>
            <div>
                @if ($ticket->status === 'open')
                    <span class="badge bg-danger" style="font-size: 14px;">Ouvert</span>
                @elseif ($ticket->status === 'in_progress')
                    <span class="badge bg-info" style="font-size: 14px;">En cours</span>
                @elseif ($ticket->status === 'resolved')
                    <span class="badge bg-success" style="font-size: 14px;">Résolu</span>
                @elseif ($ticket->status === 'closed')
                    <span class="badge bg-secondary" style="font-size: 14px;">Fermé</span>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Ticket Details -->
<div class="row mb-4">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Informations du ticket</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <th style="width: 40%;">Équipement</th>
                        <td>
                            <a href="{{ route('assets.show', $ticket->asset) }}" class="text-decoration-none">
                                {{ $ticket->asset->serial_number }}
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <th>Priorité</th>
                        <td>
                            @php
                                $priorityBadge = [
                                    'low' => 'bg-success',
                                    'medium' => 'bg-info',
                                    'high' => 'bg-warning text-dark',
                                    'urgent' => 'bg-danger'
                                ][$ticket->priority] ?? 'bg-secondary';
                                $priorityLabels = ['low' => 'Basse', 'medium' => 'Moyenne', 'high' => 'Haute', 'urgent' => 'Urgente'];
                            @endphp
                            <span class="badge {{ $priorityBadge }}">{{ $priorityLabels[$ticket->priority] ?? ucfirst($ticket->priority) }}</span>
                        </td>
                    </tr>
                    <tr>
                        <th>Créé le</th>
                        <td>{{ $ticket->created_at->format('M d, Y H:i') }}</td>
                    </tr>
                    @if ($ticket->estimated_hours)
                        <tr>
                            <th>Heures estimées</th>
                            <td>{{ $ticket->estimated_hours }} h</td>
                        </tr>
                    @endif
                </table>
            </div>
        </div>
    </div>

    <div class="col-md-6">
        <div class="card">
            <div class="card-header">Affectation et statut</div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <th style="width: 40%;">Statut</th>
                        <td>
                            @if ($ticket->status === 'open')
                                <span class="badge bg-danger">Ouvert</span>
                            @elseif ($ticket->status === 'in_progress')
                                <span class="badge bg-info">En cours</span>
                            @elseif ($ticket->status === 'resolved')
                                <span class="badge bg-success">Résolu</span>
                            @elseif ($ticket->status === 'closed')
                                <span class="badge bg-secondary">Fermé</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <th>Assigné à</th>
                        <td>
                            @if ($ticket->assigned_to_id)
                                {{ $ticket->assignedTo->name }}
                            @else
                                <span class="text-muted">Non assigné</span>
                            @endif
                        </td>
                    </tr>
                    @if ($ticket->work_started_at)
                        <tr>
                            <th>Travail commencé</th>
                            <td>{{ $ticket->work_started_at->format('M d, Y H:i') }}</td>
                        </tr>
                    @endif
                    @if ($ticket->completed_at)
                        <tr>
                            <th>Terminé le</th>
                            <td>{{ $ticket->completed_at->format('M d, Y H:i') }}</td>
                        </tr>
                    @endif
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Description -->
<div class="card mb-4">
    <div class="card-header">Description</div>
    <div class="card-body">
        <p style="white-space: pre-wrap;">{{ $ticket->description }}</p>
    </div>
</div>

<!-- Work Notes -->
<div class="card mb-4">
    <div class="card-header">Notes de travail</div>
    <div class="card-body">
        @forelse ($ticket->workNotes ?? [] as $note)
            <div class="border-bottom py-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong style="font-size: 13px;">{{ $note->created_by_user->name }}</strong>
                        <div style="font-size: 12px; color: #666;">
                            {{ $note->created_at->format('M d, Y H:i') }}
                        </div>
                    </div>
                    <div>
                        @if ($note->status === 'pending_parts')
                            <span class="badge bg-warning text-dark" style="font-size: 11px;">Pièces en attente</span>
                        @endif
                    </div>
                </div>
                <p style="font-size: 13px; margin-top: 8px;">{{ $note->notes }}</p>
            </div>
        @empty
            <p class="text-muted text-center py-3">Aucune note de travail pour l'instant</p>
        @endforelse
    </div>
</div>

<!-- Action Buttons -->
<div class="card">
    <div class="card-body">
        <div class="d-flex gap-2 flex-wrap">
            @if ($ticket->status === 'open' && auth()->user()->can('assign', $ticket))
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#assignModal">
                    <i class="bi bi-person-plus"></i> Assigner un technicien
                </button>
            @endif

            @if ($ticket->status === 'open' && auth()->user()->can('work', $ticket))
                <form action="{{ route('maintenance-tickets.startWork', $ticket) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-info">
                        <i class="bi bi-play-circle"></i> Démarrer le travail
                    </button>
                </form>
            @endif

            @if ($ticket->status === 'in_progress' && auth()->user()->can('work', $ticket))
                <button class="btn btn-sm btn-outline-warning" data-bs-toggle="modal" data-bs-target="#noteModal">
                    <i class="bi bi-pencil"></i> Ajouter une note
                </button>
            @endif

            @if ($ticket->status === 'in_progress' && auth()->user()->can('resolve', $ticket))
                <form action="{{ route('maintenance-tickets.resolve', $ticket) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-success"
                            onclick="return confirm('Marquer comme résolu ?')">
                        <i class="bi bi-check-circle"></i> Marquer résolu
                    </button>
                </form>
            @endif

            @if ($ticket->status === 'resolved' && auth()->user()->can('close', $ticket))
                <form action="{{ route('maintenance-tickets.close', $ticket) }}" method="POST" style="display: inline;">
                    @csrf
                    <button type="submit" class="btn btn-sm btn-secondary"
                            onclick="return confirm('Fermer ce ticket ?')">
                        <i class="bi bi-x-circle"></i> Fermer le ticket
                    </button>
                </form>
            @endif

            <a href="{{ route('maintenance-tickets.index') }}" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Retour
            </a>
        </div>
    </div>
</div>

<!-- Assign Modal -->
@if ($ticket->status === 'open' && auth()->user()->can('assign', $ticket))
<div class="modal fade" id="assignModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title">Assigner un technicien</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form action="{{ route('maintenance-tickets.assign', $ticket) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="assigned_to_id" class="form-label">Technicien</label>
                        <select class="form-select" id="assigned_to_id" name="assigned_to_id" required>
                            <option value="">— Choisir un technicien —</option>
                            @foreach ($assignableUsers as $tech)
                                <option value="{{ $tech->id }}">{{ $tech->name }}</option>
                            @endforeach
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-primary">Assigner</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif

<!-- Work Note Modal -->
@if ($ticket->status === 'in_progress' && auth()->user()->can('work', $ticket))
<div class="modal fade" id="noteModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title">Ajouter une note de travail</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form action="{{ route('maintenance-tickets.work', $ticket) }}" method="POST">
                @csrf
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes de travail</label>
                        <textarea class="form-control" id="notes" name="notes" rows="3" required></textarea>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="pending_parts" name="pending_parts" value="1">
                        <label class="form-check-label" for="pending_parts">
                            En attente de pièces / prestation externe
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-primary">Ajouter la note</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endif
@endsection
