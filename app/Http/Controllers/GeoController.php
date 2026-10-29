<?php

namespace App\Http\Controllers;

use App\Models\Departamento;
use App\Models\Distrito;
use App\Models\Pais;
use App\Models\Provincia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeoController extends Controller
{
    public function paises(): JsonResponse
    {
        $data = Pais::query()
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($data);
    }

    public function departamentos(Request $request): JsonResponse
    {
        $paisId = $request->integer('pais_id');

        if ($paisId <= 0) {
            return response()->json([]);
        }

        $data = Departamento::query()
            ->where('pais_id', $paisId)
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($data);
    }

    public function provincias(Request $request): JsonResponse
    {
        $departamentoId = $request->integer('departamento_id');

        if ($departamentoId <= 0) {
            return response()->json([]);
        }

        $data = Provincia::query()
            ->where('departamento_id', $departamentoId)
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($data);
    }

    public function distritos(Request $request): JsonResponse
    {
        $provinciaId = $request->integer('provincia_id');

        if ($provinciaId <= 0) {
            return response()->json([]);
        }

        $data = Distrito::query()
            ->where('provincia_id', $provinciaId)
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($data);
    }
}
