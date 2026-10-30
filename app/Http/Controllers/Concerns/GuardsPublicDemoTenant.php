<?php

namespace App\Http\Controllers\Concerns;

/**
 * Bloquea altas/edición/borrado del menú Configuración en el tenant demo.
 */
trait GuardsPublicDemoTenant
{
    protected function abortIfPublicDemoMutationsLocked(string $message): void
    {
        if (! demo_config_locked()) {
            return;
        }

        abort(403, $message);
    }

    protected function demoMutationsLockedForClinic(): bool
    {
        return demo_config_locked();
    }
}
