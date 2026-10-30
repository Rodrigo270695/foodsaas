<?php

namespace App\Http\Controllers;

use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ActiveSedeController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sede_id' => ['required', 'uuid'],
        ]);

        if (! ActiveSedeContext::set((string) $data['sede_id'])) {
            throw ValidationException::withMessages([
                'sede_id' => 'No tienes acceso a esa sede.',
            ]);
        }

        return back()->with('success', 'Sede activa actualizada.');
    }
}
