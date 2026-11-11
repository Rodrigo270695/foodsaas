<?php

namespace App\Services\Inventario;

use App\Models\Insumo;
use App\Models\ProductoCarta;
use App\Models\RequerimientoAbastecimiento;
use App\Models\RequerimientoLinea;
use App\Models\Transferencia;
use App\Models\TransferenciaLinea;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequerimientoAbastecimientoService
{
    public function solicitar(RequerimientoAbastecimiento $req): RequerimientoAbastecimiento
    {
        if ($req->estado !== RequerimientoAbastecimiento::ESTADO_BORRADOR || ! $req->lineas()->exists()) {
            throw ValidationException::withMessages(['estado' => 'No se puede solicitar.']);
        }

        $req->estado = RequerimientoAbastecimiento::ESTADO_SOLICITADO;
        $req->save();

        return $req;
    }

    public function aprobar(RequerimientoAbastecimiento $req): RequerimientoAbastecimiento
    {
        if ($req->estado !== RequerimientoAbastecimiento::ESTADO_SOLICITADO) {
            throw ValidationException::withMessages(['estado' => 'Solo se aprueban solicitudes pendientes.']);
        }

        $req->estado = RequerimientoAbastecimiento::ESTADO_APROBADO;
        $req->save();

        return $req;
    }

    public function rechazar(RequerimientoAbastecimiento $req): RequerimientoAbastecimiento
    {
        if (! in_array($req->estado, [
            RequerimientoAbastecimiento::ESTADO_SOLICITADO,
            RequerimientoAbastecimiento::ESTADO_APROBADO,
        ], true)) {
            throw ValidationException::withMessages(['estado' => 'No se puede rechazar.']);
        }

        $req->estado = RequerimientoAbastecimiento::ESTADO_RECHAZADO;
        $req->save();

        return $req;
    }

    /**
     * Convierte un requerimiento aprobado en transferencia borrador (match por nombre).
     */
    public function generarTransferencia(RequerimientoAbastecimiento $req): Transferencia
    {
        if ($req->estado !== RequerimientoAbastecimiento::ESTADO_APROBADO) {
            throw ValidationException::withMessages([
                'estado' => 'Aprueba el requerimiento antes de generar la transferencia.',
            ]);
        }

        if ($req->transferencia_id) {
            throw ValidationException::withMessages([
                'transferencia' => 'Ya tiene una transferencia asociada.',
            ]);
        }

        return DB::transaction(function () use ($req): Transferencia {
            $req->load('lineas');
            $numero = ((int) Transferencia::query()
                ->where('sede_origen_id', $req->sede_abastecedora_id)
                ->max('numero')) + 1;

            $tf = Transferencia::query()->create([
                'sede_origen_id' => $req->sede_abastecedora_id,
                'sede_destino_id' => $req->sede_solicitante_id,
                'numero' => $numero,
                'estado' => Transferencia::ESTADO_BORRADOR,
                'notas' => 'Desde requerimiento #'.$req->numero,
                'user_id' => Auth::id(),
            ]);

            foreach ($req->lineas as $linea) {
                $this->addTransferLine($tf, $req, $linea);
            }

            if (! $tf->lineas()->exists()) {
                throw ValidationException::withMessages([
                    'lineas' => 'No se encontraron ítems coincidentes en origen/destino por nombre.',
                ]);
            }

            $req->transferencia_id = $tf->id;
            $req->estado = RequerimientoAbastecimiento::ESTADO_ATENDIDO;
            $req->save();

            return $tf->load('lineas');
        });
    }

    private function addTransferLine(
        Transferencia $tf,
        RequerimientoAbastecimiento $req,
        RequerimientoLinea $linea,
    ): void {
        $nombre = mb_strtolower(trim($linea->nombre));

        if ($linea->linea_tipo === 'insumo') {
            $origen = Insumo::query()
                ->where('sede_id', $req->sede_abastecedora_id)
                ->whereRaw('lower(trim(nombre)) = ?', [$nombre])
                ->first();
            $destino = Insumo::query()
                ->where('sede_id', $req->sede_solicitante_id)
                ->whereRaw('lower(trim(nombre)) = ?', [$nombre])
                ->first();

            if (! $origen || ! $destino) {
                return;
            }

            TransferenciaLinea::query()->create([
                'transferencia_id' => $tf->id,
                'linea_tipo' => TransferenciaLinea::TIPO_INSUMO,
                'origen_insumo_id' => $origen->id,
                'destino_insumo_id' => $destino->id,
                'cantidad' => $linea->cantidad,
                'unidad' => $linea->unidad,
            ]);

            return;
        }

        $origen = ProductoCarta::query()
            ->where('sede_id', $req->sede_abastecedora_id)
            ->where('control_inventario', ProductoCarta::CONTROL_SKU)
            ->whereRaw('lower(trim(nombre)) = ?', [$nombre])
            ->first();
        $destino = ProductoCarta::query()
            ->where('sede_id', $req->sede_solicitante_id)
            ->where('control_inventario', ProductoCarta::CONTROL_SKU)
            ->whereRaw('lower(trim(nombre)) = ?', [$nombre])
            ->first();

        if (! $origen || ! $destino) {
            return;
        }

        TransferenciaLinea::query()->create([
            'transferencia_id' => $tf->id,
            'linea_tipo' => TransferenciaLinea::TIPO_PRODUCTO,
            'origen_producto_id' => $origen->id,
            'destino_producto_id' => $destino->id,
            'cantidad' => $linea->cantidad,
            'unidad' => $linea->unidad,
        ]);
    }
}
