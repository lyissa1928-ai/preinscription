<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

class NotificationController extends Controller
{
    public function index(Request $request): View
    {
        $notifications = $request->user()
            ->appNotifications()
            ->orderByDesc('created_at')
            ->paginate(20);

        return view('notifications.index', ['notifications' => $notifications]);
    }

    public function markAsRead(AppNotification $notification, Request $request): RedirectResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403);
        }
        $notification->markAsRead();
        return back();
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()->appNotifications()->whereNull('read_at')->update(['read_at' => now()]);
        return back()->with('success', 'Toutes les notifications sont marquées comme lues.');
    }
}
