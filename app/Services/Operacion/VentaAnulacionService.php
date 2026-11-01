<?php

declare(strict_types=1);

namespace App\Services\Operacion;

use App\Models\MovimientoInventario;
use App\Models\ProductoCarta;
use App\Models\Venta;
use App\Services\Fel\FelAnulacionComprobanteService;
use App\Services\Inventario\KardexService;
use App\Support\Fel\FelDocumentApisunatModeResolver;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

final class VentaAnulacionService
{
    public function __construct(
        private readonly FelAnulacionComprobanteService $felAnulacion,
        private readonly KardexService $kardex,
    ) {}

    /**
     * @param  array{motivo: string}  $input
     */
    public function anular(Venta $venta, array $input, Authenticatable $user): Venta
    {
        $motivo = trim((string) ($input['motivo'] ?? ''));
        if ($motivo === '') {
            throw ValidationException::withMessages([
                'motivo' => 'Indica el motivo de la anulación.',
            ]);
        }

        return DB::transaction(function () use ($venta, $motivo, $user): Venta {
            /** @var Venta $locked */
            $locked = Venta::query()->whereKey($venta->id)->lockForUpdate()->firstOrFail();
            $locked->load(['felDocument', 'pedido.lineas', 'pagos']);

            if ($locked->estado === Venta::ESTADO_ANULADA) {
                throw ValidationException::withMessages([
                    'venta' => 'Esta venta ya está anulada.',
                ]);
            }

            if ($locked->estado !== Venta::ESTADO_PAGADA) {
                throw ValidationException::withMessages([
                    'venta' => 'Solo se pueden anular ventas pagadas.',
                ]);
            }

            if ($this->esCpeSandboxEmitido($locked)) {
                throw ValidationException::withMessages([
                    'venta' => 'No se puede anular un CPE emitido en modo Prueba (sandbox). Pásalo a producción o anúlalo desde Lucode.',
                ]);
            }

            if ($this->felAnulacion->requiereAnulacionSunat($locked)) {
                try {
                    $this->felAnulacion->anularEnSunat($locked);
                    $locked->refresh();
                    $locked->load('felDocument');
                } catch (RuntimeException $e) {
                    throw ValidationException::withMessages([
                        'venta' => $e->getMessage(),
                    ]);
                }
            } elseif (in_array((string) $locked->fel_estado, [Venta::FEL_PENDIENTE, Venta::FEL_RECHAZADO], true)) {
                $locked->update(['fel_estado' => Venta::FEL_ANULADO]);
            } elseif ((string) $locked->fel_estado === Venta::FEL_EMITIDO) {
                throw ValidationException::withMessages([
                    'venta' => 'La venta figura como CPE emitido pero no hay documento FEL. Revisa Facturación › Comprobantes.',
                ]);
            }

            $this->revertirStock($locked);

            $locked->update([
                'estado' => Venta::ESTADO_ANULADA,
                'anulado_at' => now(),
                'anulado_por_id' => $user->getAuthIdentifier(),
                'motivo_anulacion' => mb_substr($motivo, 0, 2000),
            ]);

            return $locked->fresh(['felDocument', 'pagos', 'createdBy', 'anuladoPor']);
        });
    }

    private function esCpeSandboxEmitido(Venta $venta): bool
    {
        if (! $this->felAnulacion->requiereAnulacionSunat($venta)) {
            return false;
        }

        $doc = $venta->felDocument;
        if ($doc === null) {
            return false;
        }

        return FelDocumentApisunatModeResolver::resolveAndPersist($doc) === 'sandbox';
    }

    private function revertirStock(Venta $venta): void
    {
        $movimientos = MovimientoInventario::query()
            ->where('referencia_tipo', 'venta')
            ->where('referencia_id', $venta->id)
            ->where('tipo', MovimientoInventario::TIPO_VENTA)
            ->orderBy('created_at')
            ->get();

        foreach ($movimientos as $mov) {
            $producto = ProductoCarta::query()->find($mov->producto_id);
            if ($producto === null || ! $producto->tracksSkuStock()) {
                continue;
            }

            $cantidad = (float) $mov->cantidad;
            if ($cantidad <= 0) {
                continue;
            }

            $this->kardex->registrar($producto, [
                'tipo' => MovimientoInventario::TIPO_ENTRADA,
                'cantidad' => $cantidad,
                'motivo' => 'Anulación venta '.($venta->numero ?? $venta->id),
                'referencia_tipo' => 'venta_anulacion',
                'referencia_id' => $venta->id,
            ]);
        }
    }
}
