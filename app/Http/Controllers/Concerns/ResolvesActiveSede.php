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
            throw ValidationException::withMessages([
                'sede_id' => 'No hay sede activa. Crea o activa una sede en Configuración.',
            ]);
        }

        return $id;
    }
}
