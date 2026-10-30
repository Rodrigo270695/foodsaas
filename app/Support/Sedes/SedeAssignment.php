<?php

declare(strict_types=1);

namespace App\Support\Sedes;

use App\Models\Sede;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Asignación usuario ↔ sede.
 *
 * Una sola sede (plan de 1 local o todavía no abrieron la segunda):
 * todos los usuarios quedan mapeados a esa sede, sin UI.
 *
 * Dos o más sedes activas: el admin elige en qué locales trabaja cada persona.
 */
final class SedeAssignment
{
    public static function tablesReady(): bool
    {
        try {
            // Tablas en public; hasTable() con search_path tenant-first falla.
            $row = DB::selectOne(
                "select to_regclass('public.sedes') as sedes, to_regclass('public.sede_user') as sede_user",
            );

            return $row !== null && $row->sedes !== null && $row->sede_user !== null;
        } catch (\Throwable) {
            return false;
        }
    }

    public static function requiresExplicitAssignment(?string $tenantId = null): bool
    {
        $tenantId = self::resolveTenantId($tenantId);
        if ($tenantId === null || ! self::tablesReady()) {
            return false;
        }

        return Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->count() > 1;
    }

    public static function soleActiveSedeId(?string $tenantId = null): ?string
    {
        $tenantId = self::resolveTenantId($tenantId);
        if ($tenantId === null || ! self::tablesReady()) {
            return null;
        }

        $ids = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('codigo')
            ->limit(2)
            ->pluck('id');

        return $ids->count() === 1 ? (string) $ids->first() : null;
    }

    public static function isTenantAdminRole(?string $roleName): bool
    {
        return $roleName === 'admin_restaurante';
    }

    /**
     * @param  list<string>|null  $sedeIds
     */
    public static function syncForUser(User $user, ?array $sedeIds, ?string $roleName = null): void
    {
        if (! self::tablesReady() || $user->tenant_id === null) {
            return;
        }

        $tenantId = (string) $user->tenant_id;
        $role = $roleName;
        if ($role === null) {
            try {
                $role = $user->getRoleNames()->first();
            } catch (\Throwable) {
                $role = null;
            }
        }

        // Admin del restaurante: siempre todas las sedes activas.
        if (self::isTenantAdminRole(is_string($role) ? $role : null)) {
            $all = Sede::query()
                ->where('tenant_id', $tenantId)
                ->where('activa', true)
                ->pluck('id')
                ->all();
            $user->sedes()->sync($all);

            return;
        }

        $sole = self::soleActiveSedeId($tenantId);

        if ($sole !== null) {
            $user->sedes()->sync([$sole]);

            return;
        }

        if (! self::requiresExplicitAssignment($tenantId)) {
            $user->sedes()->sync([]);

            return;
        }

        $valid = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->whereIn('id', array_values(array_filter($sedeIds ?? [])))
            ->pluck('id')
            ->all();

        $user->sedes()->sync($valid);
    }

    /**
     * Al crear una sede, los admins del tenant la reciben automáticamente.
     */
    public static function attachAdminsToSede(Sede $sede): void
    {
        if (! self::tablesReady()) {
            return;
        }

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId($sede->tenant_id);

        try {
            $admins = User::query()
                ->where('tenant_id', $sede->tenant_id)
                ->role('admin_restaurante')
                ->get();

            foreach ($admins as $admin) {
                $admin->sedes()->syncWithoutDetaching([(string) $sede->id]);
            }
        } finally {
            setPermissionsTeamId($previousTeam);
        }
    }

    public static function attachTenantUsersIfFirstSede(Sede $sede): void
    {
        if (! self::tablesReady()) {
            return;
        }

        $others = Sede::query()
            ->where('tenant_id', $sede->tenant_id)
            ->where('id', '!=', $sede->id)
            ->exists();

        if ($others) {
            return;
        }

        $userIds = User::query()
            ->where('tenant_id', $sede->tenant_id)
            ->pluck('id');

        foreach ($userIds as $userId) {
            $user = User::query()->find($userId);
            if ($user instanceof User) {
                $user->sedes()->syncWithoutDetaching([(string) $sede->id]);
            }
        }
    }

    /**
     * Si queda una sola sede activa, todos los usuarios del tenant se mapean a ella.
     */
    public static function reconcileTenant(?string $tenantId = null): void
    {
        $tenantId = self::resolveTenantId($tenantId);
        $sole = self::soleActiveSedeId($tenantId);

        if ($tenantId === null || $sole === null) {
            return;
        }

        $userIds = User::query()
            ->where('tenant_id', $tenantId)
            ->pluck('id');

        foreach ($userIds as $userId) {
            $user = User::query()->find($userId);
            if ($user instanceof User) {
                $user->sedes()->sync([$sole]);
            }
        }
    }

    /**
     * @return list<array{id: string, nombre: string, codigo: string}>
     */
    public static function catalogForTenant(?string $tenantId = null): array
    {
        $tenantId = self::resolveTenantId($tenantId);
        if ($tenantId === null || ! self::tablesReady()) {
            return [];
        }

        return Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo'])
            ->map(fn (Sede $sede): array => [
                'id' => (string) $sede->id,
                'nombre' => $sede->nombre,
                'codigo' => $sede->codigo,
            ])
            ->all();
    }

    private static function resolveTenantId(?string $tenantId): ?string
    {
        $resolved = $tenantId ?? (tenant_id() !== null ? (string) tenant_id() : null);

        return $resolved !== null && $resolved !== '' ? $resolved : null;
    }
}
