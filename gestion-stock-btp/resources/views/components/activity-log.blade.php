@props(['activities', 'limit' => 10])

@php
    $displayActivities = is_array($activities) ? collect($activities) : $activities;
    if ($limit) {
        $displayActivities = $displayActivities->take($limit);
    }
@endphp

<div class="table-responsive">
    <table class="table table-sm table-borderless">
        <thead style="background-color: #f8f9fa;">
            <tr>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Modèle</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($displayActivities as $activity)
                <tr>
                    <td style="font-size: 13px;">
                        <strong>{{ $activity->user_id ? optional($activity->causer)->name : 'Système' }}</strong>
                    </td>
                    <td style="font-size: 13px;">
                        @php
                            $actionColors = [
                                'created' => 'bg-success',
                                'updated' => 'bg-info',
                                'deleted' => 'bg-danger',
                                'approved' => 'bg-success',
                                'submitted' => 'bg-warning',
                                'received' => 'bg-info',
                            ];
                            $color = $actionColors[strtolower($activity->action)] ?? 'bg-secondary';
                        @endphp
                        <span class="badge {{ $color }}" style="font-size: 11px;">
                            {{ ucfirst($activity->action) }}
                        </span>
                    </td>
                    <td style="font-size: 13px;">
                        <small class="text-muted">{{ class_basename($activity->loggable_type) }}</small>
                    </td>
                    <td style="font-size: 12px; color: #666;">
                        {{ $activity->created_at->diffForHumans() }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" class="text-center text-muted py-3">Aucune activité enregistrée</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
