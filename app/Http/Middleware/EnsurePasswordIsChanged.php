<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fuerza el cambio de contraseña cuando `users.must_change_password = true`.
 */
class EnsurePasswordIsChanged
{
    /**
     * @var list<string>
     */
    protected array $allowedRoutes = [
        'password.change.form',
        'password.change.update',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('web')->user();

        if ($user === null) {
            return $next($request);
        }

        if (! $user instanceof User || $user->must_change_password !== true) {
            return $next($request);
        }

        $currentRoute = $request->route()?->getName();
        if ($currentRoute !== null && in_array($currentRoute, $this->allowedRoutes, true)) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            abort(409, 'Debes cambiar tu contraseña antes de continuar.');
        }

        return redirect()->route('password.change.form');
    }
}
