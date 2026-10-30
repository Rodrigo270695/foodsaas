<?php

namespace App\Http\Requests\Concerns;

use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Validator;

trait ValidatesUniqueNombreInSede
{
    /**
     * Nombre único (case-insensitive) dentro de la sede activa.
     * El mismo nombre en otra sede sí está permitido.
     *
     * @param  class-string<Model>  $modelClass
     */
    protected function assertUniqueNombreInActiveSede(
        Validator $validator,
        string $modelClass,
        string $field,
        string $message,
        ?string $ignoreId = null,
        ?string $sedeId = null,
    ): void {
        $validator->after(function (Validator $v) use (
            $modelClass,
            $field,
            $message,
            $ignoreId,
            $sedeId,
        ): void {
            if ($v->errors()->has($field)) {
                return;
            }

            $nombre = trim((string) $this->input($field, ''));
            if ($nombre === '') {
                return;
            }

            $resolvedSedeId = $sedeId ?? ActiveSedeContext::id();
            if ($resolvedSedeId === null || $resolvedSedeId === '') {
                $v->errors()->add(
                    $field,
                    'No hay sede activa. Elige una sede arriba a la derecha e inténtalo de nuevo.',
                );

                return;
            }

            /** @var Builder $query */
            $query = $modelClass::query()
                ->where('sede_id', $resolvedSedeId)
                ->whereRaw('lower(nombre) = ?', [mb_strtolower($nombre)]);

            if (is_string($ignoreId) && $ignoreId !== '') {
                $query->whereKeyNot($ignoreId);
            }

            if ($query->exists()) {
                $v->errors()->add($field, $message);
            }
        });
    }
}
