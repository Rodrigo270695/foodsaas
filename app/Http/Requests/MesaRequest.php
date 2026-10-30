<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesPlanIntLimits;
use App\Models\Zona;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MesaRequest extends FormRequest
{
    use ValidatesPlanIntLimits;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = tenant_id();

        return [
            'sede_id' => [
                'required',
                'uuid',
                Rule::exists('sedes', 'id')->where(
                    fn ($q) => $q->where('tenant_id', $tenantId)->where('activa', true),
                ),
            ],
            'zona_id' => ['required', 'uuid', Rule::exists('cfg_zonas', 'id')],
            'codigo' => ['required', 'string', 'max:40'],
            'nombre' => ['nullable', 'string', 'max:120'],
            'capacidad' => ['required', 'integer', 'min:1', 'max:99'],
            'activa' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'sede_id' => 'sede',
            'zona_id' => 'zona',
            'codigo' => 'código',
            'nombre' => 'nombre',
            'capacidad' => 'capacidad',
            'activa' => 'estado',
        ];
    }

    protected function prepareForValidation(): void
    {
        $sedeId = trim((string) $this->input('sede_id', ''));
        if ($sedeId === '') {
            $sedeId = ActiveSedeContext::id() ?? '';
        }

        $this->merge([
            'sede_id' => $sedeId !== '' ? $sedeId : null,
            'codigo' => strtoupper(trim((string) $this->input('codigo', ''))),
            'nombre' => trim((string) $this->input('nombre', '')) ?: null,
            'capacidad' => $this->filled('capacidad') ? (int) $this->input('capacidad') : 4,
            'activa' => $this->boolean('activa'),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $this->enforcePlanIntLimitsOnCreate($validator, ['max_mesas']);

        $validator->after(function (Validator $v): void {
            $zonaId = (string) $this->input('zona_id', '');
            $sedeId = (string) $this->input('sede_id', '');
            if ($zonaId === '' || $sedeId === '') {
                return;
            }

            $zona = Zona::query()->whereKey($zonaId)->first();
            if ($zona === null) {
                $v->errors()->add('zona_id', 'La zona seleccionada no existe.');

                return;
            }

            if ((string) $zona->sede_id !== $sedeId) {
                $v->errors()->add('zona_id', 'La zona no pertenece a la sede seleccionada.');
            }
        });
    }
}
