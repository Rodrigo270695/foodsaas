<?php

use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\TenantImpersonationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'tenant.none'])->prefix('plataforma')->name('plataforma.')->group(function (): void {
    Route::middleware('permission:plataforma-tenants.view')
        ->get('tenants', [TenantController::class, 'index'])
        ->name('tenants.index');
    Route::middleware('permission:plataforma-tenants.export')
        ->get('tenants/export', [TenantController::class, 'export'])
        ->name('tenants.export');
    Route::middleware('permission:plataforma-tenants.create')
        ->post('tenants', [TenantController::class, 'store'])
        ->name('tenants.store');
    Route::middleware('permission:plataforma-tenants.bulk-delete')
        ->delete('tenants/bulk', [TenantController::class, 'bulkDestroy'])
        ->name('tenants.bulk-destroy');
    Route::middleware('permission:plataforma-tenants.suspend')
        ->post('tenants/{tenant}/suspend', [TenantController::class, 'suspend'])
        ->name('tenants.suspend');
    Route::middleware('permission:plataforma-tenants.resume')
        ->post('tenants/{tenant}/resume', [TenantController::class, 'resume'])
        ->name('tenants.resume');
    Route::middleware('permission:plataforma-tenants.update')
        ->post('tenants/{tenant}/provision-schema', [TenantController::class, 'provisionSchema'])
        ->name('tenants.provision-schema');
    Route::middleware('permission:plataforma-tenants.update')
        ->post('tenants/{tenant}/recover-admin-access', [TenantController::class, 'recoverAdminAccess'])
        ->name('tenants.recover-admin-access');
    Route::middleware('permission:plataforma-tenants.update')
        ->match(['put', 'patch'], 'tenants/{tenant}', [TenantController::class, 'update'])
        ->name('tenants.update');
    Route::middleware('permission:plataforma-tenants.delete')
        ->delete('tenants/{tenant}', [TenantController::class, 'destroy'])
        ->name('tenants.destroy');
    Route::middleware('permission:plataforma-tenants.impersonate')
        ->post('tenants/{tenant}/impersonate', [TenantImpersonationController::class, 'start'])
        ->name('tenants.impersonate');

    Route::middleware('permission:plataforma-planes.view')
        ->get('planes', [PlanController::class, 'index'])
        ->name('planes.index');
    Route::middleware('permission:plataforma-planes.export')
        ->get('planes/export', [PlanController::class, 'export'])
        ->name('planes.export');
    Route::middleware('permission:plataforma-planes.create')
        ->post('planes', [PlanController::class, 'store'])
        ->name('planes.store');
    Route::middleware('permission:plataforma-planes.bulk-delete')
        ->delete('planes/bulk', [PlanController::class, 'bulkDestroy'])
        ->name('planes.bulk-destroy');
    Route::middleware('permission:plataforma-planes.update')
        ->put('planes/{plan}/features', [PlanController::class, 'updateFeatures'])
        ->name('planes.update-features');
    Route::middleware('permission:plataforma-planes.update')
        ->match(['put', 'patch'], 'planes/{plan}', [PlanController::class, 'update'])
        ->name('planes.update');
    Route::middleware('permission:plataforma-planes.delete')
        ->delete('planes/{plan}', [PlanController::class, 'destroy'])
        ->name('planes.destroy');

    Route::middleware('permission:plataforma-suscripciones.view')
        ->get('suscripciones', [SubscriptionController::class, 'index'])
        ->name('suscripciones.index');
    Route::middleware('permission:plataforma-suscripciones.export')
        ->get('suscripciones/export', [SubscriptionController::class, 'export'])
        ->name('suscripciones.export');
    Route::middleware('permission:plataforma-suscripciones.create')
        ->post('suscripciones', [SubscriptionController::class, 'store'])
        ->name('suscripciones.store');
    Route::middleware('permission:plataforma-suscripciones.bulk-delete')
        ->delete('suscripciones/bulk', [SubscriptionController::class, 'bulkDestroy'])
        ->name('suscripciones.bulk-destroy');
    Route::middleware('permission:plataforma-suscripciones.update')
        ->match(['put', 'patch'], 'suscripciones/{suscripcion}', [SubscriptionController::class, 'update'])
        ->name('suscripciones.update');
    Route::middleware('permission:plataforma-suscripciones.extend-trial')
        ->post('suscripciones/{suscripcion}/extend-trial', [SubscriptionController::class, 'extendTrial'])
        ->name('suscripciones.extend-trial');
    Route::middleware('permission:plataforma-suscripciones.change-plan')
        ->post('suscripciones/{suscripcion}/change-plan', [SubscriptionController::class, 'changePlan'])
        ->name('suscripciones.change-plan');
    Route::middleware('permission:plataforma-suscripciones.cancel')
        ->post('suscripciones/{suscripcion}/cancel', [SubscriptionController::class, 'cancel'])
        ->name('suscripciones.cancel');
    Route::middleware('permission:plataforma-suscripciones.delete')
        ->delete('suscripciones/{suscripcion}', [SubscriptionController::class, 'destroy'])
        ->name('suscripciones.destroy');
});
