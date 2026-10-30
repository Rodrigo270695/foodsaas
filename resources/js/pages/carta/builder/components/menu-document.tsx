import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { formatPrecio } from '../../lib/format-precio';
import { useCartaFont } from '../hooks/use-carta-font';
import { resolveCartaStyle } from '../lib/carta-style';
import { withCategoriaHeadings } from '../lib/group-by-categoria';
import type { BuilderItem, FondoPreset } from '../types';

type MenuDocumentProps = {
    title: string;
    description?: string | null;
    fondo: FondoPreset | string;
    tipografia?: string | null;
    colorTexto?: string | null;
    logoUrl: string | null;
    pages: number;
    items: BuilderItem[];
    /** Marca de agua centrada (opcional; por defecto no se usa el logo de cabecera). */
    watermarkUrl?: string | null;
    className?: string;
};

export function MenuDocument({
    title,
    description,
    fondo,
    tipografia = 'serif',
    colorTexto = null,
    logoUrl,
    pages,
    items,
    watermarkUrl = null,
    className,
}: MenuDocumentProps) {
    useCartaFont(tipografia);

    const style = resolveCartaStyle({
        fondo,
        tipografia,
        colorTexto,
    });
    const { darkTheme } = style;
    const mark = watermarkUrl;

    const byPage = new Map<number, BuilderItem[]>();
    for (let p = 1; p <= pages; p += 1) {
        byPage.set(p, []);
    }
    for (const item of items) {
        const list = byPage.get(item.pagina) ?? [];
        list.push(item);
        byPage.set(item.pagina, list);
    }

    const sheetStyle: CSSProperties = {
        fontFamily: style.fontFamily,
        color: style.textColor ?? undefined,
    };

    return (
        <div
            className={cn(
                'mx-auto flex w-full max-w-[210mm] flex-col gap-6 print:max-w-none print:gap-0',
                className,
            )}
        >
            {Array.from({ length: pages }, (_, i) => i + 1).map((page) => {
                const pageItems = byPage.get(page) ?? [];
                const rows = withCategoriaHeadings(pageItems);

                return (
                    <section
                        key={page}
                        className={cn(
                            'menu-print-page relative mx-auto w-full overflow-hidden rounded-sm border shadow-md',
                            'min-h-[297mm] max-w-[210mm] print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none',
                            'print:break-after-page print:break-inside-avoid',
                            style.canvasClass,
                            style.textClass,
                        )}
                        style={sheetStyle}
                    >
                        {mark ? (
                            <img
                                src={mark}
                                alt=""
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-1/2 z-0 size-[min(55%,18rem)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08] select-none print:opacity-[0.1]"
                            />
                        ) : null}

                        <header
                            className={cn(
                                'relative z-10 flex items-start justify-between gap-4 border-b px-8 py-8 sm:px-10',
                                darkTheme ? 'border-white/15' : 'border-black/10',
                            )}
                        >
                            <div className="min-w-0 flex-1">
                                <p
                                    className={cn(
                                        'text-[10px] font-semibold tracking-[0.25em] uppercase',
                                        style.mutedClass,
                                    )}
                                    style={
                                        style.mutedColor
                                            ? { color: style.mutedColor }
                                            : undefined
                                    }
                                >
                                    Página {page} de {pages}
                                </p>
                                <h1 className="mt-2 text-3xl tracking-tight sm:text-4xl">
                                    {title}
                                </h1>
                                {description ? (
                                    <p
                                        className={cn(
                                            'mt-2 max-w-lg text-sm',
                                            style.mutedClass,
                                        )}
                                        style={
                                            style.mutedColor
                                                ? { color: style.mutedColor }
                                                : undefined
                                        }
                                    >
                                        {description}
                                    </p>
                                ) : null}
                            </div>
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt=""
                                    className="size-14 shrink-0 object-contain sm:size-16 print:size-16"
                                />
                            ) : null}
                        </header>

                        <div className="relative z-10 space-y-3 px-8 py-8 sm:px-10">
                            {pageItems.length === 0 ? (
                                <p
                                    className={cn(
                                        'py-16 text-center text-sm',
                                        style.mutedClass,
                                    )}
                                    style={
                                        style.mutedColor
                                            ? { color: style.mutedColor }
                                            : undefined
                                    }
                                >
                                    Sin platos en esta página.
                                </p>
                            ) : (
                                rows.map((row) => {
                                    if (row.kind === 'heading') {
                                        return (
                                            <div
                                                key={row.key}
                                                className="mt-5 flex items-end gap-3 first:mt-0"
                                            >
                                                <h2 className="text-xl tracking-tight sm:text-2xl">
                                                    {row.label}
                                                </h2>
                                                <span
                                                    className={cn(
                                                        'mb-1.5 h-px flex-1',
                                                        darkTheme
                                                            ? 'bg-white/25'
                                                            : 'bg-black/15',
                                                    )}
                                                    aria-hidden
                                                />
                                            </div>
                                        );
                                    }

                                    const item = row.entry;

                                    return (
                                        <article
                                            key={row.key}
                                            className="flex items-start gap-4"
                                        >
                                            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-black/10">
                                                {item.producto?.imagen_url ? (
                                                    <img
                                                        src={
                                                            item.producto
                                                                .imagen_url
                                                        }
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <h3 className="text-lg font-semibold">
                                                        {item.producto
                                                            ?.nombre ?? '—'}
                                                    </h3>
                                                    <span
                                                        className={cn(
                                                            'tabular-nums font-semibold',
                                                            style.accentClass,
                                                        )}
                                                        style={
                                                            style.accentColor
                                                                ? {
                                                                      color: style.accentColor,
                                                                  }
                                                                : undefined
                                                        }
                                                    >
                                                        {formatPrecio(
                                                            item.producto
                                                                ?.precio ?? '0',
                                                        )}
                                                    </span>
                                                </div>
                                                {item.producto?.descripcion ? (
                                                    <p
                                                        className={cn(
                                                            'mt-1 text-sm',
                                                            style.mutedClass,
                                                        )}
                                                        style={
                                                            style.mutedColor
                                                                ? {
                                                                      color: style.mutedColor,
                                                                  }
                                                                : undefined
                                                        }
                                                    >
                                                        {
                                                            item.producto
                                                                .descripcion
                                                        }
                                                    </p>
                                                ) : null}
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
