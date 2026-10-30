import { usePage } from '@inertiajs/react';

/**
 * Bloqueo global de mutaciones. En la demo pública ya no aplica:
 * solo Configuración sigue bloqueada vía `mutations_locked` de cada página.
 */
export function useDemoMutationsLocked(): boolean {
    const locked = usePage().props.demo_mutations_locked;

    return locked === true;
}
