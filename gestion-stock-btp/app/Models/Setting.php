<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class Setting extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['key', 'value'];

    public static function get(string $key, mixed $default = null): mixed
    {
        $settings = Cache::remember('app_settings', 300, function () {
            return self::pluck('value', 'key')->toArray();
        });
        return $settings[$key] ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        self::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('app_settings');
    }

    public static function logoUrl(): ?string
    {
        $path = self::get('logo_path');
        if (!$path) {
            return null;
        }
        return asset('storage/' . $path);
    }

    public static function faviconUrl(): ?string
    {
        $path = self::get('favicon_path');
        if (!$path) {
            return null;
        }
        return asset('storage/' . $path);
    }

    /**
     * Logo utilisé sur toutes les pages : d’abord fichiers dans public/, puis paramètre admin.
     */
    public static function resolveLogoUrl(): ?string
    {
        if (Schema::hasTable('settings')) {
            $url = self::logoUrl();
            if ($url) {
                return $url;
            }
        }
        $base = public_path();
        $candidates = ['logo.png', 'logo.svg', 'logo.jpg', 'logo.jpeg', 'logo.webp', 'images/logo.png', 'images/logo.svg', 'images/logo.jpg'];
        foreach ($candidates as $file) {
            $fullPath = $base . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $file);
            if (file_exists($fullPath)) {
                return asset($file);
            }
        }
        return null;
    }

    /**
     * Favicon utilisé sur toutes les pages : d’abord fichiers dans public/, puis paramètre admin.
     */
    public static function resolveFaviconUrl(): string
    {
        if (Schema::hasTable('settings')) {
            $url = self::faviconUrl();
            if ($url) {
                return $url;
            }
        }
        $base = public_path();
        $candidates = ['favicon.ico', 'favicon.png', 'favicon.svg'];
        foreach ($candidates as $file) {
            $fullPath = $base . DIRECTORY_SEPARATOR . $file;
            if (file_exists($fullPath)) {
                return asset($file);
            }
        }
        return asset('favicon.svg');
    }
}
