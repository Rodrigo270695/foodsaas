<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesPlanIntLimits;
use App\Rules\ExistsDistritoId;
use App\Support\Restaurante\HorarioAtencion;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación unificada para crear y editar sedes.
 *
 * Nota: `codigo` NO está en las reglas porque se genera automáticamente
 * en el backend (`Sede::generateNextCode($tenantId)`) al crear, y no se permite
 * modificarlo en la edición.
 */
class SedeRequest extends FormRequest
{
    use ValidatesPlanIntLimits;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            // Ubicación: el frontend manda solo `distrito_id` (cascada
            // departamento → provincia → distrito). Los strings se
            // hidratan en el controller desde la BD para mantener el
            // cache denormalizado consistente.
            // No usar exists:public.distritos — Laravel lo toma como conexión.
            'distrito_id' => ['required', 'integer', new ExistsDistritoId],
            'activa' => ['required', 'boolean'],
            ...HorarioAtencion::rules(),
        ];
    }

    public function attributes(): array
    {
        return [
            'nombre' => 'nombre',
            'direccion' => 'dirección',
            'telefono' => 'teléfono',
            'email' => 'correo',
            'distrito_id' => 'distrito (ubicación)',
            'activa' => 'estado',
            'horario_atencion' => 'horario de atención',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'activa' => $this->boolean('activa'),
            'horario_atencion' => HorarioAtencion::decodeInput($this->input('horario_atencion')),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $this->enforcePlanIntLimitsOnCreate($validator, ['max_sedes']);

        $validator->after(function (Validator $validator): void {
            $horario = $this->input('horario_atencion');
            if (! is_array($horario)) {
                return;
            }

            foreach (HorarioAtencion::DIAS as $dia) {
                $row = is_array($horario[$dia] ?? null) ? $horario[$dia] : [];
                if (! ($row['abierto'] ?? false)) {
                    continue;
                }

                $abre = (string) ($row['abre'] ?? '');
                $cierra = (string) ($row['cierra'] ?? '');
                if ($abre !== '' && $cierra !== '' && $abre >= $cierra) {
                    $validator->errors()->add(
                        "horario_atencion.{$dia}.cierra",
                        'La hora de cierre debe ser posterior a la de apertura.',
                    );
                }
            }
        });
    }
}
