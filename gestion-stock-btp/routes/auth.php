<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\ResetPasswordController;

/*
|--------------------------------------------------------------------------
| Authentication routes (no Fortify – using app controllers)
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:5,1'); // 5 tentatives par minute (brute force)

    Route::get('mot-de-passe-oublie', [ForgotPasswordController::class, 'showLinkRequestForm'])->name('password.request');
    Route::post('mot-de-passe-oublie', [ForgotPasswordController::class, 'sendResetLinkEmail'])->name('password.email')->middleware('throttle:3,1');
    Route::get('reinitialiser-mot-de-passe/{token}', [ResetPasswordController::class, 'showResetForm'])->name('password.reset');
    Route::post('reinitialiser-mot-de-passe', [ResetPasswordController::class, 'reset'])->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('password/change-first', [PasswordController::class, 'forceChangeForm'])->name('password.force-change');
    Route::post('password/change-first', [PasswordController::class, 'forceChangeStore']);
});
