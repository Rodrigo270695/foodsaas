<?php

use App\Http\Controllers\Auth\BootstrapLoginController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant.required'])->group(function (): void {
    Route::get('/auth/bienvenida/{token}', [BootstrapLoginController::class, 'show'])
        ->where('token', '[A-Za-z0-9]{40,128}')
        ->middleware(['throttle:20,1'])
        ->name('tenant.auth.bootstrap');
    Route::post('/auth/bienvenida/{token}', [BootstrapLoginController::class, 'store'])
        ->where('token', '[A-Za-z0-9]{40,128}')
        ->middleware(['throttle:20,1'])
        ->name('tenant.auth.bootstrap.store');

    // Misma política que el host central: sin sesión → login (sin interstitial).
    Route::get('/', function () {
        return Auth::check()
            ? redirect()->route('dashboard')
            : redirect()->route('login');
    })->name('tenant.home');
});
