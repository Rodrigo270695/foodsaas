<?php

use App\Http\Controllers\Auth\BootstrapLoginController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['tenant.required'])->group(function (): void {
    Route::get('/auth/bienvenida/{token}', [BootstrapLoginController::class, 'show'])
        ->name('tenant.auth.bootstrap');
    Route::post('/auth/bienvenida/{token}', [BootstrapLoginController::class, 'store'])
        ->name('tenant.auth.bootstrap.store');

    Route::get('/', function () {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        $ctx = tenant();

        return Inertia::render('tenant/welcome', [
            'restaurant' => [
                'slug' => $ctx?->slug,
                'razon_social' => $ctx?->razonSocial(),
                'nombre_comercial' => $ctx?->nombreComercial(),
            ],
        ]);
    })->name('tenant.home');
});
