export type TipografiaId =
    | 'serif'
    | 'system'
    | 'inter'
    | 'roboto'
    | 'open-sans'
    | 'lato'
    | 'montserrat'
    | 'poppins'
    | 'raleway'
    | 'nunito'
    | 'source-sans'
    | 'playfair'
    | 'merriweather'
    | 'lora'
    | 'pt-serif'
    | 'libre-baskerville'
    | 'oswald'
    | 'rubik'
    | 'work-sans'
    | 'dm-sans'
    | 'cormorant';

export type TipografiaDef = {
    id: TipografiaId;
    label: string;
    /** CSS font-family stack. */
    family: string;
    /** Google Fonts stylesheet query (sin https://fonts.googleapis.com/css2?family=). null = no cargar. */
    google: string | null;
};

export const TIPOGRAFIAS: readonly TipografiaDef[] = [
    {
        id: 'serif',
        label: 'Clásica (serif)',
        family: 'ui-serif, Georgia, "Times New Roman", serif',
        google: null,
    },
    {
        id: 'system',
        label: 'Sistema',
        family: 'ui-sans-serif, system-ui, sans-serif',
        google: null,
    },
    {
        id: 'inter',
        label: 'Inter',
        family: '"Inter", ui-sans-serif, sans-serif',
        google: 'Inter:wght@400;600;700',
    },
    {
        id: 'roboto',
        label: 'Roboto',
        family: '"Roboto", ui-sans-serif, sans-serif',
        google: 'Roboto:wght@400;500;700',
    },
    {
        id: 'open-sans',
        label: 'Open Sans',
        family: '"Open Sans", ui-sans-serif, sans-serif',
        google: 'Open+Sans:wght@400;600;700',
    },
    {
        id: 'lato',
        label: 'Lato',
        family: '"Lato", ui-sans-serif, sans-serif',
        google: 'Lato:wght@400;700',
    },
    {
        id: 'montserrat',
        label: 'Montserrat',
        family: '"Montserrat", ui-sans-serif, sans-serif',
        google: 'Montserrat:wght@400;600;700',
    },
    {
        id: 'poppins',
        label: 'Poppins',
        family: '"Poppins", ui-sans-serif, sans-serif',
        google: 'Poppins:wght@400;600;700',
    },
    {
        id: 'raleway',
        label: 'Raleway',
        family: '"Raleway", ui-sans-serif, sans-serif',
        google: 'Raleway:wght@400;600;700',
    },
    {
        id: 'nunito',
        label: 'Nunito',
        family: '"Nunito", ui-sans-serif, sans-serif',
        google: 'Nunito:wght@400;600;700',
    },
    {
        id: 'source-sans',
        label: 'Source Sans 3',
        family: '"Source Sans 3", ui-sans-serif, sans-serif',
        google: 'Source+Sans+3:wght@400;600;700',
    },
    {
        id: 'playfair',
        label: 'Playfair Display',
        family: '"Playfair Display", ui-serif, serif',
        google: 'Playfair+Display:wght@500;700',
    },
    {
        id: 'merriweather',
        label: 'Merriweather',
        family: '"Merriweather", ui-serif, serif',
        google: 'Merriweather:wght@400;700',
    },
    {
        id: 'lora',
        label: 'Lora',
        family: '"Lora", ui-serif, serif',
        google: 'Lora:wght@400;600;700',
    },
    {
        id: 'pt-serif',
        label: 'PT Serif',
        family: '"PT Serif", ui-serif, serif',
        google: 'PT+Serif:wght@400;700',
    },
    {
        id: 'libre-baskerville',
        label: 'Libre Baskerville',
        family: '"Libre Baskerville", ui-serif, serif',
        google: 'Libre+Baskerville:wght@400;700',
    },
    {
        id: 'oswald',
        label: 'Oswald',
        family: '"Oswald", ui-sans-serif, sans-serif',
        google: 'Oswald:wght@400;600;700',
    },
    {
        id: 'rubik',
        label: 'Rubik',
        family: '"Rubik", ui-sans-serif, sans-serif',
        google: 'Rubik:wght@400;600;700',
    },
    {
        id: 'work-sans',
        label: 'Work Sans',
        family: '"Work Sans", ui-sans-serif, sans-serif',
        google: 'Work+Sans:wght@400;600;700',
    },
    {
        id: 'dm-sans',
        label: 'DM Sans',
        family: '"DM Sans", ui-sans-serif, sans-serif',
        google: 'DM+Sans:wght@400;600;700',
    },
    {
        id: 'cormorant',
        label: 'Cormorant Garamond',
        family: '"Cormorant Garamond", ui-serif, serif',
        google: 'Cormorant+Garamond:wght@500;600;700',
    },
] as const;

export function resolveTipografia(id: string | null | undefined): TipografiaDef {
    return TIPOGRAFIAS.find((f) => f.id === id) ?? TIPOGRAFIAS[0]!;
}

/** Inyecta (o reutiliza) el stylesheet de Google Fonts para la tipografía elegida. */
export function ensureGoogleFontLoaded(id: string | null | undefined): void {
    if (typeof document === 'undefined') {
        return;
    }

    const def = resolveTipografia(id);
    if (!def.google) {
        return;
    }

    const href = `https://fonts.googleapis.com/css2?family=${def.google}&display=swap`;
    const existing = document.querySelector<HTMLLinkElement>(
        `link[data-carta-font="${def.id}"]`,
    );
    if (existing) {
        return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.cartaFont = def.id;
    document.head.appendChild(link);
}
