<?php

use App\Http\Controllers\FelAnulacionHistorialController;
use App\Http\Controllers\FelDocumentController;
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

        Route::middleware('permission:documentos.view')
            ->get('documentos', [FelDocumentController::class, 'index'])
            ->name('documentos');
        Route::middleware('permission:documentos.view')
            ->get('documentos/export', [FelDocumentController::class, 'exportExcel'])
            ->name('documentos.export');
        Route::middleware('permission:documentos.view')
            ->get('documentos/{felDocument}/download-xml', [FelDocumentController::class, 'downloadXml'])
            ->name('documentos.download-xml');
        Route::middleware('permission:documentos.view')
            ->get('documentos/{felDocument}/download-cdr', [FelDocumentController::class, 'downloadCdr'])
            ->name('documentos.download-cdr');
        Route::middleware('permission:documentos.view')
            ->get('documentos/{felDocument}/json', [FelDocumentController::class, 'json'])
            ->name('documentos.json');
        Route::middleware('permission:documentos.view')
            ->post('documentos/sincronizar-estados', [FelDocumentController::class, 'sincronizarEstados'])
            ->name('documentos.sincronizar-estados');
        Route::middleware('permission:documentos.view')
            ->post('documentos/{felDocument}/sincronizar-estado', [FelDocumentController::class, 'sincronizarEstado'])
            ->name('documentos.sincronizar-estado');
        Route::middleware('permission:documentos.create')
            ->post('documentos/{felDocument}/pasar-a-produccion', [FelDocumentController::class, 'pasarAProduccion'])
            ->name('documentos.pasar-a-produccion');

        Route::middleware('permission:notas-baja.view')
            ->get('notas-baja', [FelAnulacionHistorialController::class, 'notasBaja'])
            ->name('notas-baja');

        Route::middleware('permission:resumenes.view')
            ->get('resumenes', [FelAnulacionHistorialController::class, 'resumenes'])
            ->name('resumenes');
    });
