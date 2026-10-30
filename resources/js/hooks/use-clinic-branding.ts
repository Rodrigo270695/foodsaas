import { usePage } from '@inertiajs/react';
import type { ClinicBranding } from '@/types/clinic-branding';

/**
 * Logo del restaurante desde props compartidas (login y sidebar del tenant).
 */
export function useClinicBranding(): ClinicBranding | null {
    return (usePage().props.clinic_branding as ClinicBranding | null) ?? null;
}
