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
            'fondo_imagen' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'clear_fondo_imagen' => ['sometimes', 'boolean'],
            'tipografia' => [
                'nullable',
                'string',
                'max:60',
                Rule::in([
                    'serif', 'system', 'inter', 'roboto', 'open-sans', 'lato',
                    'montserrat', 'poppins', 'raleway', 'nunito', 'source-sans',
                    'playfair', 'merriweather', 'lora', 'pt-serif', 'libre-baskerville',
                    'oswald', 'rubik', 'work-sans', 'dm-sans', 'cormorant',
                ]),
            ],
            'color_texto' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
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
            'fondo_imagen' => 'imagen de fondo',
            'tipografia' => 'tipografía',
            'color_texto' => 'color de texto',
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
        $color = trim((string) $this->input('color_texto', ''));
        $tipografia = trim((string) $this->input('tipografia', ''));

        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'descripcion' => trim((string) $this->input('descripcion', '')) ?: null,
            'fondo_preset' => $this->input('fondo_preset') ?: 'cream',
            'tipografia' => $tipografia !== '' ? $tipografia : 'serif',
            'color_texto' => $color !== '' ? $color : null,
            'clear_fondo_imagen' => $this->boolean('clear_fondo_imagen'),
            'paginas' => $this->filled('paginas') ? (int) $this->input('paginas') : 1,
            'publicada' => $this->boolean('publicada'),
        ]);
    }
}
