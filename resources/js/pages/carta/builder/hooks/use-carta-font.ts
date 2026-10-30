import { useEffect } from 'react';
import { ensureGoogleFontLoaded } from '../lib/tipografias';

/** Carga bajo demanda la Google Font elegida para la carta. */
export function useCartaFont(tipografia: string | null | undefined): void {
    useEffect(() => {
        ensureGoogleFontLoaded(tipografia);
    }, [tipografia]);
}
