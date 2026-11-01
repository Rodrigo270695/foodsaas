<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\GuardsPublicDemoTenant;
use App\Http\Requests\RestaurantSettingRequest;
use App\Models\Departamento;
use App\Models\RestaurantSetting;
use App\Models\User;
use App\Support\Caja\TicketAnchoMm;
use App\Support\Plan\PlanCapabilities;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Configuración general del restaurante (Configuración → General).
 *
 * Edita la única fila de `cfg_restaurant_settings` del tenant activo.
 */
class RestaurantSettingController extends Controller
{
    use GuardsPublicDemoTenant;

    public function show(TenantManager $tenants): Response
    {
        $setting = RestaurantSetting::current()
            ->load('actualizadoPor:id,name,email', 'distritoModel.provincia.departamento');

        $tenant = $tenants->current();
        $tenantModel = $tenant?->tenant;
        $planPermiteFacturaElectronica = PlanCapabilities::facturaElectronica($tenantModel);

        $departamentos = Departamento::query()
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('configuracion/general/index', [
            'setting' => $this->presentSetting($setting, $planPermiteFacturaElectronica),
            'restaurant_header' => $tenant === null ? null : [
                'id' => $tenant->id(),
                'slug' => $tenant->slug,
                'razon_social' => $tenant->tenant->razon_social ?? null,
                'nombre_comercial' => $tenant->tenant->nombre_comercial ?? null,
            ],
            'departamentos' => $departamentos,
            'plan_permite_factura_electronica' => $planPermiteFacturaElectronica,
            'mutations_locked' => $this->demoMutationsLockedForClinic(),
        ]);
    }

    public function update(RestaurantSettingRequest $request, TenantManager $tenants): RedirectResponse
    {
        $this->abortIfPublicDemoMutationsLocked(
            'El restaurante demo es de solo lectura: no se puede cambiar la configuración general.',
        );

        $setting = RestaurantSetting::current();
        $data = $request->validated();

        $tenantModel = $tenants->current()?->tenant;
        $planPermiteFacturaElectronica = PlanCapabilities::facturaElectronica($tenantModel);
        if (! $planPermiteFacturaElectronica) {
            $data['emite_comprobantes_sunat'] = false;
        }

        $afectacion = (string) $data['igv_afectacion'];
        $igvGeneral = $afectacion === RestaurantSetting::IGV_AFECTACION_GRAVADO
            ? $data['igv_porcentaje']
            : 0;
        $igvAlimentos = $afectacion === RestaurantSetting::IGV_AFECTACION_GRAVADO
            ? $data['igv_alimentos_porcentaje']
            : 0;

        $setting->fill([
            'ruc' => $data['ruc'] ?? null,
            'razon_social' => $data['razon_social'] ?? null,
            'nombre_comercial' => $data['nombre_comercial'] ?? null,
            'direccion' => $data['direccion_fiscal'] ?? null,
            'distrito_id' => $data['distrito_id'] ?? null,
            'email_operaciones' => $data['email_institucional'] ?? null,
            'telefono' => $data['telefono_principal'] ?? null,
            'sitio_web' => $data['web_url'] ?? null,
            'moneda' => $data['moneda'],
            'igv_porcentaje' => $igvGeneral,
            'igv_alimentos_porcentaje' => $igvAlimentos,
            'igv_afectacion' => $afectacion,
            'precio_incluye_igv' => $data['precio_incluye_igv'],
            'emite_comprobantes_sunat' => $data['emite_comprobantes_sunat'],
            'updated_by_id' => Auth::id(),
        ]);

        if (array_key_exists('ticket_ancho_mm', $data) && $data['ticket_ancho_mm'] !== null) {
            $setting->ticket_ancho_mm = TicketAnchoMm::normalize(
                (string) $data['ticket_ancho_mm'],
            );
        }

        $this->applyLogo($setting, $request, $tenants);

        $user = Auth::user();
        $isPlatformSuperadmin = $user instanceof User && $user->isPlatformSuperadmin();
        if ($planPermiteFacturaElectronica && $isPlatformSuperadmin && $this->hasApisunatColumns()) {
            $this->applyApisunatToken($setting, $data);
        }

        $setting->save();

        return back()->with(['success' => 'Configuración actualizada correctamente.']);
    }

    private function applyLogo(
        RestaurantSetting $setting,
        RestaurantSettingRequest $request,
        TenantManager $tenants,
    ): void {
        $disk = Storage::disk('public');

        if (($request->validated('clear_logo') ?? false) === true) {
            if ($setting->logo_path && $disk->exists($setting->logo_path)) {
                $disk->delete($setting->logo_path);
            }
            $setting->logo_path = null;

            return;
        }

        if (! $request->hasFile('logo')) {
            return;
        }

        $slug = $tenants->current()?->slug ?? 'shared';
        $previous = $setting->logo_path;
        $file = $request->file('logo');
        if ($file === null) {
            return;
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png');
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = "tenants/{$slug}/logos/{$filename}";

        $disk->putFileAs(
            "tenants/{$slug}/logos",
            $file,
            $filename,
            'public',
        );

        $setting->logo_path = $path;

        if ($previous && $previous !== $path && $disk->exists($previous)) {
            $disk->delete($previous);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function applyApisunatToken(RestaurantSetting $setting, array $data): void
    {
        if (($data['clear_apisunat'] ?? false) === true) {
            $setting->apisunat_token_enc = null;
            $setting->apisunat_configurado = false;

            return;
        }

        if (! empty($data['apisunat_mode'])) {
            $setting->apisunat_mode = $data['apisunat_mode'];
        }

        if (! empty($data['apisunat_token'])) {
            $setting->apisunat_token_enc = Crypt::encryptString((string) $data['apisunat_token']);
            $setting->apisunat_configurado = true;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function presentSetting(RestaurantSetting $setting, bool $planPermiteFacturaElectronica): array
    {
        return [
            'id' => $setting->id,
            'ruc' => $setting->ruc,
            'razon_social' => $setting->razon_social,
            'nombre_comercial' => $setting->nombre_comercial,
            'direccion_fiscal' => $setting->direccion,
            'distrito_id' => $setting->distrito_id,
            'distrito_model' => $setting->distritoModel ? [
                'id' => $setting->distritoModel->id,
                'name' => $setting->distritoModel->name,
                'provincia_id' => $setting->distritoModel->provincia_id,
                'provincia' => [
                    'id' => $setting->distritoModel->provincia->id,
                    'name' => $setting->distritoModel->provincia->name,
                    'departamento_id' => $setting->distritoModel->provincia->departamento_id,
                    'departamento' => [
                        'id' => $setting->distritoModel->provincia->departamento->id,
                        'name' => $setting->distritoModel->provincia->departamento->name,
                    ],
                ],
            ] : null,
            'logo_url' => $setting->logo_url,
            'email_institucional' => $setting->email_operaciones,
            'telefono_principal' => $setting->telefono,
            'web_url' => $setting->sitio_web,
            'moneda' => $setting->moneda ?: 'PEN',
            'igv_porcentaje' => (string) $setting->igv_porcentaje,
            'igv_alimentos_porcentaje' => (string) ($setting->igv_alimentos_porcentaje ?? $setting->igv_porcentaje),
            'igv_afectacion' => $setting->igvAfectacion(),
            'precio_incluye_igv' => (bool) $setting->precio_incluye_igv,
            'ticket_ancho_mm' => $setting->ticketAnchoMm(),
            'emite_comprobantes_sunat' => $planPermiteFacturaElectronica && (bool) $setting->emite_comprobantes_sunat,
            'apisunat_mode' => $planPermiteFacturaElectronica && $this->hasApisunatColumns()
                ? ($setting->apisunat_mode ?? 'sandbox')
                : 'sandbox',
            'apisunat_configurado' => $planPermiteFacturaElectronica
                && $this->hasApisunatColumns()
                && (bool) $setting->apisunat_configurado,
            'updated_at' => $setting->updated_at?->toIso8601String(),
            'actualizado_por' => $setting->actualizadoPor ? [
                'id' => $setting->actualizadoPor->id,
                'name' => $setting->actualizadoPor->name,
                'email' => $setting->actualizadoPor->email,
            ] : null,
        ];
    }

    private function hasApisunatColumns(): bool
    {
        try {
            return Schema::hasTable('cfg_restaurant_settings')
                && Schema::hasColumn('cfg_restaurant_settings', 'apisunat_token_enc')
                && Schema::hasColumn('cfg_restaurant_settings', 'apisunat_mode')
                && Schema::hasColumn('cfg_restaurant_settings', 'apisunat_configurado');
        } catch (\Throwable) {
            return false;
        }
    }
}
