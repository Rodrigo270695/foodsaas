<?php

namespace App\Http\Requests;

use App\Models\MovimientoInventario;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MovimientoInventarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tipo = (string) $this->input('tipo', '');

        return [
            'tipo' => ['required', 'string', Rule::in(MovimientoInventario::TIPOS)],
            'cantidad' => [
                Rule::requiredIf($tipo !== MovimientoInventario::TIPO_AJUSTE),
                'nullable',
                'numeric',
                'gt:0',
                'max:999999999.999',
            ],
            'stock_nuevo' => [
                Rule::requiredIf($tipo === MovimientoInventario::TIPO_AJUSTE),
                'nullable',
                'numeric',
                'min:0',
                'max:999999999.999',
            ],
            'motivo' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'tipo' => 'tipo',
            'cantidad' => 'cantidad',
            'stock_nuevo' => 'stock nuevo',
            'motivo' => 'motivo',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'motivo' => trim((string) $this->input('motivo', '')) ?: null,
        ]);
    }
}
