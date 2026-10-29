<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['tenant_id', 'name', 'email', 'password', 'phone', 'is_active', 'created_by_id', 'must_change_password', 'bootstrap_login_token', 'bootstrap_login_expires_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'bootstrap_login_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    private ?bool $isPlatformSuperadminMemo = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
            'bootstrap_login_expires_at' => 'datetime',
        ];
    }

    public function isCentral(): bool
    {
        return $this->tenant_id === null;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function isTenantUser(): bool
    {
        return $this->tenant_id !== null;
    }

    public function isInternalSystemAccount(): bool
    {
        $email = strtolower(trim((string) $this->email));

        return $email !== ''
            && (str_ends_with($email, '@vetsaas.internal')
                || str_ends_with($email, '@foodsaas.internal'));
    }

    public function belongsToTenant(?string $tenantId): bool
    {
        if ($tenantId === null) {
            return $this->tenant_id === null;
        }

        return (string) $this->tenant_id === $tenantId;
    }

    public function isPlatformSuperadmin(): bool
    {
        if ($this->isPlatformSuperadminMemo !== null) {
            return $this->isPlatformSuperadminMemo;
        }

        if (! $this->isCentral()) {
            return $this->isPlatformSuperadminMemo = false;
        }

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId(null);

        try {
            $this->unsetRelation('roles');

            return $this->isPlatformSuperadminMemo = $this->hasRole('superadmin');
        } finally {
            setPermissionsTeamId($previousTeam);
            $this->unsetRelation('roles');
        }
    }
}
