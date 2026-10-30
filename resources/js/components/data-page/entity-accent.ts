/**
 * Acentos estables por id (categoría / zona) para distinguir muchas pills.
 * No usa color solo como estado: el label y aria-pressed siguen siendo la fuente.
 */
export type EntityAccent = {
    key: string;
    /** Punto de color (siempre visible). */
    dot: string;
    idle: string;
    selected: string;
};

export const ENTITY_ACCENTS: readonly EntityAccent[] = [
    {
        key: 'brand',
        dot: 'bg-[#660033]',
        idle: 'border-[#660033]/25 bg-[#660033]/10 text-[#4a0026] hover:bg-[#660033]/15',
        selected: 'border-[#660033] bg-[#660033] text-white shadow-sm',
    },
    {
        key: 'teal',
        dot: 'bg-teal-600',
        idle: 'border-teal-200 bg-teal-50 text-teal-950 hover:bg-teal-100/80',
        selected: 'border-teal-700 bg-teal-700 text-white shadow-sm',
    },
    {
        key: 'amber',
        dot: 'bg-amber-500',
        idle: 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100/80',
        selected: 'border-amber-600 bg-amber-600 text-white shadow-sm',
    },
    {
        key: 'sky',
        dot: 'bg-sky-600',
        idle: 'border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100/80',
        selected: 'border-sky-700 bg-sky-700 text-white shadow-sm',
    },
    {
        key: 'violet',
        dot: 'bg-violet-600',
        idle: 'border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100/80',
        selected: 'border-violet-700 bg-violet-700 text-white shadow-sm',
    },
    {
        key: 'lime',
        dot: 'bg-lime-600',
        idle: 'border-lime-200 bg-lime-50 text-lime-950 hover:bg-lime-100/80',
        selected: 'border-lime-700 bg-lime-700 text-white shadow-sm',
    },
    {
        key: 'orange',
        dot: 'bg-orange-500',
        idle: 'border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100/80',
        selected: 'border-orange-600 bg-orange-600 text-white shadow-sm',
    },
    {
        key: 'cyan',
        dot: 'bg-cyan-600',
        idle: 'border-cyan-200 bg-cyan-50 text-cyan-950 hover:bg-cyan-100/80',
        selected: 'border-cyan-700 bg-cyan-700 text-white shadow-sm',
    },
] as const;

export const ENTITY_ACCENT_NEUTRAL: EntityAccent = {
    key: 'neutral',
    dot: 'bg-muted-foreground/70',
    idle: 'border-border/70 bg-background text-foreground hover:bg-muted/50',
    selected: 'border-brand-600 bg-brand-600 text-white shadow-sm',
};

export function hashEntityId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

export function accentForEntityId(id: string): EntityAccent {
    if (!id || id.startsWith('__')) {
        return ENTITY_ACCENT_NEUTRAL;
    }
    return ENTITY_ACCENTS[hashEntityId(id) % ENTITY_ACCENTS.length]!;
}
