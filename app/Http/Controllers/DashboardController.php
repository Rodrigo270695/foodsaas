<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Dashboard\PlatformDashboardMetrics;
use App\Services\Dashboard\TenantDashboardMetrics;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(
        Request $request,
        TenantDashboardMetrics $tenantMetrics,
        PlatformDashboardMetrics $platformMetrics,
    ): Response {
        $user = $request->user();
        $onPlatform = $user instanceof User
            && $user->isPlatformSuperadmin()
            && (tenant_id() === null || tenant_id() === '');

        if ($onPlatform) {
            return Inertia::render('dashboard', [
                'mode' => 'platform',
                'platform' => $platformMetrics->build(),
                'tenant' => null,
            ]);
        }

        return Inertia::render('dashboard', [
            'mode' => 'tenant',
            'tenant' => $tenantMetrics->build(),
            'platform' => null,
        ]);
    }
}
