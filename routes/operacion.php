<?php

use App\Http\Controllers\ActiveSedeController;
use App\Http\Controllers\AlmacenController;
use App\Http\Controllers\CajaController;
use App\Http\Controllers\CartaController;
use App\Http\Controllers\CartaMenuController;
use App\Http\Controllers\CocinaController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\SalonController;
use App\Http\Controllers\VentaController;
use Illuminate\Support\Facades\Route;

// Push en tenant (sin middleware verified: el fetch JSON no debe caer en redirect de verificación).
Route::middleware(['auth', 'tenant.required', 'tenant.match-user', 'force-password-change'])
    ->group(function (): void {
        Route::get('push/status', [PushSubscriptionController::class, 'status'])
            ->name('push.status');
        Route::post('push/subscribe', [PushSubscriptionController::class, 'store'])
            ->name('push.subscribe');
        Route::delete('push/subscribe', [PushSubscriptionController::class, 'destroy'])
            ->name('push.unsubscribe');
        Route::post('push/test', [PushSubscriptionController::class, 'test'])
            ->name('push.test');
    });

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
                    ->get('movimientos', [AlmacenController::class, 'movimientos'])
                    ->name('movimientos.index');
                Route::middleware('permission:almacen.export')
                    ->get('movimientos/export', [AlmacenController::class, 'exportMovimientos'])
                    ->name('movimientos.export');
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
                Route::middleware('permission:salon.update')
                    ->post('mesas/unir', [SalonController::class, 'unirMesas'])
                    ->name('mesas.unir');
                Route::middleware('permission:salon.update')
                    ->post('mesas/{mesa}/separar', [SalonController::class, 'separarMesa'])
                    ->name('mesas.separar');
                Route::middleware('permission:salon.delete')
                    ->delete('mesas/{mesa}', [SalonController::class, 'destroyMesa'])
                    ->name('mesas.destroy');
            });

        Route::prefix('pedidos')
            ->name('pedidos.')
            ->group(function (): void {
                Route::middleware('permission:pedidos.view')
                    ->get('/', [PedidoController::class, 'index'])
                    ->name('index');
                Route::middleware('permission:pedidos.create')
                    ->post('/', [PedidoController::class, 'store'])
                    ->name('store');
                Route::middleware('permission:pedidos.view')
                    ->get('{pedido}', [PedidoController::class, 'show'])
                    ->name('show');
                Route::middleware('permission:pedidos.update')
                    ->post('{pedido}/lineas', [PedidoController::class, 'storeLinea'])
                    ->name('lineas.store');
                Route::middleware('permission:pedidos.update')
                    ->patch('{pedido}/lineas/{linea}', [PedidoController::class, 'updateLinea'])
                    ->name('lineas.update');
                Route::middleware('permission:pedidos.update')
                    ->delete('{pedido}/lineas/{linea}', [PedidoController::class, 'destroyLinea'])
                    ->name('lineas.destroy');
                Route::middleware('permission:pedidos.enviar')
                    ->post('{pedido}/enviar', [PedidoController::class, 'enviar'])
                    ->name('enviar');
                Route::middleware('permission:pedidos.update')
                    ->post('{pedido}/lineas/{linea}/entregado', [PedidoController::class, 'marcarEntregado'])
                    ->name('lineas.entregado');
                Route::middleware('permission:pedidos.anular')
                    ->post('{pedido}/anular', [PedidoController::class, 'anular'])
                    ->name('anular');
            });

        Route::prefix('cocina')
            ->name('cocina.')
            ->group(function (): void {
                Route::middleware('permission:cocina.view')
                    ->get('/', [CocinaController::class, 'index'])
                    ->name('index');
                Route::middleware('permission:cocina.update')
                    ->post('lineas/{linea}/listo', [CocinaController::class, 'marcarListo'])
                    ->name('lineas.listo');
            });

        Route::prefix('caja')
            ->name('caja.')
            ->group(function (): void {
                Route::middleware('permission:caja.view')
                    ->get('/', [CajaController::class, 'index'])
                    ->name('index');
                Route::middleware('permission:caja.abrir')
                    ->post('abrir', [CajaController::class, 'abrir'])
                    ->name('abrir');
                Route::middleware('permission:caja.cerrar')
                    ->post('cerrar', [CajaController::class, 'cerrar'])
                    ->name('cerrar');
                Route::middleware('permission:caja.abrir')
                    ->post('{cajaSesion}/reabrir', [CajaController::class, 'reabrir'])
                    ->name('reabrir');
                Route::middleware('permission:caja.view')
                    ->get('{cajaSesion}/arqueo', [CajaController::class, 'arqueo'])
                    ->name('arqueo');
                Route::middleware('permission:caja.view')
                    ->get('{cajaSesion}/arqueo-pdf', [CajaController::class, 'arqueoPdf'])
                    ->name('arqueo-pdf');
                Route::middleware('permission:caja.view')
                    ->get('{cajaSesion}/arqueo-ticket', [CajaController::class, 'arqueoTicket'])
                    ->name('arqueo-ticket');
                Route::middleware('permission:caja.egreso')
                    ->post('egresos', [CajaController::class, 'egreso'])
                    ->name('egresos.store');
            });

        Route::prefix('ventas')
            ->name('ventas.')
            ->group(function (): void {
                Route::middleware('permission:ventas.view|caja.view')
                    ->get('/', [VentaController::class, 'index'])
                    ->name('index');
                Route::middleware('permission:ventas.export|ventas.view|caja.view')
                    ->get('export', [VentaController::class, 'export'])
                    ->name('export');
                Route::middleware('permission:ventas.view|caja.view')
                    ->get('pendientes', [VentaController::class, 'pendientes'])
                    ->name('pendientes');
                Route::middleware('permission:ventas.create|caja.cobrar|pedidos.cobrar')
                    ->get('nueva', [VentaController::class, 'create'])
                    ->name('create');
                Route::middleware('permission:ventas.create|caja.cobrar|pedidos.cobrar')
                    ->get('consulta-dni', [VentaController::class, 'consultaDni'])
                    ->name('consulta-dni');
                Route::middleware('permission:ventas.create|caja.cobrar|pedidos.cobrar')
                    ->get('consulta-ruc', [VentaController::class, 'consultaRuc'])
                    ->name('consulta-ruc');
                Route::middleware('permission:ventas.create|caja.cobrar|pedidos.cobrar')
                    ->post('/', [VentaController::class, 'store'])
                    ->name('store');
                Route::middleware('permission:ventas.view|caja.view')
                    ->get('{venta}/detalle', [VentaController::class, 'detalle'])
                    ->name('detalle');
                Route::middleware('permission:ventas.view|caja.view')
                    ->get('{venta}/ticket', [VentaController::class, 'ticket'])
                    ->name('ticket');
                Route::middleware('permission:ventas.view|caja.view')
                    ->get('{venta}/ticket-pdf', [VentaController::class, 'ticketPdf'])
                    ->name('ticket-pdf');
                Route::middleware('permission:ventas.create|caja.cobrar|pedidos.cobrar|documentos.create')
                    ->post('{venta}/emitir-fel', [VentaController::class, 'emitirFel'])
                    ->name('emitir-fel');
                Route::middleware('permission:ventas.delete')
                    ->post('{venta}/anular', [VentaController::class, 'anular'])
                    ->name('anular');
                Route::middleware('permission:ventas.create|caja.cobrar|pedidos.cobrar')
                    ->get('desde-pedido/{pedido}', [VentaController::class, 'cobrarForm'])
                    ->name('desde-pedido');
                Route::middleware('permission:ventas.create|caja.cobrar|pedidos.cobrar')
                    ->post('cobrar/{pedido}', [VentaController::class, 'cobrar'])
                    ->name('cobrar');
            });
    });
