import { usePage } from '@inertiajs/react';

/**
 * Tenant slug `demo`: exploración permitida, mutaciones bloqueadas (salvo superadmin plataforma).
 */
export function useDemoMutationsLocked(): boolean {
    const locked = usePage().props.demo_mutations_locked;

    return locked === true;
}
