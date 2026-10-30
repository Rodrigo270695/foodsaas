<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'created_by_id',
        'updated_by_id',
    ];

    protected function casts(): array
    {
        return [
            'activa' => 'boolean',
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
