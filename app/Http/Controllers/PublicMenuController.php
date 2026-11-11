<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\MenuCarta;
use App\Models\Mesa;
use App\Models\RestaurantSetting;
use App\Support\Restaurante\RestaurantBrandingUrls;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicMenuController extends Controller
{
    use ResolvesTenantId;

    /**
     * Carta pública por slug (QR / link compartido).
     * Anónimos: solo publicada y vigente. Staff con carta.view: puede ver borrador/fuera de vigencia.
     */
    public function show(Request $request, string $slug): Response
    {
        $this->tenantIdOrAbort();

        $menu = MenuCarta::query()
            ->where('slug', $slug)
            ->with([
                'items.producto:id,nombre,precio,descripcion,imagen_path,categoria_id',
                'items.producto.categoria:id,nombre',
            ])
            ->first();

        if ($menu === null) {
            abort(404);
        }

        $canPreviewDraft = $request->user()?->can('carta.view') === true;

        if (! $menu->publicada && ! $canPreviewDraft) {
            abort(404);
        }

        $vigente = $menu->isVigenteAhora();
        if ($menu->publicada && ! $vigente && ! $canPreviewDraft) {
            abort(404);
        }

        $logo = RestaurantSetting::current()->logo_url
            ?: RestaurantBrandingUrls::default();

        $mesaId = trim((string) $request->string('mesa', ''));
        $mesaPayload = null;
        $canPedir = false;

        if ($mesaId !== '') {
            $mesa = Mesa::query()->whereKey($mesaId)->where('activa', true)->first();
            if ($mesa !== null) {
                $mesaPayload = [
                    'id' => $mesa->id,
                    'codigo' => $mesa->codigo,
                    'nombre' => $mesa->nombre,
                ];
                $canPedir = $request->user()?->can('pedidos.create') === true;
            }
        }

        return Inertia::render('carta/public-menu', [
            'carta' => $menu,
            'logo_url' => $logo,
            'unpublished' => ! $menu->publicada,
            'fuera_vigencia' => ! $vigente,
            'nombre' => $menu->nombre,
            'mesa' => $mesaPayload,
            'can_pedir' => $canPedir,
        ]);
    }
}
