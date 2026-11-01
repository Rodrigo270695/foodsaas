<?php

namespace App\Http\Requests;

use App\Models\RestaurantSetting;
use App\Rules\ExistsDistritoId;
use App\Support\Caja\TicketAnchoMm;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RestaurantSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ruc' => ['nullable', 'string', 'size:11', 'regex:/^\d{11}$/'],
            'razon_social' => ['nullable', 'string', 'max:200'],
            'nombre_comercial' => ['nullable', 'string', 'max:150'],
            'direccion_fiscal' => ['nullable', 'string', 'max:255'],
            'distrito_id' => ['nullable', 'integer', new ExistsDistritoId],

            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'clear_logo' => ['nullable', 'boolean'],

            'email_institucional' => ['nullable', 'email', 'max:150'],
            'telefono_principal' => ['nullable', 'string', 'max:20'],
            'web_url' => ['nullable', 'url', 'max:200'],

            'moneda' => ['required', Rule::in(['PEN', 'USD'])],
            'igv_porcentaje' => ['required', 'numeric', 'min:0', 'max:100'],
            'igv_alimentos_porcentaje' => ['required', 'numeric', 'min:0', 'max:100'],
            'igv_afectacion' => ['required', Rule::in(RestaurantSetting::IGV_AFECTACIONES)],
            'precio_incluye_igv' => ['required', 'boolean'],
            // El ancho se elige/persiste en el modal de impresión del ticket.
            'ticket_ancho_mm' => ['sometimes', 'nullable', Rule::in(TicketAnchoMm::ALLOWED)],
            'emite_comprobantes_sunat' => ['required', 'boolean'],
            'apisunat_token' => ['nullable', 'string', 'max:8192'],
            'apisunat_mode' => ['nullable', Rule::in(['sandbox', 'produccion'])],
            'clear_apisunat' => ['nullable', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        $attributes = [
            'ruc' => 'RUC',
            'razon_social' => 'razón social',
            'nombre_comercial' => 'nombre comercial',
            'direccion_fiscal' => 'dirección fiscal',
            'distrito_id' => 'distrito',
            'logo' => 'logo',
            'email_institucional' => 'correo institucional',
            'telefono_principal' => 'teléfono',
            'web_url' => 'sitio web',
            'moneda' => 'moneda',
            'igv_porcentaje' => 'IGV general',
            'igv_alimentos_porcentaje' => 'IGV de alimentos',
            'igv_afectacion' => 'afectación IGV',
            'precio_incluye_igv' => 'precio incluye IGV',
            'ticket_ancho_mm' => 'ancho del ticket térmico',
            'emite_comprobantes_sunat' => 'emisión de comprobantes SUNAT',
            'apisunat_token' => 'token de APISUNAT',
            'apisunat_mode' => 'modo de APISUNAT',
        ];

        return $attributes;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'precio_incluye_igv' => $this->boolean('precio_incluye_igv'),
            'emite_comprobantes_sunat' => $this->boolean('emite_comprobantes_sunat'),
            'clear_logo' => $this->boolean('clear_logo'),
            'clear_apisunat' => $this->boolean('clear_apisunat'),
            'web_url' => $this->filled('web_url') ? $this->string('web_url')->toString() : null,
            'distrito_id' => $this->filled('distrito_id') ? $this->integer('distrito_id') : null,
        ]);
    }
}
