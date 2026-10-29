<?php

namespace App\Http\Requests;

use App\Models\Tenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Tenant|null $tenant */
        $tenant = $this->route('tenant');
        $tenantId = $tenant?->getKey();

        return [
            'slug' => [
                'required',
                'string',
                'min:3',
                'max:60',
                'regex:/^[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?$/',
                Rule::unique('tenants', 'slug')->whereNull('deleted_at')->ignore($tenantId),
            ],
            'razon_social' => ['required', 'string', 'max:200'],
            'nombre_comercial' => ['nullable', 'string', 'max:150'],
            'ruc' => [
                'nullable',
                'string',
                'regex:/^\d{11}$/',
                Rule::unique('tenants', 'ruc')->whereNull('deleted_at')->ignore($tenantId),
            ],
            'email_admin' => [
                'required',
                'string',
                'email:rfc',
                'max:150',
                Rule::unique('tenants', 'email_admin')->whereNull('deleted_at')->ignore($tenantId),
            ],
            'telefono' => ['nullable', 'string', 'max:20'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'distrito_id' => [
                'required',
                'integer',
                Rule::exists('distritos', 'id'),
            ],
            'timezone' => ['required', 'string', 'max:50'],
            'locale' => ['required', 'string', 'max:10'],
            'canal_adquisicion' => ['nullable', 'string', 'max:50'],
            'trial_days' => $this->isMethod('POST')
                ? ['nullable', 'integer', 'min:0', 'max:365']
                : ['prohibited'],
        ];
    }

    public function attributes(): array
    {
        return [
            'slug' => 'subdominio',
            'razon_social' => 'razón social',
            'nombre_comercial' => 'nombre comercial',
            'ruc' => 'RUC',
            'email_admin' => 'email del administrador',
            'telefono' => 'teléfono',
            'direccion' => 'dirección',
            'distrito_id' => 'distrito',
            'timezone' => 'zona horaria',
            'locale' => 'idioma',
            'canal_adquisicion' => 'canal de adquisición',
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'El subdominio solo admite minúsculas, dígitos y guiones, y no puede empezar o terminar en guion.',
            'ruc.regex' => 'El RUC debe ser exactamente 11 dígitos.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $rawSlug = trim((string) $this->input('slug', ''));

        $this->merge([
            'slug' => Str::lower(preg_replace('/\s+/', '-', $rawSlug) ?? ''),
            'email_admin' => Str::lower(trim((string) $this->input('email_admin', ''))),
            'ruc' => filled($this->input('ruc')) ? trim((string) $this->input('ruc')) : null,
            'telefono' => filled($this->input('telefono')) ? trim((string) $this->input('telefono')) : null,
            'razon_social' => trim((string) $this->input('razon_social', '')),
            'nombre_comercial' => filled($this->input('nombre_comercial')) ? trim((string) $this->input('nombre_comercial')) : null,
            'direccion' => filled($this->input('direccion')) ? trim((string) $this->input('direccion')) : null,
            'timezone' => trim((string) $this->input('timezone', 'America/Lima')) ?: 'America/Lima',
            'locale' => trim((string) $this->input('locale', 'es_PE')) ?: 'es_PE',
        ]);
    }
}
