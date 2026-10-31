<?php

use App\Http\Controllers\Auth\BootstrapLoginController;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\GeoController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\TenantImpersonationController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware(['throttle:12,1'])->group(function (): void {
    Route::get('impersonate/accept', [TenantImpersonationController::class, 'accept'])
        ->name('impersonate.accept');
});

/*
| Espejo de bienvenida (como VetSaaS): la canónica vive en routes/tenant.php
| (subdominio). Este grupo cubre hosts donde el match por domain falle.
*/
Route::middleware(['tenant.required', 'throttle:20,1'])->group(function (): void {
    Route::get('auth/bienvenida/{token}', [BootstrapLoginController::class, 'show'])
        ->where('token', '[A-Za-z0-9]{40,128}')
        ->name('tenant.auth.bootstrap.web');

    Route::post('auth/bienvenida/{token}', [BootstrapLoginController::class, 'store'])
        ->where('token', '[A-Za-z0-9]{40,128}')
        ->name('tenant.auth.bootstrap.store.web');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('impersonate/leave', [TenantImpersonationController::class, 'leave'])
        ->name('impersonate.leave');
});

/*
| Cambio obligatorio de contraseña (must_change_password).
| Fuera del middleware force-password-change para evitar redirect loop.
*/
Route::middleware(['auth', 'tenant.match-user'])->group(function (): void {
    Route::get('cuenta/cambiar-password', [ChangePasswordController::class, 'show'])
        ->name('password.change.form');
    Route::post('cuenta/cambiar-password', [ChangePasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.change.update');
});

Route::middleware(['auth', 'verified', 'tenant.match-user', 'force-password-change', 'permission:dashboard.view'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::middleware(['auth', 'verified', 'tenant.match-user', 'force-password-change'])->group(function () {
    Route::prefix('geo')->name('geo.')->group(function () {
        Route::get('paises', [GeoController::class, 'paises'])->name('paises');
        Route::get('departamentos', [GeoController::class, 'departamentos'])->name('departamentos');
        Route::get('provincias', [GeoController::class, 'provincias'])->name('provincias');
        Route::get('distritos', [GeoController::class, 'distritos'])->name('distritos');
    });

    // Web Push (tablet/PWA): suena aunque la app esté minimizada u otra pestaña.
    Route::get('push/status', [PushSubscriptionController::class, 'status'])
        ->name('push.status');
    Route::post('push/subscribe', [PushSubscriptionController::class, 'store'])
        ->name('push.subscribe');
    Route::delete('push/subscribe', [PushSubscriptionController::class, 'destroy'])
        ->name('push.unsubscribe');
    Route::post('push/test', [PushSubscriptionController::class, 'test'])
        ->name('push.test');
});

Route::middleware(['tenant.required', 'throttle:60,1'])
    ->get('m/{slug}', [\App\Http\Controllers\PublicMenuController::class, 'show'])
    ->where('slug', '[A-Za-z0-9\-]+')
    ->name('public.menu');

require __DIR__.'/settings.php';
require __DIR__.'/configuracion.php';
require __DIR__.'/facturacion.php';
require __DIR__.'/operacion.php';
require __DIR__.'/plataforma.php';
