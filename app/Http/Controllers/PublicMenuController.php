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
     * Solo publicada (o staff autenticado puede ver borrador).
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

        $logo = RestaurantSetting::current()->logo_url
            ?: RestaurantBrandingUrls::default();

        $isStaff = $request->user() !== null;
        if (! $menu->publicada && ! $isStaff) {
            return Inertia::render('carta/public-menu', [
                'carta' => null,
                'logo_url' => $logo,
                'unpublished' => true,
                'nombre' => $menu->nombre,
            ]);
        }

        return Inertia::render('carta/public-menu', [
            'carta' => $menu,
            'logo_url' => $logo,
            'unpublished' => false,
            'nombre' => $menu->nombre,
        ]);
    }
}
