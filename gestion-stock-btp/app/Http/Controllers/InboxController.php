<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\InboxMessage;
use App\Models\InboxMessageAttachment;
use App\Models\InboxMessageDeletion;
use App\Services\MessagingService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

/**
 * Messagerie interne : règles strictes par rôle (MessagingService).
 * Pièces jointes, suppression "pour moi" (style WhatsApp).
 */
class InboxController extends Controller
{
    private const MAX_ATTACHMENTS = 5;
    private const MAX_FILE_SIZE_MB = 10;
    private const ALLOWED_MIMES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip'];

    public function index(Request $request): View
    {
        $user = $request->user();
        $conversations = $this->getConversationsList($user);

        return view('inbox.index', [
            'conversations' => $conversations,
            'user' => $user,
            'currentConversation' => null,
        ]);
    }

    public function create(Request $request): View
    {
        $user = $request->user();
        $recipients = MessagingService::allowedRecipientsQuery($user)->get();

        return view('inbox.create', [
            'recipients' => $recipients,
        ]);
    }

    /**
     * Créer une conversation (ou l'ouvrir) et envoyer le premier message.
     * Backend : vérification stricte canSendTo($user, $recipient). Pièces jointes optionnelles.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'body' => 'nullable|string|max:5000',
            'attachments.*' => 'file|max:' . (self::MAX_FILE_SIZE_MB * 1024) . '|mimes:' . implode(',', self::ALLOWED_MIMES),
        ], [
            'recipient_id.required' => 'Veuillez choisir un destinataire.',
            'attachments.max' => 'Chaque fichier doit faire au maximum ' . self::MAX_FILE_SIZE_MB . ' Mo.',
        ]);

        $user = $request->user();
        $recipient = \App\Models\User::findOrFail($request->recipient_id);

        if (!MessagingService::canSendTo($user, $recipient)) {
            abort(403, 'Vous n\'êtes pas autorisé à envoyer un message à ce destinataire.');
        }

        $files = $request->file('attachments', []);
        if (empty(trim((string) $request->body)) && empty($files)) {
            return back()->withErrors(['body' => 'Veuillez saisir un message ou joindre au moins un fichier.'])->withInput();
        }
        if (count($files) > self::MAX_ATTACHMENTS) {
            return back()->withErrors(['attachments' => 'Maximum ' . self::MAX_ATTACHMENTS . ' fichiers.'])->withInput();
        }

        $conversation = Conversation::findOrCreateBetween($user, $recipient);
        $message = InboxMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'body' => trim((string) $request->body) ?: null,
            'is_ephemeral' => $request->boolean('is_ephemeral'),
        ]);
        $this->storeAttachments($message, $files);
        $conversation->touch();
        $conversation->markVisibleFor($recipient);

        $this->notifyNewMessage($conversation, $recipient->id, $user);

        return redirect()
            ->route('inbox.show', $conversation)
            ->with('success', 'Message envoyé.');
    }

    /**
     * Afficher une conversation. Backend : vérification participant uniquement.
     */
    public function show(Request $request, Conversation $conversation): View|RedirectResponse
    {
        $this->authorize('view', $conversation);

        $user = $request->user();
        $conversation->load(['user1', 'user2', 'messages.sender', 'messages.attachments']);

        // Marquer comme lu les messages reçus (non envoyés par moi)
        InboxMessage::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $other = $conversation->otherUser($user);
        $canReply = MessagingService::canSendInConversation($user, $conversation);

        $conversations = $this->getConversationsList($user);

        $messageIds = $conversation->messages->pluck('id')->toArray();
        $deletedForMeIds = InboxMessageDeletion::where('user_id', $user->id)
            ->whereIn('inbox_message_id', $messageIds)
            ->pluck('inbox_message_id')
            ->toArray();

        $visibleMessages = $conversation->messages->filter(
            fn ($m) => !in_array($m->id, $deletedForMeIds)
        )->values();

        return view('inbox.show', [
            'conversations' => $conversations,
            'conversation' => $conversation,
            'currentConversation' => $conversation,
            'other' => $other,
            'canReply' => $canReply,
            'user' => $user,
            'visibleMessages' => $visibleMessages,
        ]);
    }

    /**
     * Envoyer un message dans une conversation existante (texte et/ou pièces jointes).
     */
    public function storeMessage(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorize('sendMessage', $conversation);

        $request->validate([
            'body' => 'nullable|string|max:5000',
            'attachments.*' => 'file|max:' . (self::MAX_FILE_SIZE_MB * 1024) . '|mimes:' . implode(',', self::ALLOWED_MIMES),
        ], [
            'attachments.max' => 'Chaque fichier doit faire au maximum ' . self::MAX_FILE_SIZE_MB . ' Mo.',
        ]);

        $files = $request->file('attachments', []);
        if (empty(trim((string) $request->body)) && empty($files)) {
            return back()->withErrors(['body' => 'Veuillez saisir un message ou joindre au moins un fichier.'])->withInput();
        }
        if (count($files) > self::MAX_ATTACHMENTS) {
            return back()->withErrors(['attachments' => 'Maximum ' . self::MAX_ATTACHMENTS . ' fichiers.'])->withInput();
        }

        $user = $request->user();
        $other = $conversation->otherUser($user);

        $message = InboxMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'body' => trim((string) $request->body) ?: null,
            'is_ephemeral' => $request->boolean('is_ephemeral'),
        ]);
        $this->storeAttachments($message, $files);
        $conversation->touch();
        $conversation->markVisibleFor($other); // réafficher la conversation pour l'autre s'il l'avait supprimée

        $this->notifyNewMessage($conversation, $other->id, $user);

        return redirect()
            ->route('inbox.show', $conversation)
            ->with('success', 'Message envoyé.');
    }

    /**
     * Supprimer un message pour moi uniquement (masqué de ma vue).
     */
    public function deleteMessageForMe(Request $request, Conversation $conversation, InboxMessage $inbox_message): RedirectResponse
    {
        $this->authorize('view', $conversation);
        $this->authorize('delete', $inbox_message);
        if ((int) $inbox_message->conversation_id !== (int) $conversation->id) {
            abort(404);
        }
        InboxMessageDeletion::firstOrCreate(
            ['user_id' => $request->user()->id, 'inbox_message_id' => $inbox_message->id]
        );
        return redirect()->route('inbox.show', $conversation)->with('success', 'Message supprimé pour vous.');
    }

    /**
     * Supprimer un message pour tout le monde (visible comme "Message supprimé").
     */
    public function deleteMessageForEveryone(Request $request, Conversation $conversation, InboxMessage $inbox_message): RedirectResponse
    {
        $this->authorize('view', $conversation);
        $this->authorize('delete', $inbox_message);
        if ((int) $inbox_message->conversation_id !== (int) $conversation->id) {
            abort(404);
        }
        $inbox_message->update(['deleted_at' => now()]);
        return redirect()->route('inbox.show', $conversation)->with('success', 'Message supprimé pour tout le monde.');
    }

    /**
     * Supprimer la conversation pour moi (masquer de ma liste, style WhatsApp).
     */
    public function destroyForMe(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorize('deleteForMe', $conversation);
        $conversation->markHiddenFor($request->user());
        return redirect()->route('inbox.index')->with('success', 'Conversation supprimée de votre liste.');
    }

    /**
     * Télécharger une pièce jointe (accès réservé aux participants).
     */
    public function downloadAttachment(Request $request, InboxMessageAttachment $attachment): Response
    {
        $attachment->load('message.conversation');
        $conversation = $attachment->message->conversation;
        $this->authorize('view', $conversation);

        if (!Storage::disk('local')->exists($attachment->path)) {
            abort(404, 'Fichier introuvable.');
        }

        $path = Storage::disk('local')->path($attachment->path);
        $mime = $attachment->mime_type ?? 'application/octet-stream';

        // Images : aperçu inline dans la discussion
        if (str_starts_with($mime, 'image/')) {
            return response()->file($path, [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline; filename="' . $attachment->filename . '"',
            ]);
        }

        return Storage::disk('local')->download(
            $attachment->path,
            $attachment->filename,
            ['Content-Type' => $mime]
        );
    }

    /**
     * Liste des conversations pour la colonne gauche (index + show).
     */
    private function getConversationsList(\App\Models\User $user): \Illuminate\Support\Collection
    {
        $conversations = Conversation::query()
            ->where(function ($q) use ($user) {
                $q->where(function ($q1) use ($user) {
                    $q1->where('user1_id', $user->id)->whereNull('user1_hidden_at');
                })->orWhere(function ($q2) use ($user) {
                    $q2->where('user2_id', $user->id)->whereNull('user2_hidden_at');
                });
            })
            ->with(['user1', 'user2', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->withCount(['messages as unread_count' => fn ($q) => $q->where('sender_id', '!=', $user->id)->whereNull('read_at')])
            ->get();

        return $conversations->sortByDesc(fn ($c) => $c->messages->first()?->created_at ?? $c->updated_at)->values();
    }

    private function storeAttachments(InboxMessage $message, array $files): void
    {
        foreach ($files as $file) {
            $path = $file->storeAs(
                'inbox_attachments/' . $message->conversation_id,
                Str::uuid() . '_' . $file->getClientOriginalName(),
                'local'
            );
            InboxMessageAttachment::create([
                'inbox_message_id' => $message->id,
                'filename' => $file->getClientOriginalName(),
                'path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        }
    }

    private function notifyNewMessage(Conversation $conversation, int $recipientUserId, \App\Models\User $sender): void
    {
        if (!class_exists(\App\Models\AppNotification::class)) {
            return;
        }
        \App\Models\AppNotification::create([
            'user_id' => $recipientUserId,
            'type' => 'inbox_message',
            'title' => 'Nouveau message',
            'message' => $sender->display_name . ' vous a envoyé un message.',
            'data' => [
                'conversation_id' => $conversation->id,
                'sender_id' => $sender->id,
            ],
        ]);
    }
}
