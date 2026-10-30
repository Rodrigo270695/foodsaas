import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
    PillFilters,
    type PillFilterItem,
} from './pill-filters';

const PILL_THRESHOLD = 6;

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
    canManage?: boolean;
    manageLabel?: (name: string) => string;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    editLabel?: string;
    deleteLabel?: string;
    className?: string;
};

/**
 * Filtro por entidad (zonas, categorías…): pills si son pocas;
 * Combobox buscable si crecen (p. ej. 20 zonas).
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
    canManage = false,
    manageLabel,
    onEdit,
    onDelete,
    editLabel = 'Editar',
    deleteLabel = 'Eliminar',
    className,
}: ScrollableEntityFiltersProps) {
    const useCombobox = items.length > PILL_THRESHOLD;

    const pillItems = useMemo<PillFilterItem<string>[]>(() => {
        const all: PillFilterItem<string> = {
            value: allValue,
            label: allLabel,
            count: allCount,
        };

        const rest = items.map((item) => {
            let trailing: ReactNode;
            if (canManage && (onEdit || onDelete)) {
                trailing = (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={
                                    manageLabel?.(item.label) ?? item.label
                                }
                                className="size-8 cursor-pointer"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {onEdit ? (
                                <DropdownMenuItem
                                    onSelect={() => onEdit(item.id)}
                                    className="cursor-pointer gap-2"
                                >
                                    <Pencil className="size-4" />
                                    {editLabel}
                                </DropdownMenuItem>
                            ) : null}
                            {onDelete ? (
                                <DropdownMenuItem
                                    onSelect={() => onDelete(item.id)}
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

            return {
                value: item.id,
                label: item.label,
                count: item.count,
                muted: item.muted,
                trailing,
            };
        });

        return [all, ...rest];
    }, [
        items,
        allValue,
        allLabel,
        allCount,
        canManage,
        manageLabel,
        onEdit,
        onDelete,
        editLabel,
        deleteLabel,
    ]);

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

    if (!useCombobox) {
        return (
            <div className={cn('max-w-full overflow-x-auto pb-0.5', className)}>
                <PillFilters
                    aria-label={ariaLabel}
                    items={pillItems}
                    value={value ?? allValue}
                    clearValue={allValue}
                    toggleOff
                    onChange={(next) =>
                        onChange(next === allValue ? null : next)
                    }
                    className="flex-nowrap"
                />
            </div>
        );
    }

    const selected = value ?? allValue;
    const selectedItem = items.find((i) => i.id === value);

    return (
        <div
            className={cn(
                'flex min-w-0 flex-wrap items-center gap-2',
                className,
            )}
            role="group"
            aria-label={ariaLabel}
        >
            <Combobox
                options={comboboxOptions}
                value={selected}
                onChange={(next) => {
                    if (!next || next === allValue) {
                        onChange(null);
                        return;
                    }
                    onChange(next);
                }}
                placeholder={allLabel}
                searchPlaceholder={searchPlaceholder}
                className="w-full min-w-[12rem] max-w-sm"
            />
            {canManage && selectedItem && (onEdit || onDelete) ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 cursor-pointer"
                            aria-label={
                                manageLabel?.(selectedItem.label) ??
                                selectedItem.label
                            }
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {onEdit ? (
                            <DropdownMenuItem
                                onSelect={() => onEdit(selectedItem.id)}
                                className="cursor-pointer gap-2"
                            >
                                <Pencil className="size-4" />
                                {editLabel}
                            </DropdownMenuItem>
                        ) : null}
                        {onDelete ? (
                            <DropdownMenuItem
                                onSelect={() => onDelete(selectedItem.id)}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                            >
                                <Trash2 className="size-4" />
                                {deleteLabel}
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}
        </div>
    );
}
