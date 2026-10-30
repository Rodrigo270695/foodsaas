<?php

use App\Http\Controllers\ActiveSedeController;
use App\Http\Controllers\AlmacenController;
use App\Http\Controllers\CartaController;
use App\Http\Controllers\CartaMenuController;
use App\Http\Controllers\SalonController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'tenant.required', 'tenant.match-user', 'force-password-change'])
    ->group(function (): void {
        Route::post('sede-activa', [ActiveSedeController::class, 'update'])
            ->name('sede-activa.update');

        Route::prefix('carta')
            ->name('carta.')
            ->group(function (): void {
                Route::middleware('permission:carta.view')
                    ->get('/', [CartaController::class, 'index'])
                    ->name('index');
                Route::middleware('permission:carta.export')
                    ->get('export', [CartaController::class, 'export'])
                    ->name('export');
                Route::middleware('permission:carta.manage-productos')
                    ->post('copy-to-sede', [CartaController::class, 'copyToSede'])
                    ->name('copy-to-sede');

                Route::middleware('permission:carta.view')
                    ->get('armar', [CartaMenuController::class, 'index'])
                    ->name('menus.index');
                Route::middleware('permission:carta.armar')
                    ->post('armar', [CartaMenuController::class, 'store'])
                    ->name('menus.store');
                Route::middleware('permission:carta.view')
                    ->get('armar/{menuCarta}', [CartaMenuController::class, 'edit'])
                    ->name('menus.edit');
                Route::middleware('permission:carta.view')
                    ->get('armar/{menuCarta}/vista', [CartaMenuController::class, 'preview'])
                    ->name('menus.preview');
                Route::middleware('permission:carta.armar')
                    ->patch('armar/{menuCarta}', [CartaMenuController::class, 'update'])
                    ->name('menus.update');
                Route::middleware('permission:carta.armar')
                    ->put('armar/{menuCarta}/items', [CartaMenuController::class, 'syncItems'])
                    ->name('menus.items.sync');
                Route::middleware('permission:carta.armar')
                    ->delete('armar/{menuCarta}', [CartaMenuController::class, 'destroy'])
                    ->name('menus.destroy');

                Route::middleware('permission:carta.manage-areas')
                    ->post('areas', [CartaController::class, 'storeArea'])
                    ->name('areas.store');
                Route::middleware('permission:carta.manage-areas')
                    ->delete('areas/{areaCarta}', [CartaController::class, 'destroyArea'])
                    ->name('areas.destroy');

                Route::middleware('permission:carta.manage-categorias')
                    ->post('categorias', [CartaController::class, 'storeCategoria'])
                    ->name('categorias.store');
                Route::middleware('permission:carta.manage-categorias')
                    ->patch('categorias/{categoriaCarta}', [CartaController::class, 'updateCategoria'])
                    ->name('categorias.update');
                Route::middleware('permission:carta.manage-categorias')
                    ->delete('categorias/{categoriaCarta}', [CartaController::class, 'destroyCategoria'])
                    ->name('categorias.destroy');

                Route::middleware('permission:carta.manage-productos')
                    ->post('productos', [CartaController::class, 'storeProducto'])
                    ->name('productos.store');
                Route::middleware('permission:carta.manage-productos')
                    ->patch('productos/{productoCarta}', [CartaController::class, 'updateProducto'])
                    ->name('productos.update');
                Route::middleware('permission:carta.manage-productos')
                    ->delete('productos/{productoCarta}', [CartaController::class, 'destroyProducto'])
                    ->name('productos.destroy');
            });

        Route::prefix('almacen')
            ->name('almacen.')
            ->group(function (): void {
                Route::middleware('permission:almacen.view')
                    ->get('/', [AlmacenController::class, 'index'])
                    ->name('index');
                Route::middleware('permission:almacen.export')
                    ->get('export', [AlmacenController::class, 'exportStock'])
                    ->name('export');
                Route::middleware('permission:almacen.view')
                    ->get('{productoCarta}/kardex', [AlmacenController::class, 'kardex'])
                    ->name('kardex');
                Route::middleware('permission:almacen.export')
                    ->get('{productoCarta}/kardex/export', [AlmacenController::class, 'exportKardex'])
                    ->name('kardex.export');
                Route::middleware('permission:almacen.ajustar')
                    ->post('{productoCarta}/movimientos', [AlmacenController::class, 'storeMovimiento'])
                    ->name('movimientos.store');
            });

        Route::prefix('salon')
            ->name('salon.')
            ->group(function (): void {
                Route::middleware('permission:salon.view')
                    ->get('/', [SalonController::class, 'index'])
                    ->name('index');
                Route::middleware('permission:salon.create')
                    ->post('copy-to-sede', [SalonController::class, 'copyToSede'])
                    ->name('copy-to-sede');

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
