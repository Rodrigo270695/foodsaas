import { resolveFondo } from './fondos';
import { resolveTipografia } from './tipografias';
import type { FondoPreset } from '../types';

export type CartaStyleInput = {
    fondo?: FondoPreset | string | null;
    fondoImagenUrl?: string | null;
    tipografia?: string | null;
    colorTexto?: string | null;
};

/** Opacidad suave sobre el color de texto para muted. */
export function withAlpha(hex: string, alpha: number): string {
    const raw = hex.replace('#', '');
    if (raw.length !== 6) {
        return hex;
    }
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveCartaStyle(input: CartaStyleInput) {
    const theme = resolveFondo((input.fondo as FondoPreset) || 'cream');
    const tipografia = resolveTipografia(input.tipografia);
    const customColor = input.colorTexto?.trim() || null;
    const darkTheme = theme.id === 'brand' || theme.id === 'ink';

    return {
        theme,
        tipografia,
        darkTheme,
        fontFamily: tipografia.family,
        textColor: customColor,
        mutedColor: customColor ? withAlpha(customColor, 0.65) : null,
        accentColor: customColor ? customColor : null,
        backgroundImageUrl: input.fondoImagenUrl?.trim() || null,
        canvasClass: theme.canvasClass,
        textClass: customColor ? undefined : theme.textClass,
        mutedClass: customColor ? undefined : theme.mutedClass,
        accentClass: customColor ? undefined : theme.accentClass,
    };
}
