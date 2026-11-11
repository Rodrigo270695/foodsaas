<?php

namespace App\Services\Inventario;

use App\Models\MovimientoInventario;
use App\Models\ProductoCarta;
use App\Models\Transferencia;
use App\Models\TransferenciaLinea;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransferenciaStockService
{
    public function __construct(
        private readonly KardexService $kardex,
        private readonly InsumoKardexService $insumoKardex,
    ) {}

    public function enviar(Transferencia $transferencia): Transferencia
    {
        if (! $transferencia->canEnviar()) {
            throw ValidationException::withMessages([
                'estado' => 'La transferencia no se puede enviar.',
            ]);
        }

        return DB::transaction(function () use ($transferencia): Transferencia {
            /** @var Transferencia $locked */
            $locked = Transferencia::query()->whereKey($transferencia->id)->lockForUpdate()->firstOrFail();
            $locked->load('lineas');

            foreach ($locked->lineas as $linea) {
                $this->salidaOrigen($linea, $locked);
            }

            $locked->estado = Transferencia::ESTADO_ENVIADA;
            $locked->enviada_at = now();
            $locked->save();

            return $locked->fresh(['lineas']);
        });
    }

    public function recibir(Transferencia $transferencia): Transferencia
    {
        if (! $transferencia->canRecibir()) {
            throw ValidationException::withMessages([
                'estado' => 'La transferencia no se puede recibir.',
            ]);
        }

        return DB::transaction(function () use ($transferencia): Transferencia {
            /** @var Transferencia $locked */
            $locked = Transferencia::query()->whereKey($transferencia->id)->lockForUpdate()->firstOrFail();
            $locked->load('lineas');

            foreach ($locked->lineas as $linea) {
                $this->entradaDestino($linea, $locked);
            }

            $locked->estado = Transferencia::ESTADO_RECIBIDA;
            $locked->recibida_at = now();
            $locked->save();

            return $locked->fresh(['lineas']);
        });
    }

    public function anular(Transferencia $transferencia): Transferencia
    {
        if (! $transferencia->canAnular()) {
            throw ValidationException::withMessages([
                'estado' => 'La transferencia no se puede anular.',
            ]);
        }

        return DB::transaction(function () use ($transferencia): Transferencia {
            /** @var Transferencia $locked */
            $locked = Transferencia::query()->whereKey($transferencia->id)->lockForUpdate()->firstOrFail();

            if ($locked->estado === Transferencia::ESTADO_ENVIADA) {
                $locked->load('lineas');
                foreach ($locked->lineas as $linea) {
                    $this->reversoSalida($linea, $locked);
                }
            }

            $locked->estado = Transferencia::ESTADO_ANULADA;
            $locked->save();

            return $locked;
        });
    }

    private function salidaOrigen(TransferenciaLinea $linea, Transferencia $tf): void
    {
        $cantidad = (float) $linea->cantidad;
        $ref = [
            'referencia_tipo' => 'transferencia',
            'referencia_id' => $tf->id,
            'motivo' => 'Transferencia #'.$tf->numero.' → sede destino',
            'tipo' => MovimientoInventario::TIPO_SALIDA,
            'cantidad' => $cantidad,
        ];

        if ($linea->linea_tipo === TransferenciaLinea::TIPO_INSUMO) {
            if (! $linea->origen_insumo_id) {
                throw ValidationException::withMessages(['lineas' => 'Falta insumo de origen.']);
            }
            $this->insumoKardex->registrar($linea->origenInsumo()->firstOrFail(), $ref);

            return;
        }

        if (! $linea->origen_producto_id) {
            throw ValidationException::withMessages(['lineas' => 'Falta producto de origen.']);
        }

        $producto = ProductoCarta::query()->whereKey($linea->origen_producto_id)->firstOrFail();
        $this->kardex->registrar($producto, $ref);
    }

    private function entradaDestino(TransferenciaLinea $linea, Transferencia $tf): void
    {
        $cantidad = (float) $linea->cantidad;
        $ref = [
            'referencia_tipo' => 'transferencia',
            'referencia_id' => $tf->id,
            'motivo' => 'Recepción transferencia #'.$tf->numero,
            'tipo' => MovimientoInventario::TIPO_ENTRADA,
            'cantidad' => $cantidad,
        ];

        if ($linea->linea_tipo === TransferenciaLinea::TIPO_INSUMO) {
            if (! $linea->destino_insumo_id) {
                throw ValidationException::withMessages(['lineas' => 'Falta insumo de destino.']);
            }
            $this->insumoKardex->registrar($linea->destinoInsumo()->firstOrFail(), $ref);

            return;
        }

        if (! $linea->destino_producto_id) {
            throw ValidationException::withMessages(['lineas' => 'Falta producto de destino.']);
        }

        $producto = ProductoCarta::query()->whereKey($linea->destino_producto_id)->firstOrFail();
        $this->kardex->registrar($producto, $ref);
    }

    private function reversoSalida(TransferenciaLinea $linea, Transferencia $tf): void
    {
        $cantidad = (float) $linea->cantidad;
        $ref = [
            'referencia_tipo' => 'transferencia',
            'referencia_id' => $tf->id,
            'motivo' => 'Anulación transferencia #'.$tf->numero,
            'tipo' => MovimientoInventario::TIPO_ENTRADA,
            'cantidad' => $cantidad,
        ];

        if ($linea->linea_tipo === TransferenciaLinea::TIPO_INSUMO) {
            $this->insumoKardex->registrar($linea->origenInsumo()->firstOrFail(), $ref);

            return;
        }

        $this->kardex->registrar(
            ProductoCarta::query()->whereKey($linea->origen_producto_id)->firstOrFail(),
            $ref,
        );
    }
}
