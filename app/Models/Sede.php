<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use App\Support\Restaurante\HorarioAtencion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $nombre
 * @property string $codigo
 */
class Sede extends Model
{
    use HasUuids;
    use SoftDeletes;
    use UsesPublicSchema;

    protected $table = 'sedes';

    protected $fillable = [
        'tenant_id',
        'nombre',
        'codigo',
        'direccion',
        'telefono',
        'email',
        'distrito_id',
        'distrito',
        'provincia',
        'departamento',
        'serie_factura',
        'serie_boleta',
        'activa',
        'horario_atencion',
        'created_by_id',
        'updated_by_id',
    ];

    protected function casts(): array
    {
        return [
            'activa' => 'boolean',
            'horario_atencion' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public function distritoModel(): BelongsTo
    {
        return $this->belongsTo(Distrito::class, 'distrito_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'sede_user')->withTimestamps();
    }

    /**
     * @return array<string, array{abierto: bool, abre: string, cierra: string}>
     */
    public function horarioAtencionNormalizado(): array
    {
        return HorarioAtencion::normalize($this->horario_atencion);
    }

    public static function generateNextCode(string $tenantId): string
    {
        $maxNumber = self::withTrashed()
            ->where('tenant_id', $tenantId)
            ->pluck('codigo')
            ->map(fn ($c) => (int) preg_replace('/\D/', '', (string) $c))
            ->max() ?? 0;

        return 'SEDE-'.str_pad((string) ($maxNumber + 1), 3, '0', STR_PAD_LEFT);
    }
}
