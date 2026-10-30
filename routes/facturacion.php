<?php

use App\Http\Controllers\FelSerieController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'tenant.required', 'tenant.match-user', 'force-password-change'])
    ->prefix('facturacion')
    ->name('facturacion.')
    ->group(function (): void {
        Route::middleware('permission:series.view')
            ->get('series', [FelSerieController::class, 'index'])
            ->name('series.index');
        Route::middleware('permission:series.create')
            ->post('series', [FelSerieController::class, 'store'])
            ->name('series.store');
        Route::middleware('permission:series.update')
            ->patch('series/{felSerie}', [FelSerieController::class, 'update'])
            ->name('series.update');
        Route::middleware('permission:series.delete')
            ->delete('series/{felSerie}', [FelSerieController::class, 'destroy'])
            ->name('series.destroy');
    });
