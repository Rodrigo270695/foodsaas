<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * @property string $id
 * @property string $sede_id
 * @property int $tipo_comprobante
 * @property string $serie
 * @property int $ultimo_correlativo
 * @property bool $activo
 */
class FelSerie extends Model
{
    use HasUuids;

    public const TIPO_TICKET = 0;

    public const TIPO_FACTURA = 1;

    public const TIPO_BOLETA = 2;

    public const TIPO_NOTA_CREDITO = 3;

    public const TIPO_NOTA_DEBITO = 4;

    public const TIPO_GUIA_REMISION = 5;

    /**
     * @return list<int>
     */
    public static function tiposSunat(): array
    {
        return [
            self::TIPO_FACTURA,
            self::TIPO_BOLETA,
            self::TIPO_NOTA_CREDITO,
            self::TIPO_NOTA_DEBITO,
            self::TIPO_GUIA_REMISION,
        ];
    }

    public static function esTipoSunat(?int $tipo): bool
    {
        return $tipo !== null && in_array($tipo, self::tiposSunat(), true);
    }

    public static function labelTipo(int $tipo): string
    {
        return match ($tipo) {
            self::TIPO_FACTURA => 'Factura',
            self::TIPO_BOLETA => 'Boleta de Venta',
            self::TIPO_NOTA_CREDITO => 'Nota de Crédito',
            self::TIPO_NOTA_DEBITO => 'Nota de Débito',
            self::TIPO_GUIA_REMISION => 'Guía de Remisión',
            default => 'Ticket',
        };
    }

    public static function prefijosPermitidos(int $tipo): string
    {
        return match ($tipo) {
            self::TIPO_FACTURA => 'F### (ej. F001)',
            self::TIPO_BOLETA => 'B### (ej. B001)',
            self::TIPO_NOTA_CREDITO => 'FC## o BC## (ej. FC01)',
            self::TIPO_NOTA_DEBITO => 'FD## o BD## (ej. FD01)',
            self::TIPO_GUIA_REMISION => 'T### (ej. T001)',
            default => '',
        };
    }

    protected $table = 'fel_series';

    protected $fillable = [
        'sede_id',
        'tipo_comprobante',
        'serie',
        'ultimo_correlativo',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'tipo_comprobante' => 'integer',
            'ultimo_correlativo' => 'integer',
            'activo' => 'boolean',
        ];
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function tieneDocumentos(): bool
    {
        try {
            if (! Schema::hasTable('fel_documents')) {
                return false;
            }

            return DB::table('fel_documents')->where('fel_serie_id', $this->id)->exists();
        } catch (Throwable) {
            return false;
        }
    }
}
