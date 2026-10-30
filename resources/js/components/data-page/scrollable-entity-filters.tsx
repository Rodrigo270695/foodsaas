import { ChevronsUpDown, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { accentForEntityId } from './entity-accent';
import { PillFilters, type PillFilterItem } from './pill-filters';

/** En móvil, a partir de esto → combobox (pantalla estrecha). */
const MOBILE_COMBO_THRESHOLD = 4;
/** En desktop, pills visibles antes del “+N más”. */
const DESKTOP_VISIBLE = 7;

export type EntityFilterItem = {
    id: string;
    label: string;
    count?: number;
    muted?: boolean;
};

type ScrollableEntityFiltersProps = {
    items: readonly EntityFilterItem[];
    value: string | null;
    allValue?: string;
    allLabel: string;
    allCount?: number;
    onChange: (id: string | null) => void;
    'aria-label'?: string;
    searchPlaceholder?: string;
    moreLabel?: (hidden: number) => string;
    canManage?: boolean;
    manageLabel?: (name: string) => string;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    editLabel?: string;
    deleteLabel?: string;
    className?: string;
};

function ManageMenu({
    label,
    manageLabel,
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
}: {
    label: string;
    manageLabel?: (name: string) => string;
    onEdit?: () => void;
    onDelete?: () => void;
    editLabel: string;
    deleteLabel: string;
}) {
    if (!onEdit && !onDelete) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={manageLabel?.(label) ?? label}
                    className="size-9 shrink-0 cursor-pointer sm:size-8"
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                {onEdit ? (
                    <DropdownMenuItem
                        onSelect={onEdit}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" />
                        {editLabel}
                    </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                    <DropdownMenuItem
                        onSelect={onDelete}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                        <Trash2 className="size-4" />
                        {deleteLabel}
                    </DropdownMenuItem>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Filtro por entidad (zonas, categorías):
 * - Pocas: pills de color con scroll horizontal / wrap.
 * - Muchas: pills visibles + “+N más” con búsqueda; en móvil → combobox.
 */
export function ScrollableEntityFilters({
    items,
    value,
    allValue = '__all__',
    allLabel,
    allCount,
    onChange,
    'aria-label': ariaLabel,
    searchPlaceholder = 'Buscar…',
    moreLabel = (n) => `+${n} más`,
    canManage = false,
    manageLabel,
    onEdit,
    onDelete,
    editLabel = 'Editar',
    deleteLabel = 'Eliminar',
    className,
}: ScrollableEntityFiltersProps) {
    const isMobile = useIsMobile();
    const [moreOpen, setMoreOpen] = useState(false);
    const [query, setQuery] = useState('');

    const useMobileCombo = isMobile && items.length > MOBILE_COMBO_THRESHOLD;

    const makeTrailing = (item: EntityFilterItem): ReactNode => {
        if (!canManage || (!onEdit && !onDelete)) {
            return null;
        }
        return (
            <ManageMenu
                label={item.label}
                manageLabel={manageLabel}
                onEdit={onEdit ? () => onEdit(item.id) : undefined}
                onDelete={onDelete ? () => onDelete(item.id) : undefined}
                editLabel={editLabel}
                deleteLabel={deleteLabel}
            />
        );
    };

    const allPill: PillFilterItem<string> = useMemo(
        () => ({
            value: allValue,
            label: allLabel,
            count: allCount,
            colored: false,
        }),
        [allValue, allLabel, allCount],
    );

    /** Selected always stays in the visible strip. */
    const { visibleItems, hiddenItems } = useMemo(() => {
        if (useMobileCombo || items.length <= DESKTOP_VISIBLE) {
            return { visibleItems: items, hiddenItems: [] as EntityFilterItem[] };
        }

        const selected = items.find((i) => i.id === value) ?? null;
        const rest = items.filter((i) => i.id !== value);
        const slots = selected ? DESKTOP_VISIBLE - 1 : DESKTOP_VISIBLE;
        const head = rest.slice(0, Math.max(0, slots));
        const visible = selected ? [selected, ...head] : head;
        const visibleIds = new Set(visible.map((i) => i.id));
        const hidden = items.filter((i) => !visibleIds.has(i.id));

        return { visibleItems: visible, hiddenItems: hidden };
    }, [items, value, useMobileCombo]);

    const visiblePills = useMemo<PillFilterItem<string>[]>(
        () => [
            allPill,
            ...visibleItems.map((item) => ({
                value: item.id,
                label: item.label,
                count: item.count,
                muted: item.muted,
                colored: true,
                trailing: makeTrailing(item),
            })),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            allPill,
            visibleItems,
            canManage,
            manageLabel,
            onEdit,
            onDelete,
            editLabel,
            deleteLabel,
        ],
    );

    const comboboxOptions = useMemo<ComboboxOption[]>(
        () => [
            {
                value: allValue,
                label: allCount != null ? `${allLabel} (${allCount})` : allLabel,
            },
            ...items.map((item) => ({
                value: item.id,
                label:
                    item.count != null
                        ? `${item.label} (${item.count})`
                        : item.label,
            })),
        ],
        [items, allValue, allLabel, allCount],
    );

    const filteredHidden = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) {
            return hiddenItems;
        }
        return hiddenItems.filter((i) => i.label.toLowerCase().includes(q));
    }, [hiddenItems, query]);

    const selectedItem = items.find((i) => i.id === value);

    if (useMobileCombo) {
        return (
            <div
                className={cn(
                    'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center',
                    className,
                )}
                role="group"
                aria-label={ariaLabel}
            >
                <Combobox
                    options={comboboxOptions}
                    value={value ?? allValue}
                    onChange={(next) => {
                        if (!next || next === allValue) {
                            onChange(null);
                            return;
                        }
                        onChange(next);
                    }}
                    placeholder={allLabel}
                    searchPlaceholder={searchPlaceholder}
                    className="w-full min-w-0"
                />
                {canManage && selectedItem && (onEdit || onDelete) ? (
                    <ManageMenu
                        label={selectedItem.label}
                        manageLabel={manageLabel}
                        onEdit={onEdit ? () => onEdit(selectedItem.id) : undefined}
                        onDelete={
                            onDelete ? () => onDelete(selectedItem.id) : undefined
                        }
                        editLabel={editLabel}
                        deleteLabel={deleteLabel}
                    />
                ) : null}
            </div>
        );
    }

    return (
        <div
            className={cn('flex min-w-0 max-w-full flex-col gap-2', className)}
            role="group"
            aria-label={ariaLabel}
        >
            <div className="relative min-w-0">
                <div
                    className={cn(
                        'flex max-w-full items-center gap-2 pb-0.5',
                        hiddenItems.length > 0 &&
                            'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                    )}
                >
                    <PillFilters
                        items={visiblePills}
                        value={value ?? allValue}
                        clearValue={allValue}
                        toggleOff
                        colored
                        onChange={(next) =>
                            onChange(next === allValue ? null : next)
                        }
                        className={
                            hiddenItems.length > 0
                                ? 'flex-nowrap'
                                : 'flex-wrap'
                        }
                    />

                    {hiddenItems.length > 0 ? (
                        <Popover
                            open={moreOpen}
                            onOpenChange={(open) => {
                                setMoreOpen(open);
                                if (!open) {
                                    setQuery('');
                                }
                            }}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-10 shrink-0 cursor-pointer gap-1.5 rounded-full border-dashed px-3 sm:h-9"
                                    aria-expanded={moreOpen}
                                >
                                    {moreLabel(hiddenItems.length)}
                                    <ChevronsUpDown className="size-3.5 opacity-60" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="start"
                                className="w-[min(100vw-2rem,20rem)] p-2"
                            >
                                <div className="relative mb-2">
                                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="h-9 pl-8"
                                        autoFocus
                                    />
                                </div>
                                <ul
                                    className="max-h-64 space-y-0.5 overflow-y-auto"
                                    role="listbox"
                                    aria-label={ariaLabel}
                                >
                                    {filteredHidden.length === 0 ? (
                                        <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                                            Sin coincidencias
                                        </li>
                                    ) : (
                                        filteredHidden.map((item) => {
                                            const accent = accentForEntityId(
                                                item.id,
                                            );
                                            const selected = value === item.id;
                                            return (
                                                <li key={item.id}>
                                                    <div className="flex items-center gap-0.5">
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={selected}
                                                            title={item.label}
                                                            onClick={() => {
                                                                onChange(item.id);
                                                                setMoreOpen(false);
                                                                setQuery('');
                                                            }}
                                                            className={cn(
                                                                'flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                                                                selected
                                                                    ? 'bg-[#660033]/10 font-medium text-[#660033]'
                                                                    : 'hover:bg-muted/70',
                                                                item.muted &&
                                                                    'opacity-60',
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    'size-2.5 shrink-0 rounded-full',
                                                                    accent.dot,
                                                                )}
                                                                aria-hidden
                                                            />
                                                            <span className="min-w-0 flex-1 truncate">
                                                                {item.label}
                                                            </span>
                                                            {typeof item.count ===
                                                            'number' ? (
                                                                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                                    {item.count}
                                                                </span>
                                                            ) : null}
                                                        </button>
                                                        {canManage ? (
                                                            <ManageMenu
                                                                label={item.label}
                                                                manageLabel={
                                                                    manageLabel
                                                                }
                                                                onEdit={
                                                                    onEdit
                                                                        ? () =>
                                                                              onEdit(
                                                                                  item.id,
                                                                              )
                                                                        : undefined
                                                                }
                                                                onDelete={
                                                                    onDelete
                                                                        ? () =>
                                                                              onDelete(
                                                                                  item.id,
                                                                              )
                                                                        : undefined
                                                                }
                                                                editLabel={
                                                                    editLabel
                                                                }
                                                                deleteLabel={
                                                                    deleteLabel
                                                                }
                                                            />
                                                        ) : null}
                                                    </div>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            </PopoverContent>
                        </Popover>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
