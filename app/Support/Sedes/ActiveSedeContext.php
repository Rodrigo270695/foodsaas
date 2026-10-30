<?php

declare(strict_types=1);

namespace App\Support\Sedes;

use App\Models\Sede;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sede operativa activa (sesión) + sedes accesibles por el usuario.
 *
 * - admin_restaurante / superadmin: todas las sedes activas del tenant.
 * - resto: solo las asignadas en sede_user (si no tiene ninguna y hay
 *   una sola sede activa, se auto-asigna para no bloquear la operación).
 */
final class ActiveSedeContext
{
    public const SESSION_KEY = 'active_sede_id';

    public static function tablesReady(): bool
    {
        try {
            // `sedes` vive en public. Con search_path tenant-first,
            // Schema::hasTable('sedes') mira solo current_schema() y falla.
            $row = DB::selectOne(
                "select to_regclass('public.sedes') as reg",
            );

            if ($row !== null && $row->reg !== null) {
                return true;
            }

            return Schema::hasTable('sedes');
        } catch (\Throwable) {
            return false;
        }
    }

    public static function userSeesAllSedes(?User $user = null): bool
    {
        $user ??= Auth::user();
        if (! $user instanceof User) {
            return false;
        }

        if ($user->isPlatformSuperadmin()) {
            return true;
        }

        try {
            return $user->hasRole('admin_restaurante');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @return list<array{id: string, nombre: string, codigo: string}>
     */
    public static function accessibleCatalog(?User $user = null, ?string $tenantId = null): array
    {
        $user ??= Auth::user();
        $tenantId = $tenantId ?? (tenant_id() !== null ? (string) tenant_id() : null);

        if ($tenantId === null || ! self::tablesReady() || ! $user instanceof User) {
            return [];
        }

        $query = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre');

        if (! self::userSeesAllSedes($user)) {
            $assigned = $user->sedes()->pluck('sedes.id')->map(fn ($id) => (string) $id)->all();

            if ($assigned === []) {
                $sole = SedeAssignment::soleActiveSedeId($tenantId);
                if ($sole !== null) {
                    try {
                        $user->sedes()->syncWithoutDetaching([$sole]);
                    } catch (\Throwable) {
                        // no bloquear lectura
                    }
                    $assigned = [$sole];
                }
            }

            if ($assigned === []) {
                return [];
            }

            $query->whereIn('id', $assigned);
        }

        return $query
            ->get(['id', 'nombre', 'codigo'])
            ->map(fn (Sede $sede): array => [
                'id' => (string) $sede->id,
                'nombre' => $sede->nombre,
                'codigo' => $sede->codigo,
            ])
            ->all();
    }

    /**
     * @return list<string>
     */
    public static function accessibleIds(?User $user = null, ?string $tenantId = null): array
    {
        return array_column(self::accessibleCatalog($user, $tenantId), 'id');
    }

    public static function id(?User $user = null, ?string $tenantId = null): ?string
    {
        $catalog = self::accessibleCatalog($user, $tenantId);
        if ($catalog === []) {
            return null;
        }

        $ids = array_column($catalog, 'id');
        $sessionId = session(self::SESSION_KEY);

        if (is_string($sessionId) && $sessionId !== '' && in_array($sessionId, $ids, true)) {
            return $sessionId;
        }

        $fallback = $ids[0];
        session([self::SESSION_KEY => $fallback]);

        return $fallback;
    }

    public static function set(string $sedeId, ?User $user = null, ?string $tenantId = null): bool
    {
        $ids = self::accessibleIds($user, $tenantId);
        if (! in_array($sedeId, $ids, true)) {
            return false;
        }

        session([self::SESSION_KEY => $sedeId]);

        return true;
    }

    /**
     * @return array{id: string|null, sedes: list<array{id: string, nombre: string, codigo: string}>, can_switch: bool}|null
     */
    public static function sharedPayload(?User $user = null): ?array
    {
        if (tenant_id() === null || ! self::tablesReady()) {
            return null;
        }

        $sedes = self::accessibleCatalog($user);
        $activeId = self::id($user);

        return [
            'id' => $activeId,
            'sedes' => $sedes,
            'can_switch' => count($sedes) > 1,
        ];
    }

    public static function assertAccessible(string $sedeId, ?User $user = null, ?string $tenantId = null): void
    {
        if (! in_array($sedeId, self::accessibleIds($user, $tenantId), true)) {
            abort(403, 'No tienes acceso a esta sede.');
        }
    }
}
