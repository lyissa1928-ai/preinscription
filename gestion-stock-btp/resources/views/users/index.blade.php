@extends('layouts.app')

@section('title', 'Gestion des utilisateurs - ESEBAT')
@section('page-title', 'Utilisateurs')
@section('page-subtitle', 'Comptes, rôles et affectations')

@section('styles')
<style>
    .users-table thead th { font-weight: 600; color: var(--esebat-gray-dark, #374151); }
    .users-table tbody tr { transition: background .15s; }
    .users-table tbody tr:hover { background-color: rgba(249, 115, 22, 0.06); }
    .users-table .form-check-input { cursor: pointer; }
    .users-table .badge-role { font-size: 0.75rem; }
    .batch-bar { position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,.08); }
    .stat-card { border-left: 4px solid var(--esebat-orange, #F97316); }
    .filter-card .form-select { max-width: 100%; }
    .dropdown-actions .dropdown-menu { min-width: 10rem; }
    .avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #F97316 0%, #ea580c 100%); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; }
    .pagination-compact .pagination { font-size: 0.875rem; margin-bottom: 0; }
    .pagination-compact .page-link { padding: 0.35rem 0.65rem; }
    .pagination-compact nav .small { font-size: 0.8rem !important; }
</style>
@endsection

@section('content')
<div class="page-hero d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
        <h1 class="page-hero-title">Comptes utilisateurs</h1>
        <p class="page-hero-subtitle mb-0">Gérez les accès, affectations et suspensions</p>
    </div>
    <a href="{{ route('users.create') }}" class="btn btn-primary">
        <i class="bi bi-person-plus me-1"></i> Nouvel utilisateur
    </a>
</div>

{{-- Mini stats --}}
@php
    $totalUsers = \App\Models\User::count();
    $activeUsers = \App\Models\User::where('is_active', true)->count();
@endphp
<div class="row g-3 mb-4">
    <div class="col-sm-6 col-lg-4">
        <div class="card stat-card h-100 border-0 shadow-sm">
            <div class="card-body py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="text-muted small">Total</span>
                        <h5 class="mb-0 fw-bold">{{ $totalUsers }}</h5>
                    </div>
                    <i class="bi bi-people fs-4 text-muted"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-4">
        <div class="card h-100 border-0 shadow-sm border-start border-success border-4">
            <div class="card-body py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="text-muted small">Actifs</span>
                        <h5 class="mb-0 fw-bold text-success">{{ $activeUsers }}</h5>
                    </div>
                    <i class="bi bi-check-circle fs-4 text-success"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-4">
        <div class="card h-100 border-0 shadow-sm border-start border-secondary border-4">
            <div class="card-body py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="text-muted small">Suspendus</span>
                        <h5 class="mb-0 fw-bold text-secondary">{{ $totalUsers - $activeUsers }}</h5>
                    </div>
                    <i class="bi bi-pause-circle fs-4 text-secondary"></i>
                </div>
            </div>
        </div>
    </div>
</div>

{{-- Filtres --}}
<div class="card filter-card border-0 shadow-sm mb-4">
    <div class="card-body">
        <form method="GET" class="row g-3 align-items-end">
            <div class="col-md-2">
                <label class="form-label small text-muted">Campus</label>
                <select name="campus_id" class="form-select form-select-sm">
                    <option value="">Tous</option>
                    @foreach ($campuses as $c)
                        <option value="{{ $c->id }}" {{ request('campus_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small text-muted">Profil</label>
                <select name="role" class="form-select form-select-sm">
                    <option value="">Tous</option>
                    @foreach (\App\Http\Controllers\UserController::roleLabels() as $role => $label)
                        <option value="{{ $role }}" {{ request('role') == $role ? 'selected' : '' }}>{{ $label }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small text-muted">Statut</label>
                <select name="active" class="form-select form-select-sm">
                    <option value="">Tous</option>
                    <option value="1" {{ request('active') === '1' ? 'selected' : '' }}>Actifs</option>
                    <option value="0" {{ request('active') === '0' ? 'selected' : '' }}>Suspendus</option>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-outline-primary btn-sm w-100">
                    <i class="bi bi-funnel me-1"></i> Filtrer
                </button>
            </div>
        </form>
    </div>
</div>

{{-- Barre d'actions par lot (affichée quand des cases sont cochées) --}}
<div id="batch-bar" class="batch-bar alert alert-light border d-none mb-3">
    <div class="d-flex flex-wrap align-items-center gap-3">
        <span class="fw-medium" id="batch-count">0 utilisateur(s) sélectionné(s)</span>
        <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#modal-assign-campus" id="btn-batch-campus">
                <i class="bi bi-geo-alt me-1"></i> Affecter à un campus
            </button>
            <button type="button" class="btn btn-sm btn-outline-warning" id="btn-batch-suspend">
                <i class="bi bi-pause-circle me-1"></i> Suspendre
            </button>
            <button type="button" class="btn btn-sm btn-outline-success" id="btn-batch-activate">
                <i class="bi bi-play-circle me-1"></i> Réactiver
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" id="btn-batch-delete">
                <i class="bi bi-trash me-1"></i> Supprimer
            </button>
        </div>
        <button type="button" class="btn btn-sm btn-link text-muted ms-auto" id="batch-deselect">Tout désélectionner</button>
    </div>
</div>

{{-- Table --}}
<div class="card border-0 shadow-sm">
    <div class="table-responsive">
        <table class="table users-table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th style="width: 44px;">
                        <input type="checkbox" class="form-check-input" id="select-all" title="Tout sélectionner">
                    </th>
                    <th>Utilisateur</th>
                    <th>Matricule</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Campus</th>
                    <th>Profil</th>
                    <th>Statut</th>
                    <th class="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
                    @forelse ($users as $u)
                    <tr data-user-id="{{ $u->id }}">
                        <td class="text-center">
                            @if ($u->id !== auth()->id())
                                <input type="checkbox" class="form-check-input row-check" value="{{ $u->id }}" name="user_ids[]">
                            @else
                                <span class="text-muted">—</span>
                            @endif
                        </td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <span class="avatar-placeholder">{{ strtoupper(substr($u->first_name ?? $u->name ?? '?', 0, 1)) }}</span>
                                <div>
                                    <strong>{{ $u->display_name }}</strong>
                                </div>
                            </div>
                        </td>
                        <td><code class="small">{{ $u->matricule ?? '—' }}</code></td>
                        <td><a href="mailto:{{ $u->email }}" class="text-decoration-none">{{ $u->email }}</a></td>
                        <td>{{ $u->phone ?? '—' }}</td>
                        <td>{{ $u->campus->name ?? '—' }}</td>
                        <td>
                            @php $roleName = $u->roles->first()?->name; @endphp
                            <span class="badge badge-role {{ $roleName === 'super_admin' ? 'bg-dark' : ($roleName === 'director' ? 'bg-primary' : ($roleName === 'point_focal' ? 'bg-info' : 'bg-secondary')) }}">{{ \App\Http\Controllers\UserController::roleLabels()[$roleName] ?? $roleName }}</span>
                        </td>
                        <td>
                            @if ($u->is_active)
                                <span class="badge bg-success">Actif</span>
                            @else
                                <span class="badge bg-secondary">Suspendu</span>
                            @endif
                        </td>
                        <td class="text-end">
                            <div class="dropdown dropdown-actions">
                                <button class="btn btn-sm btn-light border dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="{{ route('users.show', $u) }}"><i class="bi bi-eye me-2"></i>Voir</a></li>
                                    <li><a class="dropdown-item" href="{{ route('users.edit', $u) }}"><i class="bi bi-pencil me-2"></i>Modifier</a></li>
                                    @if ($u->id !== auth()->id())
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <button type="button" class="dropdown-item text-danger btn-link" data-bs-toggle="modal" data-bs-target="#modal-delete-one" data-user-id="{{ $u->id }}" data-user-name="{{ $u->display_name }}">
                                                <i class="bi bi-trash me-2"></i>Supprimer
                                            </button>
                                        </li>
                                    @endif
                                </ul>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="9" class="text-center py-5 text-muted">
                            <i class="bi bi-people display-6 d-block mb-2"></i>
                            Aucun utilisateur trouvé.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>

@if ($users->hasPages())
    <div class="d-flex justify-content-center align-items-center mt-4 pagination-compact">
        {{ $users->links('pagination::bootstrap-5') }}
    </div>
@endif

{{-- Modal suppression un utilisateur --}}
<div class="modal fade" id="modal-delete-one" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header border-0">
                <h5 class="modal-title">Supprimer l'utilisateur</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p class="mb-0">Confirmer la suppression de <strong id="delete-one-name"></strong> ?</p>
            </div>
            <div class="modal-footer border-0">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <form id="form-delete-one" method="POST" class="d-inline">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger">Supprimer</button>
                </form>
            </div>
        </div>
    </div>
</div>

{{-- Modal suppression par lot --}}
<div class="modal fade" id="modal-delete-batch" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header border-0">
                <h5 class="modal-title">Supprimer les utilisateurs</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p class="mb-0">Confirmer la suppression de <strong id="delete-batch-count"></strong> utilisateur(s) ? Cette action est irréversible.</p>
            </div>
            <div class="modal-footer border-0">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <form id="form-delete-batch" method="POST" action="{{ route('users.batch-destroy') }}" class="d-inline">
                    @csrf
                    <div id="delete-batch-ids"></div>
                    <button type="submit" class="btn btn-danger">Supprimer</button>
                </form>
            </div>
        </div>
    </div>
</div>

{{-- Modal affecter campus par lot --}}
<div class="modal fade" id="modal-assign-campus" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST" action="{{ route('users.batch-assign-campus') }}" id="form-assign-campus">
                @csrf
                <div id="assign-campus-ids"></div>
                <div class="modal-header border-0">
                    <h5 class="modal-title">Affecter à un campus</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">Seuls les comptes <strong>Staff</strong> seront affectés. Les autres profils ne sont pas liés à un campus.</p>
                    <label class="form-label">Campus</label>
                    <select name="campus_id" class="form-select" required>
                        <option value="">Choisir un campus</option>
                        @foreach ($campuses as $c)
                            <option value="{{ $c->id }}">{{ $c->name }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="modal-footer border-0">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="submit" class="btn btn-primary">Appliquer</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script>
(function() {
    const batchBar = document.getElementById('batch-bar');
    const batchCount = document.getElementById('batch-count');
    const selectAll = document.getElementById('select-all');
    const rowChecks = document.querySelectorAll('.row-check');
    const batchDeselect = document.getElementById('batch-deselect');

    function updateBatchBar() {
        const checked = document.querySelectorAll('.row-check:checked');
        const n = checked.length;
        if (n === 0) {
            batchBar.classList.add('d-none');
            if (selectAll) selectAll.checked = false;
        } else {
            batchBar.classList.remove('d-none');
            batchCount.textContent = n + ' utilisateur(s) sélectionné(s)';
            if (selectAll) selectAll.checked = rowChecks.length > 0 && checked.length === rowChecks.length;
        }
    }

    if (selectAll) {
        selectAll.addEventListener('change', function() {
            rowChecks.forEach(function(cb) { cb.checked = selectAll.checked; });
            updateBatchBar();
        });
    }
    rowChecks.forEach(function(cb) {
        cb.addEventListener('change', updateBatchBar);
    });
    if (batchDeselect) batchDeselect.addEventListener('click', function() {
        rowChecks.forEach(function(cb) { cb.checked = false; });
        if (selectAll) selectAll.checked = false;
        updateBatchBar();
    });

    function getSelectedIds() {
        return Array.from(document.querySelectorAll('.row-check:checked')).map(function(cb) { return cb.value; });
    }

    // Suppression un
    var modalDeleteOne = document.getElementById('modal-delete-one');
    if (modalDeleteOne) {
        modalDeleteOne.addEventListener('show.bs.modal', function(e) {
            var btn = e.relatedTarget;
            if (!btn) return;
            var id = btn.getAttribute('data-user-id');
            var name = btn.getAttribute('data-user-name');
            document.getElementById('delete-one-name').textContent = name;
            document.getElementById('form-delete-one').action = '{{ url("users") }}/' + id;
        });
    }

    // Suppression par lot
    document.getElementById('btn-batch-delete').addEventListener('click', function() {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        document.getElementById('delete-batch-count').textContent = ids.length;
        var container = document.getElementById('delete-batch-ids');
        container.innerHTML = '';
        ids.forEach(function(id) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'ids[]';
            input.value = id;
            container.appendChild(input);
        });
        new bootstrap.Modal(document.getElementById('modal-delete-batch')).show();
    });

    // Affecter campus par lot
    document.getElementById('btn-batch-campus').addEventListener('click', function() {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        var container = document.getElementById('assign-campus-ids');
        container.innerHTML = '';
        ids.forEach(function(id) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'ids[]';
            input.value = id;
            container.appendChild(input);
        });
    });

    // Suspendre par lot
    document.getElementById('btn-batch-suspend').addEventListener('click', function() {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        if (!confirm('Suspendre ' + ids.length + ' utilisateur(s) ? Ils ne pourront plus se connecter ni faire de demandes.')) return;
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = '{{ route("users.batch-suspend") }}';
        var csrf = document.createElement('input');
        csrf.type = 'hidden';
        csrf.name = '_token';
        csrf.value = '{{ csrf_token() }}';
        form.appendChild(csrf);
        ids.forEach(function(id) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'ids[]';
            input.value = id;
            form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
    });

    // Réactiver par lot
    document.getElementById('btn-batch-activate').addEventListener('click', function() {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        if (!confirm('Réactiver ' + ids.length + ' utilisateur(s) ?')) return;
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = '{{ route("users.batch-activate") }}';
        var csrf = document.createElement('input');
        csrf.type = 'hidden';
        csrf.name = '_token';
        csrf.value = '{{ csrf_token() }}';
        form.appendChild(csrf);
        ids.forEach(function(id) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'ids[]';
            input.value = id;
            form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
    });
})();
</script>
@endsection
