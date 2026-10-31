<?php

declare(strict_types=1);

namespace App\Support\Operacion;

use App\Models\Pedido;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Alcance de pedidos:
 * - `pedidos.view` → ver (como mínimo los propios).
 * - `pedidos.view-all` → ver todos los de la sede (admin, gerente, cajero, rol custom).
 * Sin view-all: solo `opened_by` = usuario actual.
 */
final class PedidoVisibility
{
    public const PERMISSION_VIEW_ALL = 'pedidos.view-all';

    public static function canViewAll(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        if ($user->isPlatformSuperadmin()) {
            return true;
        }

        return $user->can(self::PERMISSION_VIEW_ALL);
    }

    public static function owns(Pedido $pedido, ?User $user): bool
    {
        if ($user === null || $pedido->opened_by === null) {
            return false;
        }

        return (int) $pedido->opened_by === (int) $user->id;
    }

    public static function canView(Pedido $pedido, ?User $user): bool
    {
        return self::canViewAll($user) || self::owns($pedido, $user);
    }

    public static function assertCanView(Pedido $pedido, ?User $user): void
    {
        if (! self::canView($pedido, $user)) {
            abort(403, 'Solo puedes ver los pedidos que abriste. Pide el permiso «Ver todos los pedidos» si necesitas el panorama completo.');
        }
    }

    /**
     * @param  Builder<Pedido>  $query
     * @return Builder<Pedido>
     */
    public static function constrainQuery(Builder $query, ?User $user): Builder
    {
        if (self::canViewAll($user)) {
            return $query;
        }

        if ($user === null) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where('opened_by', $user->id);
    }
}
