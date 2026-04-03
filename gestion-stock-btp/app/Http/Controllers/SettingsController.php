<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;

class SettingsController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->hasRole('super_admin')) {
                abort(403, 'Seul le Super Admin peut gérer les paramètres de la plateforme.');
            }
            return $next($request);
        });
    }

    public function index()
    {
        return view('settings.index', [
            'theme_color' => Setting::get('theme_color', 'orange'),
            'logoUrl' => Setting::logoUrl(),
            'faviconUrl' => Setting::faviconUrl(),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'theme_color' => 'required|in:orange,blue,green',
            'logo' => ['nullable', File::types(['png', 'jpg', 'jpeg', 'svg', 'webp'])->max(2 * 1024)],
            'favicon' => ['nullable', File::types(['ico', 'png', 'svg'])->max(512)],
        ]);

        Setting::set('theme', 'light');
        Setting::set('theme_color', $validated['theme_color']);

        if ($request->hasFile('logo')) {
            $old = Setting::get('logo_path');
            if ($old) {
                Storage::disk('public')->delete($old);
            }
            $path = $request->file('logo')->store('settings', 'public');
            Setting::set('logo_path', $path);
        }

        if ($request->hasFile('favicon')) {
            $old = Setting::get('favicon_path');
            if ($old) {
                Storage::disk('public')->delete($old);
            }
            $path = $request->file('favicon')->store('settings', 'public');
            Setting::set('favicon_path', $path);
        }

        Cache::forget('app_settings');

        return redirect()->route('settings.index')->with('success', 'Paramètres enregistrés.');
    }
}
