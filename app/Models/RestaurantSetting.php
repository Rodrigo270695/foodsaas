<?php

namespace App\Models;

use App\Support\Caja\TicketAnchoMm;
use App\Support\Restaurante\HorarioAtencion;
use App\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Configuración general del restaurante (única fila por tenant).
 *
 * Vive en `cfg_restaurant_settings` dentro del schema del tenant activo.
 *
 * @property string $id
 * @property ?string $ruc
 * @property ?string $razon_social
 * @property ?string $nombre_comercial
 * @property ?string $direccion
 * @property ?int $distrito_id
 * @property ?string $logo_path
 * @property-read ?string $logo_url
 * @property ?string $email_operaciones
 * @property ?string $telefono
 * @property ?string $sitio_web
 * @property string $timezone
 * @property string $locale
 * @property string $moneda
 * @property string $igv_porcentaje
 * @property string $igv_afectacion
 * @property string $igv_alimentos_porcentaje
 * @property bool $precio_incluye_igv
 * @property string $ticket_ancho_mm
 * @property bool $emite_comprobantes_sunat
 * @property array<string, mixed> $horario_atencion
 * @property ?string $color_primario
 * @property ?int $updated_by_id
 * @property-read ?User $actualizadoPor
 * @property-read ?Distrito $distritoModel
 */
class RestaurantSetting extends Model
{
    use HasUuids;

    public const IGV_AFECTACION_GRAVADO = 'gravado';

    public const IGV_AFECTACION_EXONERADO = 'exonerado';

    public const IGV_AFECTACION_INAFECTO = 'inafecto';

    /** @var list<string> */
    public const IGV_AFECTACIONES = [
        self::IGV_AFECTACION_GRAVADO,
        self::IGV_AFECTACION_EXONERADO,
        self::IGV_AFECTACION_INAFECTO,
    ];

    protected $table = 'cfg_restaurant_settings';

    protected $fillable = [
        'ruc',
        'razon_social',
        'nombre_comercial',
        'direccion',
        'distrito_id',
        'logo_path',
        'email_operaciones',
        'telefono',
        'sitio_web',
        'timezone',
        'locale',
        'moneda',
        'igv_porcentaje',
        'igv_afectacion',
        'igv_alimentos_porcentaje',
        'precio_incluye_igv',
        'ticket_ancho_mm',
        'emite_comprobantes_sunat',
        'horario_atencion',
        'color_primario',
        'updated_by_id',
    ];

    protected $appends = ['logo_url'];

    protected function casts(): array
    {
        return [
            'horario_atencion' => 'array',
            'precio_incluye_igv' => 'boolean',
            'emite_comprobantes_sunat' => 'boolean',
            'igv_porcentaje' => 'decimal:2',
            'igv_alimentos_porcentaje' => 'decimal:2',
            'distrito_id' => 'integer',
            'updated_by_id' => 'integer',
        ];
    }

    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->logo_path
                ? asset('storage/'.ltrim($this->logo_path, '/'))
                : null,
        );
    }

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public function distritoModel(): BelongsTo
    {
        return $this->belongsTo(Distrito::class, 'distrito_id');
    }

    public static function current(): self
    {
        if (! static::tableReady()) {
            $slug = app(TenantManager::class)->slug() ?? 'el-restaurante';

            throw new \RuntimeException(
                'Falta el schema de este restaurante (no existe cfg_restaurant_settings). En Plataforma → Tenants usá «Crear schema», o en el servidor: php artisan foodsaas:tenant-migrate --slug='.$slug,
            );
        }

        return static::query()->firstOrCreate([]);
    }

    public static function tableReady(): bool
    {
        try {
            return Schema::hasTable('cfg_restaurant_settings');
        } catch (Throwable) {
            return false;
        }
    }

    public function igvAfectacion(): string
    {
        $value = (string) ($this->igv_afectacion ?? self::IGV_AFECTACION_GRAVADO);

        return in_array($value, self::IGV_AFECTACIONES, true)
            ? $value
            : self::IGV_AFECTACION_GRAVADO;
    }

    /**
     * @return array<string, array{abierto: bool, abre: string, cierra: string}>
     */
    public function horarioAtencionNormalizado(): array
    {
        return HorarioAtencion::normalize($this->horario_atencion);
    }

    public function ticketAnchoMm(): string
    {
        return TicketAnchoMm::normalize((string) ($this->ticket_ancho_mm ?? ''));
    }
}
