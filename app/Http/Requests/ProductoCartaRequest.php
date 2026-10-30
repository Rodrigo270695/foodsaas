<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesPlanIntLimits;
use App\Models\AreaCarta;
use App\Models\CategoriaCarta;
use App\Models\ProductoCarta;
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
        $control = (string) $this->input('control_inventario', ProductoCarta::CONTROL_NONE);

        return [
            'categoria_id' => [
                'required',
                'uuid',
                Rule::exists('cat_categorias', 'id'),
            ],
            'area_id' => [
                'nullable',
                'uuid',
                Rule::exists('cat_areas', 'id'),
            ],
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'codigo' => ['nullable', 'string', 'max:40'],
            'precio' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'orden' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'activo' => ['required', 'boolean'],
            'control_inventario' => [
                'required',
                'string',
                Rule::in(ProductoCarta::CONTROLES),
            ],
            'stock_inicial' => [
                Rule::requiredIf(
                    $this->isMethod('POST')
                    && $control === ProductoCarta::CONTROL_SKU,
                ),
                'nullable',
                'numeric',
                'min:0',
                'max:999999999.999',
            ],
            'stock_minimo' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999.999',
            ],
            'imagen' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
            'clear_imagen' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'categoria_id' => 'categoría',
            'area_id' => 'área',
            'nombre' => 'nombre',
            'descripcion' => 'descripción',
            'codigo' => 'código',
            'precio' => 'precio',
            'orden' => 'orden',
            'activo' => 'estado',
            'control_inventario' => 'control de inventario',
            'stock_inicial' => 'stock inicial',
            'stock_minimo' => 'stock mínimo',
            'imagen' => 'imagen',
        ];
    }

    protected function prepareForValidation(): void
    {
        $codigo = trim((string) $this->input('codigo', ''));
        $areaId = trim((string) $this->input('area_id', ''));
        $control = trim((string) $this->input('control_inventario', ProductoCarta::CONTROL_NONE));
        if (! in_array($control, ProductoCarta::CONTROLES, true)) {
            $control = ProductoCarta::CONTROL_NONE;
        }

        $stockMinimo = $this->input('stock_minimo');
        $stockInicial = $this->input('stock_inicial');

        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'descripcion' => trim((string) $this->input('descripcion', '')) ?: null,
            'codigo' => $codigo !== '' ? $codigo : null,
            'area_id' => $areaId !== '' ? $areaId : null,
            'orden' => $this->filled('orden') ? (int) $this->input('orden') : 0,
            'activo' => $this->boolean('activo'),
            'clear_imagen' => $this->boolean('clear_imagen'),
            'control_inventario' => $control,
            'stock_minimo' => $control === ProductoCarta::CONTROL_SKU && $stockMinimo !== null && $stockMinimo !== ''
                ? $stockMinimo
                : null,
            'stock_inicial' => $control === ProductoCarta::CONTROL_SKU && $stockInicial !== null && $stockInicial !== ''
                ? $stockInicial
                : ($control === ProductoCarta::CONTROL_SKU ? 0 : null),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $this->enforcePlanIntLimitsOnCreate($validator, ['max_productos']);

        $validator->after(function (Validator $v): void {
            $categoriaId = (string) $this->input('categoria_id', '');
            if ($categoriaId !== '' && ! CategoriaCarta::query()->whereKey($categoriaId)->exists()) {
                $v->errors()->add('categoria_id', 'La categoría seleccionada no existe.');
            }

            $areaId = (string) $this->input('area_id', '');
            if ($areaId !== '' && ! AreaCarta::query()->whereKey($areaId)->exists()) {
                $v->errors()->add('area_id', 'El área seleccionada no existe.');
            }
        });
    }
}
