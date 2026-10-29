<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'slug',
        'schema_name',
        'razon_social',
        'nombre_comercial',
        'ruc',
        'email_admin',
        'telefono',
        'direccion',
        'distrito_id',
        'estado',
        'trial_ends_at',
        'suspended_at',
        'suspension_reason',
        'cancelled_at',
        'cancel_reason',
        'onboarding_completado',
        'onboarding_paso',
        'timezone',
        'locale',
        'canal_adquisicion',
        'modulos_deshabilitados',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'suspended_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'onboarding_completado' => 'boolean',
            'modulos_deshabilitados' => 'array',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function distritoModel(): BelongsTo
    {
        return $this->belongsTo(Distrito::class, 'distrito_id');
    }

    public function activeSubscription(): ?Subscription
    {
        return $this->subscriptions()
            ->whereIn('estado', ['trial', 'active', 'grace'])
            ->latest()
            ->first();
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }
}
