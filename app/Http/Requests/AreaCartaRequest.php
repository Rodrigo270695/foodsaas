<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AreaCartaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $areaId = $this->route('areaCarta')?->id;

        return [
            'nombre' => [
                'required',
                'string',
                'max:120',
                Rule::unique('cat_areas', 'nombre')->ignore($areaId),
            ],
            'orden' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'activa' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'nombre' => 'área',
            'orden' => 'orden',
            'activa' => 'estado',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'orden' => $this->filled('orden') ? (int) $this->input('orden') : 0,
            'activa' => $this->has('activa') ? $this->boolean('activa') : true,
        ]);
    }
}
