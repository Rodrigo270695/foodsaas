import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrecio } from '../../lib/format-precio';
import { useCartaFont } from '../hooks/use-carta-font';
import { resolveCartaStyle } from '../lib/carta-style';
import { withCategoriaHeadings } from '../lib/group-by-categoria';
import type { BuilderProducto, FondoPreset } from '../types';

type CanvasEntry = {
    producto: BuilderProducto;
};

type MenuCanvasProps = {
    title: string;
    page: number;
    pages: number;
    fondo: FondoPreset;
    fondoImagenUrl?: string | null;
    tipografia?: string | null;
    colorTexto?: string | null;
    logoUrl: string | null;
    items: CanvasEntry[];
    isDraggingOver?: boolean;
    onDropProducto: (productoId: string) => void;
    onMove: (index: number, direction: -1 | 1) => void;
    onRemove: (productoId: string) => void;
    onReorder: (from: number, to: number) => void;
};

export function MenuCanvas({
    title,
    page,
    pages,
    fondo,
    fondoImagenUrl = null,
    tipografia = 'serif',
    colorTexto = null,
    logoUrl,
    items,
    onDropProducto,
    onMove,
    onRemove,
    onReorder,
}: MenuCanvasProps) {
    const { t } = useTranslation('carta');
    useCartaFont(tipografia);
    const style = resolveCartaStyle({
        fondo,
        fondoImagenUrl,
        tipografia,
        colorTexto,
    });
    const { theme, darkTheme } = style;
    const [dragOver, setDragOver] = useState(false);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    const rows = useMemo(() => withCategoriaHeadings(items), [items]);

    const sheetStyle: CSSProperties = {
        fontFamily: style.fontFamily,
        color: style.textColor ?? undefined,
        ...(style.backgroundImageUrl
            ? {
                  backgroundImage: `linear-gradient(${darkTheme ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.75)'}, ${darkTheme ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.75)'}), url(${style.backgroundImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }
            : {}),
    };

    return (
        <div
            className={cn(
                'relative mx-auto flex min-h-[32rem] w-full max-w-xl flex-col overflow-hidden rounded-3xl border shadow-xl transition-[filter,transform,opacity] duration-500 ease-out',
                !style.backgroundImageUrl && theme.canvasClass,
                style.textClass,
                dragOver && 'scale-[1.01] ring-2 ring-brand-500/40',
                draggingIndex !== null &&
                    '[&_.canvas-idle]:blur-[1.5px] [&_.canvas-idle]:opacity-70',
            )}
            style={sheetStyle}
            onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const id = e.dataTransfer.getData('text/producto-id');
                if (id) {
                    onDropProducto(id);
                }
                const fromRaw = e.dataTransfer.getData('text/canvas-index');
                if (fromRaw !== '') {
                    const from = Number.parseInt(fromRaw, 10);
                    const toAttr = (e.target as HTMLElement)
                        .closest('[data-canvas-index]')
                        ?.getAttribute('data-canvas-index');
                    if (!Number.isNaN(from) && toAttr != null) {
                        const to = Number.parseInt(toAttr, 10);
                        if (!Number.isNaN(to) && from !== to) {
                            onReorder(from, to);
                        }
                    }
                }
                setDraggingIndex(null);
            }}
        >
            <header
                className={cn(
                    'relative z-10 flex items-start justify-between gap-3 border-b px-6 py-5 transition-opacity duration-300',
                    darkTheme ? 'border-white/15' : 'border-black/10',
                )}
            >
                <div className="min-w-0 flex-1">
                    <p
                        className={cn(
                            'text-[10px] font-semibold tracking-[0.2em] uppercase',
                            style.mutedClass,
                        )}
                        style={
                            style.mutedColor
                                ? { color: style.mutedColor }
                                : undefined
                        }
                    >
                        {t('builder.page_label', { page, pages })}
                    </p>
                    <h2 className="mt-1 text-2xl tracking-tight sm:text-3xl">
                        {title}
                    </h2>
                </div>
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt=""
                        className="size-12 shrink-0 object-contain sm:size-14"
                    />
                ) : null}
            </header>

            <div className="relative z-10 flex flex-1 flex-col gap-2 p-4 sm:p-6">
                {items.length === 0 ? (
                    <div
                        className={cn(
                            'flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-16 text-center transition-colors duration-300',
                            style.mutedClass,
                            darkTheme ? 'border-white/25' : 'border-black/15',
                            dragOver && 'bg-black/5',
                        )}
                        style={
                            style.mutedColor
                                ? { color: style.mutedColor }
                                : undefined
                        }
                    >
                        <p className="text-sm font-medium">
                            {t('builder.drop_empty')}
                        </p>
                        <p className="mt-1 max-w-xs text-xs opacity-80">
                            {t('builder.drop_empty_hint')}
                        </p>
                    </div>
                ) : (
                    rows.map((row) => {
                        if (row.kind === 'heading') {
                            return (
                                <div
                                    key={row.key}
                                    className="mt-2 flex items-end gap-3 pt-2 first:mt-0 first:pt-0"
                                >
                                    <h3 className="text-lg tracking-tight sm:text-xl">
                                        {row.label}
                                    </h3>
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

                        const { entry, index } = row;
                        const active = draggingIndex === index;

                        return (
                            <article
                                key={row.key}
                                data-canvas-index={index}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData(
                                        'text/canvas-index',
                                        String(index),
                                    );
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggingIndex(index);
                                }}
                                onDragEnd={() => setDraggingIndex(null)}
                                className={cn(
                                    'group flex items-start gap-3 rounded-2xl border px-3 py-3 transition-all duration-300',
                                    active
                                        ? 'z-20 scale-[1.03] shadow-lg'
                                        : 'canvas-idle',
                                    darkTheme
                                        ? 'border-white/10 bg-white/5'
                                        : 'border-black/5 bg-white/40',
                                )}
                            >
                                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-black/10">
                                    {entry.producto.imagen_url ? (
                                        <img
                                            src={entry.producto.imagen_url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h4 className="truncate font-semibold">
                                            {entry.producto.nombre}
                                        </h4>
                                        <span
                                            className={cn(
                                                'shrink-0 tabular-nums text-sm font-semibold',
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
                                                entry.producto.precio,
                                            )}
                                        </span>
                                    </div>
                                    {entry.producto.descripcion ? (
                                        <p
                                            className={cn(
                                                'mt-0.5 line-clamp-2 text-xs',
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
                                            {entry.producto.descripcion}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 cursor-pointer"
                                        disabled={index === 0}
                                        aria-label={t('builder.move_up')}
                                        onClick={() => onMove(index, -1)}
                                    >
                                        <ArrowUp className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 cursor-pointer"
                                        disabled={index === items.length - 1}
                                        aria-label={t('builder.move_down')}
                                        onClick={() => onMove(index, 1)}
                                    >
                                        <ArrowDown className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 cursor-pointer text-destructive"
                                        aria-label={t('builder.remove_item')}
                                        onClick={() =>
                                            onRemove(entry.producto.id)
                                        }
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </div>
    );
}
