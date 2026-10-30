<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\MenuCarta;
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
     * Anónimos: solo publicada. Staff con carta.view: puede ver borrador.
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

        $logo = RestaurantSetting::current()->logo_url
            ?: RestaurantBrandingUrls::default();

        return Inertia::render('carta/public-menu', [
            'carta' => $menu,
            'logo_url' => $logo,
            'unpublished' => ! $menu->publicada,
            'nombre' => $menu->nombre,
        ]);
    }
}
