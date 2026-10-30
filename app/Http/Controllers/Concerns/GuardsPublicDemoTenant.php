<?php

namespace App\Http\Controllers\Concerns;

/**
 * Bloquea altas/edición/borrado en el tenant público slug `demo`.
 */
trait GuardsPublicDemoTenant
{
    protected function abortIfPublicDemoMutationsLocked(string $message): void
    {
        if (! demo_mutations_locked()) {
            return;
        }

        abort(403, $message);
    }

    protected function demoMutationsLockedForClinic(): bool
    {
        return demo_mutations_locked();
    }
}
