<?php

use App\Http\Controllers\GeoController;
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

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('impersonate/leave', [TenantImpersonationController::class, 'leave'])
        ->name('impersonate.leave');
});

Route::middleware(['auth', 'verified', 'tenant.match-user', 'permission:dashboard.view'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('geo')->name('geo.')->group(function () {
        Route::get('paises', [GeoController::class, 'paises'])->name('paises');
        Route::get('departamentos', [GeoController::class, 'departamentos'])->name('departamentos');
        Route::get('provincias', [GeoController::class, 'provincias'])->name('provincias');
        Route::get('distritos', [GeoController::class, 'distritos'])->name('distritos');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/configuracion.php';
require __DIR__.'/facturacion.php';
require __DIR__.'/plataforma.php';
