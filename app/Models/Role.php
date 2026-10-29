<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * @property-read bool $is_system
 */
class Role extends SpatieRole
{
    public const PLATFORM_ROLES = ['superadmin'];

    public const BASE_RESTAURANT_ROLES = [
        'admin_restaurante',
        'gerente',
        'cajero',
        'mesero',
        'cocina',
    ];

    public const SYSTEM_ROLES = [
        'superadmin',
        ...self::BASE_RESTAURANT_ROLES,
    ];

    protected $fillable = [
        'name',
        'guard_name',
        'description',
        'tenant_id',
    ];

    protected $appends = [
        'is_system',
    ];

    /**
     * @return list<string>
     */
    public static function protectedRoleNames(): array
    {
        return self::SYSTEM_ROLES;
    }

    /**
     * @return list<string>
     */
    public static function platformOnlyRoleNames(): array
    {
        return self::PLATFORM_ROLES;
    }

    protected function isSystem(): Attribute
    {
        return Attribute::make(
            get: fn () => in_array($this->name, self::protectedRoleNames(), true),
        );
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        if ($type === 'sistema') {
            return $query->whereIn('name', self::protectedRoleNames());
        }

        if ($type === 'personalizado') {
            return $query->whereNotIn('name', self::protectedRoleNames());
        }

        return $query;
    }
}
