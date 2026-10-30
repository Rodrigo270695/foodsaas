<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ZonaRequest extends FormRequest
{
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
            'nombre' => ['required', 'string', 'max:120'],
            'orden' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'activa' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'sede_id' => 'sede',
            'nombre' => 'nombre',
            'orden' => 'orden',
            'activa' => 'estado',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'orden' => $this->filled('orden') ? (int) $this->input('orden') : 0,
            'activa' => $this->boolean('activa'),
        ]);
    }
}
