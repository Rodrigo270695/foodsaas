<?php

namespace App\Http\Controllers\Concerns;

use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Validation\ValidationException;

trait ResolvesActiveSede
{
    protected function activeSedeIdOrAbort(): string
    {
        $id = ActiveSedeContext::id();
        if ($id === null || $id === '') {
            // `nombre` para que el error sea visible en modales de carta/salón
            // que no tienen campo sede_id.
            throw ValidationException::withMessages([
                'nombre' => 'No hay sede activa. Crea una sede en Configuración → Sedes o recarga la página e inténtalo de nuevo.',
                'sede_id' => 'No hay sede activa.',
            ]);
        }

        return $id;
    }
}
