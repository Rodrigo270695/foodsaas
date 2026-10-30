<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesUniqueNombreInSede;
use App\Models\AreaCarta;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class AreaCartaRequest extends FormRequest
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

    public function withValidator(Validator $validator): void
    {
        $ignoreId = $this->route('areaCarta')?->id;

        $this->assertUniqueNombreInActiveSede(
            $validator,
            AreaCarta::class,
            'nombre',
            'Ya existe un área con ese nombre en esta sede.',
            is_string($ignoreId) ? $ignoreId : null,
        );
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
