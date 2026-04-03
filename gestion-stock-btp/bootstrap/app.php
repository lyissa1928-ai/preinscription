<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'password.changed' => \App\Http\Middleware\EnsurePasswordChanged::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 419 Page Expired (CSRF) : redirection vers login avec message au lieu d'afficher l'erreur
        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Session expirée. Veuillez vous reconnecter.'], 419);
            }
            return redirect()->route('login')
                ->with('error', 'Votre session a expiré. Veuillez vous reconnecter.');
        });

        $exceptions->render(function (HttpException $e, Request $request) {
            if ($e->getStatusCode() === 419) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Session expirée. Veuillez vous reconnecter.'], 419);
                }
                return redirect()->route('login')
                    ->with('error', 'Votre session a expiré. Veuillez vous reconnecter.');
            }
        });
    })->create();
