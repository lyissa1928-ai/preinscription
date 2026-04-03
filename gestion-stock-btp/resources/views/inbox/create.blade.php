@extends('layouts.app')

@section('title', 'Nouvelle conversation - ESEBAT')
@section('page-title', 'Nouvelle conversation')
@section('page-subtitle', 'Choisissez un destinataire autorisé')

@section('content')
<div class="row justify-content-center">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <i class="bi bi-chat-text me-2"></i> Nouveau message
            </div>
            <div class="card-body">
                <p class="text-muted small mb-4">La liste des destinataires respecte les règles de votre profil. Vous ne pouvez envoyer un message qu'aux personnes autorisées.</p>

                @if ($recipients->isEmpty())
                    <div class="alert alert-info mb-0">
                        Aucun destinataire autorisé pour votre profil.
                    </div>
                @else
                    <form method="POST" action="{{ route('inbox.store') }}" enctype="multipart/form-data">
                        @csrf
                        <div class="mb-4">
                            <label for="recipient_id" class="form-label">Destinataire <span class="text-danger">*</span></label>
                            <select name="recipient_id" id="recipient_id" class="form-select @error('recipient_id') is-invalid @enderror" required>
                                <option value="">— Choisir —</option>
                                @foreach ($recipients as $r)
                                    <option value="{{ $r->id }}" {{ old('recipient_id') == $r->id ? 'selected' : '' }}>
                                        {{ $r->display_name ?? $r->name }} ({{ \App\Http\Controllers\UserController::roleLabels()[$r->roles->first()?->name] ?? $r->roles->first()?->name }})
                                    </option>
                                @endforeach
                            </select>
                            @error('recipient_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                        <div class="mb-4">
                            <label for="body" class="form-label">Message</label>
                            <textarea name="body" id="body" class="form-control @error('body') is-invalid @enderror" rows="4" placeholder="Votre message... (ou joignez un fichier)">{{ old('body') }}</textarea>
                            @error('body')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        </div>
                        <div class="mb-4">
                            <label for="attachments" class="form-label"><i class="bi bi-paperclip me-1"></i> Pièces jointes (max 5, 10 Mo chacun)</label>
                            <input type="file" name="attachments[]" id="attachments" class="form-control form-control-sm" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip">
                            <small class="text-muted">Images, PDF, Word, Excel, TXT, CSV, ZIP</small>
                            @error('attachments')<div class="invalid-feedback d-block">{{ $message }}</div>@enderror
                        </div>
                        <div class="mb-4">
                            <label class="d-flex align-items-center gap-2">
                                <input type="checkbox" name="is_ephemeral" value="1" {{ old('is_ephemeral') ? 'checked' : '' }} class="form-check-input">
                                <span class="small">Message éphémère (disparaît après lecture)</span>
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary"><i class="bi bi-send me-1"></i> Envoyer</button>
                        <a href="{{ route('inbox.index') }}" class="btn btn-outline-secondary">Annuler</a>
                    </form>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
