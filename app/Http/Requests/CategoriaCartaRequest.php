<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesUniqueNombreInSede;
use App\Models\CategoriaCarta;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class CategoriaCartaRequest extends FormRequest
{
    use ValidatesUniqueNombreInSede;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:120'],
            'descripcion' => ['nullable', 'string', 'max:255'],
            'orden' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'activa' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'nombre' => 'nombre',
            'descripcion' => 'descripción',
            'orden' => 'orden',
            'activa' => 'estado',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $ignoreId = $this->route('categoriaCarta')?->id;

        $this->assertUniqueNombreInActiveSede(
            $validator,
            CategoriaCarta::class,
            'nombre',
            'Ya existe una categoría con ese nombre en esta sede.',
            is_string($ignoreId) ? $ignoreId : null,
        );
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'descripcion' => trim((string) $this->input('descripcion', '')) ?: null,
            'orden' => $this->filled('orden') ? (int) $this->input('orden') : 0,
            'activa' => $this->boolean('activa'),
        ]);
    }
}
