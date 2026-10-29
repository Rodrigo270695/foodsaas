<?php

use App\Http\Controllers\Api\Internal\SaasProvisionController;
use App\Http\Controllers\Api\Internal\SalesKnowledgeController;
use App\Http\Middleware\VerifyOrvaeProvisionSignature;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/saas')
    ->middleware(VerifyOrvaeProvisionSignature::class)
    ->group(function (): void {
        Route::post('provision', [SaasProvisionController::class, 'provision'])
            ->name('api.internal.saas.provision');

        Route::post('renew', [SaasProvisionController::class, 'renew'])
            ->name('api.internal.saas.renew');

        Route::get('tenants/{slug}', [SaasProvisionController::class, 'status'])
            ->name('api.internal.saas.status');

        Route::get('lookup', [SaasProvisionController::class, 'lookupByEmail'])
            ->name('api.internal.saas.lookup');

        Route::get('salesbot-knowledge', SalesKnowledgeController::class)
            ->name('api.internal.saas.salesbot-knowledge');
    });
