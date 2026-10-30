<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesUniqueNombreInSede;
use App\Models\MenuCarta;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MenuCartaRequest extends FormRequest
{
    use ValidatesUniqueNombreInSede;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'fondo_preset' => [
                'nullable',
                'string',
                Rule::in(['cream', 'ink', 'brand', 'paper', 'sunset']),
            ],
            'paginas' => ['nullable', 'integer', 'min:1', 'max:8'],
            'publicada' => ['sometimes', 'boolean'],
            'vigente_desde' => ['nullable', 'date'],
            'vigente_hasta' => ['nullable', 'date', 'after_or_equal:vigente_desde'],
        ];
    }

    public function attributes(): array
    {
        return [
            'nombre' => 'nombre',
            'descripcion' => 'descripción',
            'fondo_preset' => 'fondo',
            'paginas' => 'páginas',
            'publicada' => 'publicada',
            'vigente_desde' => 'vigente desde',
            'vigente_hasta' => 'vigente hasta',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $menu = $this->route('menuCarta');
        $ignoreId = $menu instanceof MenuCarta ? (string) $menu->id : null;
        $sedeId = $menu instanceof MenuCarta && is_string($menu->sede_id)
            ? (string) $menu->sede_id
            : ActiveSedeContext::id();

        $this->assertUniqueNombreInActiveSede(
            $validator,
            MenuCarta::class,
            'nombre',
            'Ya existe una carta con ese nombre en esta sede.',
            $ignoreId,
            $sedeId,
        );
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'descripcion' => trim((string) $this->input('descripcion', '')) ?: null,
            'fondo_preset' => $this->input('fondo_preset') ?: 'cream',
            'paginas' => $this->filled('paginas') ? (int) $this->input('paginas') : 1,
            'publicada' => $this->boolean('publicada'),
        ]);
    }
}
