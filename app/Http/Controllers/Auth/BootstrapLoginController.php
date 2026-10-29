<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BootstrapLoginController extends Controller
{
    public function show(Request $request, string $token): Response|RedirectResponse
    {
        $user = $this->resolveBootstrapUser($token);
        $restaurantName = $this->restaurantName();

        if ($user === null || $this->tokenExpired($user)) {
            return Inertia::render('auth/bootstrap-welcome', [
                'token' => null,
                'valid' => false,
                'restaurant_name' => $restaurantName,
                'error' => 'Este enlace no es válido o expiró. Usa «Olvidé mi contraseña» en el login.',
            ]);
        }

        return Inertia::render('auth/bootstrap-welcome', [
            'token' => $token,
            'valid' => true,
            'restaurant_name' => $restaurantName,
            'admin_email' => $user->email,
            'error' => null,
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        $user = $this->resolveBootstrapUser($token);

        abort_if($user === null, 404);
        abort_unless($user->is_active === true, 403);
        abort_if($this->tokenExpired($user), 403);

        $user->forceFill([
            'bootstrap_login_token' => null,
            'bootstrap_login_expires_at' => null,
        ])->save();

        Auth::guard('web')->login($user->fresh() ?? $user);
        $request->session()->regenerate();

        return redirect()
            ->route('security.edit')
            ->with('success', 'Bienvenido. Elige tu contraseña para entrar a tu restaurante.');
    }

    private function resolveBootstrapUser(string $token): ?User
    {
        $tenantId = tenant_id();
        if ($tenantId === null) {
            return null;
        }

        $token = trim($token);
        if ($token === '' || strlen($token) < 32) {
            return null;
        }

        return User::query()
            ->where('tenant_id', $tenantId)
            ->where('bootstrap_login_token', hash('sha256', $token))
            ->first();
    }

    private function tokenExpired(User $user): bool
    {
        return $user->bootstrap_login_expires_at !== null
            && $user->bootstrap_login_expires_at->isPast();
    }

    private function restaurantName(): ?string
    {
        $ctx = current_tenant();
        if ($ctx === null) {
            return null;
        }

        $comercial = trim((string) ($ctx->nombreComercial() ?? ''));
        if ($comercial !== '') {
            return $comercial;
        }

        $razon = trim($ctx->razonSocial());

        return $razon !== '' ? $razon : null;
    }
}
