<?php

use App\Http\Controllers\CartaController;
use App\Http\Controllers\SalonController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'tenant.required', 'tenant.match-user', 'force-password-change'])
    ->group(function (): void {
        Route::prefix('carta')
            ->name('carta.')
            ->group(function (): void {
                Route::middleware('permission:carta.view')
                    ->get('/', [CartaController::class, 'index'])
                    ->name('index');

                Route::middleware('permission:carta.view')
                    ->get('armar', [CartaController::class, 'builder'])
                    ->name('builder');

                Route::middleware('permission:carta.create')
                    ->post('areas', [CartaController::class, 'storeArea'])
                    ->name('areas.store');

                Route::middleware('permission:carta.create')
                    ->post('categorias', [CartaController::class, 'storeCategoria'])
                    ->name('categorias.store');
                Route::middleware('permission:carta.update')
                    ->patch('categorias/{categoriaCarta}', [CartaController::class, 'updateCategoria'])
                    ->name('categorias.update');
                Route::middleware('permission:carta.delete')
                    ->delete('categorias/{categoriaCarta}', [CartaController::class, 'destroyCategoria'])
                    ->name('categorias.destroy');

                Route::middleware('permission:carta.create')
                    ->post('productos', [CartaController::class, 'storeProducto'])
                    ->name('productos.store');
                Route::middleware('permission:carta.update')
                    ->patch('productos/{productoCarta}', [CartaController::class, 'updateProducto'])
                    ->name('productos.update');
                Route::middleware('permission:carta.delete')
                    ->delete('productos/{productoCarta}', [CartaController::class, 'destroyProducto'])
                    ->name('productos.destroy');
            });

        Route::prefix('salon')
            ->name('salon.')
            ->group(function (): void {
                Route::middleware('permission:salon.view')
                    ->get('/', [SalonController::class, 'index'])
                    ->name('index');

                Route::middleware('permission:salon.create')
                    ->post('zonas', [SalonController::class, 'storeZona'])
                    ->name('zonas.store');
                Route::middleware('permission:salon.update')
                    ->patch('zonas/{zona}', [SalonController::class, 'updateZona'])
                    ->name('zonas.update');
                Route::middleware('permission:salon.delete')
                    ->delete('zonas/{zona}', [SalonController::class, 'destroyZona'])
                    ->name('zonas.destroy');

                Route::middleware('permission:salon.create')
                    ->post('mesas', [SalonController::class, 'storeMesa'])
                    ->name('mesas.store');
                Route::middleware('permission:salon.update')
                    ->patch('mesas/{mesa}', [SalonController::class, 'updateMesa'])
                    ->name('mesas.update');
                Route::middleware('permission:salon.delete')
                    ->delete('mesas/{mesa}', [SalonController::class, 'destroyMesa'])
                    ->name('mesas.destroy');
            });
    });
