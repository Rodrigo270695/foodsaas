<?php

use App\Http\Controllers\RoleController;
use App\Http\Controllers\SedeController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('configuracion')->name('configuracion.')->group(function (): void {
    Route::middleware('permission:sedes.view')
        ->get('sedes', [SedeController::class, 'index'])
        ->name('sedes.index');
    Route::middleware('permission:sedes.export')
        ->get('sedes/export', [SedeController::class, 'export'])
        ->name('sedes.export');
    Route::middleware('permission:sedes.create')
        ->post('sedes', [SedeController::class, 'store'])
        ->name('sedes.store');
    Route::middleware('permission:sedes.bulk-delete')
        ->delete('sedes/bulk', [SedeController::class, 'bulkDestroy'])
        ->name('sedes.bulk-destroy');
    Route::middleware('permission:sedes.update')
        ->match(['put', 'patch'], 'sedes/{sede}', [SedeController::class, 'update'])
        ->name('sedes.update');
    Route::middleware('permission:sedes.delete')
        ->delete('sedes/{sede}', [SedeController::class, 'destroy'])
        ->name('sedes.destroy');

    Route::middleware('permission:roles.view')
        ->get('roles', [RoleController::class, 'index'])
        ->name('roles.index');
    Route::middleware('permission:roles.export')
        ->get('roles/export', [RoleController::class, 'export'])
        ->name('roles.export');
    Route::middleware('permission:roles.create')
        ->post('roles', [RoleController::class, 'store'])
        ->name('roles.store');
    Route::middleware('permission:roles.bulk-delete')
        ->delete('roles/bulk', [RoleController::class, 'bulkDestroy'])
        ->name('roles.bulk-destroy');
    Route::middleware('permission:roles.update')
        ->put('roles/{role}/permissions', [RoleController::class, 'updatePermissions'])
        ->name('roles.update-permissions');
    Route::middleware('permission:roles.update')
        ->match(['put', 'patch'], 'roles/{role}', [RoleController::class, 'update'])
        ->name('roles.update');
    Route::middleware('permission:roles.delete')
        ->delete('roles/{role}', [RoleController::class, 'destroy'])
        ->name('roles.destroy');

    Route::middleware('permission:usuarios.view')
        ->get('usuarios', [UserController::class, 'index'])
        ->name('usuarios.index');
    Route::middleware('permission:usuarios.export')
        ->get('usuarios/export', [UserController::class, 'export'])
        ->name('usuarios.export');
    Route::middleware('permission:usuarios.create|usuarios.update')
        ->get('usuarios/consulta-dni', [UserController::class, 'consultaDni'])
        ->name('usuarios.consulta-dni');
    Route::middleware('permission:usuarios.create')
        ->post('usuarios', [UserController::class, 'store'])
        ->name('usuarios.store');
    Route::middleware('permission:usuarios.bulk-delete')
        ->delete('usuarios/bulk', [UserController::class, 'bulkDestroy'])
        ->name('usuarios.bulk-destroy');
    Route::middleware('permission:usuarios.update')
        ->match(['put', 'patch'], 'usuarios/{user}', [UserController::class, 'update'])
        ->name('usuarios.update');
    Route::middleware('permission:usuarios.update')
        ->match(['put', 'patch'], 'usuarios/{user}/documentos', [UserController::class, 'updateDocuments'])
        ->name('usuarios.update-documents');
    Route::middleware('permission:usuarios.delete')
        ->delete('usuarios/{user}', [UserController::class, 'destroy'])
        ->name('usuarios.destroy');
    Route::middleware('permission:usuarios.reset-password')
        ->post('usuarios/{user}/reset-password', [UserController::class, 'resetPassword'])
        ->name('usuarios.reset-password');
});
