<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirige vers l'écran de changement obligatoire si l'utilisateur doit changer son mot de passe
 * (première connexion ou mot de passe réinitialisé par un admin).
 */
class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return $next($request);
        }

        if (!$request->user()->must_change_password) {
            return $next($request);
        }

        if ($request->routeIs('password.force-change') || $request->routeIs('logout')) {
            return $next($request);
        }

        return redirect()->route('password.force-change');
    }
}
