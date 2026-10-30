<?php

namespace App\Http\Requests;

use App\Models\RestaurantSetting;
use App\Rules\ExistsDistritoId;
use App\Support\Caja\TicketAnchoMm;
use App\Support\Restaurante\HorarioAtencion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RestaurantSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $horarioRules = [
            'horario_atencion' => ['required', 'array'],
        ];

        foreach (HorarioAtencion::DIAS as $dia) {
            $horarioRules["horario_atencion.{$dia}"] = ['required', 'array'];
            $horarioRules["horario_atencion.{$dia}.abierto"] = ['required', 'boolean'];
            $horarioRules["horario_atencion.{$dia}.abre"] = ['required', 'date_format:H:i'];
            $horarioRules["horario_atencion.{$dia}.cierra"] = ['required', 'date_format:H:i'];
        }

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
            'ticket_ancho_mm' => ['required', Rule::in(TicketAnchoMm::ALLOWED)],
            'emite_comprobantes_sunat' => ['required', 'boolean'],
            'apisunat_token' => ['nullable', 'string', 'max:8192'],
            'apisunat_mode' => ['nullable', Rule::in(['sandbox', 'produccion'])],
            'clear_apisunat' => ['nullable', 'boolean'],

            ...$horarioRules,
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
            'horario_atencion' => 'horario de atención',
        ];

        $labels = [
            'lun' => 'lunes',
            'mar' => 'martes',
            'mie' => 'miércoles',
            'jue' => 'jueves',
            'vie' => 'viernes',
            'sab' => 'sábado',
            'dom' => 'domingo',
        ];

        foreach ($labels as $dia => $label) {
            $attributes["horario_atencion.{$dia}.abre"] = "hora de apertura del {$label}";
            $attributes["horario_atencion.{$dia}.cierra"] = "hora de cierre del {$label}";
        }

        return $attributes;
    }

    protected function prepareForValidation(): void
    {
        $horario = $this->input('horario_atencion');
        if (is_string($horario)) {
            $decoded = json_decode($horario, true);
            $horario = is_array($decoded) ? $decoded : [];
        }

        if (is_array($horario)) {
            foreach (HorarioAtencion::DIAS as $dia) {
                if (! isset($horario[$dia]) || ! is_array($horario[$dia])) {
                    continue;
                }
                $horario[$dia]['abierto'] = filter_var(
                    $horario[$dia]['abierto'] ?? false,
                    FILTER_VALIDATE_BOOLEAN,
                );
                foreach (['abre', 'cierra'] as $campo) {
                    $raw = $horario[$dia][$campo] ?? null;
                    if (is_string($raw) && preg_match('/^\d{2}:\d{2}/', $raw) === 1) {
                        $horario[$dia][$campo] = substr($raw, 0, 5);
                    }
                }
            }
        }

        $this->merge([
            'precio_incluye_igv' => $this->boolean('precio_incluye_igv'),
            'emite_comprobantes_sunat' => $this->boolean('emite_comprobantes_sunat'),
            'clear_logo' => $this->boolean('clear_logo'),
            'clear_apisunat' => $this->boolean('clear_apisunat'),
            'horario_atencion' => is_array($horario) ? $horario : [],
            'web_url' => $this->filled('web_url') ? $this->string('web_url')->toString() : null,
            'distrito_id' => $this->filled('distrito_id') ? $this->integer('distrito_id') : null,
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $horario = $this->input('horario_atencion');
            if (! is_array($horario)) {
                return;
            }

            foreach (HorarioAtencion::DIAS as $dia) {
                $row = is_array($horario[$dia] ?? null) ? $horario[$dia] : [];
                if (! ($row['abierto'] ?? false)) {
                    continue;
                }

                $abre = (string) ($row['abre'] ?? '');
                $cierra = (string) ($row['cierra'] ?? '');
                if ($abre !== '' && $cierra !== '' && $abre >= $cierra) {
                    $validator->errors()->add(
                        "horario_atencion.{$dia}.cierra",
                        'La hora de cierre debe ser posterior a la de apertura.',
                    );
                }
            }
        });
    }
}
