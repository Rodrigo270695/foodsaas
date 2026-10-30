<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesPlanIntLimits;
use App\Models\CategoriaCarta;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductoCartaRequest extends FormRequest
{
    use ValidatesPlanIntLimits;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'categoria_id' => [
                'required',
                'uuid',
                Rule::exists('cat_categorias', 'id'),
            ],
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'codigo' => ['nullable', 'string', 'max:40'],
            'precio' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'orden' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'activo' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'categoria_id' => 'categoría',
            'nombre' => 'nombre',
            'descripcion' => 'descripción',
            'codigo' => 'código',
            'precio' => 'precio',
            'orden' => 'orden',
            'activo' => 'estado',
        ];
    }

    protected function prepareForValidation(): void
    {
        $codigo = trim((string) $this->input('codigo', ''));

        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'descripcion' => trim((string) $this->input('descripcion', '')) ?: null,
            'codigo' => $codigo !== '' ? $codigo : null,
            'orden' => $this->filled('orden') ? (int) $this->input('orden') : 0,
            'activo' => $this->boolean('activo'),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $this->enforcePlanIntLimitsOnCreate($validator, ['max_productos']);

        $validator->after(function (Validator $v): void {
            $categoriaId = (string) $this->input('categoria_id', '');
            if ($categoriaId === '') {
                return;
            }

            if (! CategoriaCarta::query()->whereKey($categoriaId)->exists()) {
                $v->errors()->add('categoria_id', 'La categoría seleccionada no existe.');
            }
        });
    }
}
