import {
    ChevronsUpDown,
    MoreHorizontal,
    Pencil,
    Search,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { accentForEntityId, ENTITY_ACCENT_NEUTRAL } from './entity-accent';

/** A partir de aquí no listamos todas las pills: selector + búsqueda. */
const MANY_THRESHOLD = 5;

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
    browseLabel?: string;
    canManage?: boolean;
    manageLabel?: (name: string) => string;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    editLabel?: string;
    deleteLabel?: string;
    className?: string;
};

function EntityChip({
    label,
    count,
    selected,
    muted,
    accentId,
    onClick,
    className,
}: {
    label: string;
    count?: number;
    selected: boolean;
    muted?: boolean;
    accentId?: string | null;
    onClick: () => void;
    className?: string;
}) {
    const accent =
        accentId && accentId.length > 0
            ? accentForEntityId(accentId)
            : ENTITY_ACCENT_NEUTRAL;

    return (
        <button
            type="button"
            aria-pressed={selected}
            title={label}
            onClick={onClick}
            className={cn(
                'inline-flex h-10 max-w-[11rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors sm:h-9',
                'focus-visible:ring-2 focus-visible:ring-[#660033]/30 focus-visible:outline-none',
                selected ? accent.selected : accent.idle,
                muted && !selected && 'opacity-55',
                className,
            )}
        >
            {accentId ? (
                <span
                    className={cn(
                        'size-2 shrink-0 rounded-full',
                        selected ? 'bg-white/90' : accent.dot,
                    )}
                    aria-hidden
                />
            ) : null}
            <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
            {typeof count === 'number' ? (
                <span
                    className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none',
                        selected
                            ? 'bg-white/20 text-white'
                            : 'bg-black/5 text-foreground/70',
                    )}
                >
                    {count}
                </span>
            ) : null}
        </button>
    );
}

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
                    variant="outline"
                    size="icon"
                    aria-label={manageLabel?.(label) ?? label}
                    className="size-10 shrink-0 cursor-pointer rounded-full sm:size-9"
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

function EntityPickerList({
    items,
    value,
    allValue,
    allLabel,
    allCount,
    query,
    onQueryChange,
    searchPlaceholder,
    onPick,
    canManage,
    manageLabel,
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
}: {
    items: readonly EntityFilterItem[];
    value: string | null;
    allValue: string;
    allLabel: string;
    allCount?: number;
    query: string;
    onQueryChange: (q: string) => void;
    searchPlaceholder: string;
    onPick: (id: string | null) => void;
    canManage: boolean;
    manageLabel?: (name: string) => string;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    editLabel: string;
    deleteLabel: string;
}) {
    const q = query.trim().toLowerCase();
    const filtered = q
        ? items.filter((i) => i.label.toLowerCase().includes(q))
        : items;

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-9 pl-8"
                    autoFocus
                />
            </div>

            <ul
                className="max-h-72 space-y-0.5 overflow-y-auto overscroll-contain"
                role="listbox"
            >
                {!q ? (
                    <li>
                        <button
                            type="button"
                            role="option"
                            aria-selected={value === null}
                            onClick={() => onPick(null)}
                            className={cn(
                                'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm transition-colors',
                                value === null
                                    ? 'bg-[#660033]/10 font-medium text-[#660033]'
                                    : 'hover:bg-muted/70',
                            )}
                        >
                            <span
                                className="size-2.5 shrink-0 rounded-full bg-muted-foreground/50"
                                aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">
                                {allLabel}
                            </span>
                            {typeof allCount === 'number' ? (
                                <span className="text-xs tabular-nums text-muted-foreground">
                                    {allCount}
                                </span>
                            ) : null}
                        </button>
                    </li>
                ) : null}

                {filtered.length === 0 ? (
                    <li className="px-2 py-4 text-center text-xs text-muted-foreground">
                        Sin coincidencias
                    </li>
                ) : (
                    filtered.map((item) => {
                        const accent = accentForEntityId(item.id);
                        const selected = value === item.id;
                        return (
                            <li key={item.id}>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        title={item.label}
                                        onClick={() => onPick(item.id)}
                                        className={cn(
                                            'flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm transition-colors',
                                            selected
                                                ? 'bg-[#660033]/10 font-medium text-[#660033]'
                                                : 'hover:bg-muted/70',
                                            item.muted && 'opacity-60',
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
                                        {typeof item.count === 'number' ? (
                                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                {item.count}
                                            </span>
                                        ) : null}
                                    </button>
                                    {canManage ? (
                                        <ManageMenu
                                            label={item.label}
                                            manageLabel={manageLabel}
                                            onEdit={
                                                onEdit
                                                    ? () => onEdit(item.id)
                                                    : undefined
                                            }
                                            onDelete={
                                                onDelete
                                                    ? () => onDelete(item.id)
                                                    : undefined
                                            }
                                            editLabel={editLabel}
                                            deleteLabel={deleteLabel}
                                        />
                                    ) : null}
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
}

/**
 * Filtro por categorías / zonas que no se rompe con muchas:
 * - Pocas: una sola fila con scroll horizontal (sin ⋯ entre pills).
 * - Muchas o móvil: “Todos” + seleccionada + “Ver todas” con búsqueda.
 * - Editar/eliminar solo sobre la entidad activa (o dentro del listado).
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
    browseLabel = 'Ver todas',
    canManage = false,
    manageLabel,
    onEdit,
    onDelete,
    editLabel = 'Editar',
    deleteLabel = 'Eliminar',
    className,
}: ScrollableEntityFiltersProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = useMemo(
        () => items.find((i) => i.id === value) ?? null,
        [items, value],
    );

    const useCompact = isMobile || items.length > MANY_THRESHOLD;

    const pick = (id: string | null) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    const manageSelected =
        canManage && selected && (onEdit || onDelete) ? (
            <ManageMenu
                label={selected.label}
                manageLabel={manageLabel}
                onEdit={onEdit ? () => onEdit(selected.id) : undefined}
                onDelete={onDelete ? () => onDelete(selected.id) : undefined}
                editLabel={editLabel}
                deleteLabel={deleteLabel}
            />
        ) : null;

    const browseButton = (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setQuery('');
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 cursor-pointer gap-1.5 rounded-full px-3 sm:h-9"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className="max-w-[9rem] truncate">
                        {useCompact
                            ? `${browseLabel} (${items.length})`
                            : browseLabel}
                    </span>
                    <ChevronsUpDown className="size-3.5 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[min(100vw-2rem,22rem)] p-2"
            >
                <EntityPickerList
                    items={items}
                    value={value}
                    allValue={allValue}
                    allLabel={allLabel}
                    allCount={allCount}
                    query={query}
                    onQueryChange={setQuery}
                    searchPlaceholder={searchPlaceholder}
                    onPick={pick}
                    canManage={canManage}
                    manageLabel={manageLabel}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    editLabel={editLabel}
                    deleteLabel={deleteLabel}
                />
            </PopoverContent>
        </Popover>
    );

    if (useCompact) {
        return (
            <div
                className={cn(
                    'flex min-w-0 max-w-full flex-wrap items-center gap-2',
                    className,
                )}
                role="group"
                aria-label={ariaLabel}
            >
                <EntityChip
                    label={allLabel}
                    count={allCount}
                    selected={value === null}
                    onClick={() => pick(null)}
                />
                {selected ? (
                    <EntityChip
                        label={selected.label}
                        count={selected.count}
                        selected
                        muted={selected.muted}
                        accentId={selected.id}
                        onClick={() => pick(selected.id)}
                    />
                ) : null}
                {browseButton}
                {manageSelected}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex min-w-0 max-w-full items-center gap-2',
                className,
            )}
            role="group"
            aria-label={ariaLabel}
        >
            <div
                className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5',
                    '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                )}
            >
                <EntityChip
                    label={allLabel}
                    count={allCount}
                    selected={value === null}
                    onClick={() => pick(null)}
                />
                {items.map((item) => (
                    <EntityChip
                        key={item.id}
                        label={item.label}
                        count={item.count}
                        selected={value === item.id}
                        muted={item.muted}
                        accentId={item.id}
                        onClick={() => pick(item.id)}
                    />
                ))}
            </div>
            {manageSelected}
        </div>
    );
}
