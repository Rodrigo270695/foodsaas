import type { FondoPreset } from '../types';

export type FondoDef = {
    id: FondoPreset;
    labelKey: string;
    canvasClass: string;
    textClass: string;
    mutedClass: string;
    accentClass: string;
};

export const FONDOS: readonly FondoDef[] = [
    {
        id: 'cream',
        labelKey: 'builder.fondos.cream',
        canvasClass: 'bg-[#F7F1E8]',
        textClass: 'text-[#2C1810]',
        mutedClass: 'text-[#6B5344]',
        accentClass: 'text-[#660033]',
    },
    {
        id: 'ink',
        labelKey: 'builder.fondos.ink',
        canvasClass: 'bg-[#141414]',
        textClass: 'text-[#F5F0E8]',
        mutedClass: 'text-[#A89F94]',
        accentClass: 'text-[#E8B4C4]',
    },
    {
        id: 'brand',
        labelKey: 'builder.fondos.brand',
        canvasClass: 'bg-gradient-to-br from-[#660033] via-[#4A0024] to-[#1A0A10]',
        textClass: 'text-white',
        mutedClass: 'text-white/70',
        accentClass: 'text-[#F5D0DC]',
    },
    {
        id: 'paper',
        labelKey: 'builder.fondos.paper',
        canvasClass: 'bg-[#FFFEF9]',
        textClass: 'text-[#1F1A17]',
        mutedClass: 'text-[#7A7168]',
        accentClass: 'text-[#660033]',
    },
    {
        id: 'sunset',
        labelKey: 'builder.fondos.sunset',
        canvasClass: 'bg-gradient-to-b from-[#FFF5EB] via-[#FDE8D8] to-[#F5D0C0]',
        textClass: 'text-[#3D1F14]',
        mutedClass: 'text-[#8A5A45]',
        accentClass: 'text-[#8B1E3F]',
    },
] as const;

export function resolveFondo(preset: FondoPreset): FondoDef {
    return FONDOS.find((f) => f.id === preset) ?? FONDOS[0];
}
