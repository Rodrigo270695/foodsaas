import { Link } from '@inertiajs/react';
import {
    Copy,
    Download,
    FolderOpen,
    MoreHorizontal,
    Plus,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import carta from '../carta-routes';

type CartaHeaderActionsProps = {
    isLoading: boolean;
    productosLimitReached: boolean;
    hasCategorias: boolean;
    exportHref: string;
    canCopy?: boolean;
    onRefresh: () => void;
    onCopy?: () => void;
    onNewCategory: () => void;
    onNewProduct: () => void;
};

function ActionTip({
    label,
    children,
}: {
    label: string;
    children: ReactElement;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}

export function CartaHeaderActions({
    isLoading,
    productosLimitReached,
    hasCategorias,
    exportHref,
    canCopy = false,
    onRefresh,
    onCopy,
    onNewCategory,
    onNewProduct,
}: CartaHeaderActionsProps) {
    const { t } = useTranslation(['carta', 'common']);

    const newProductTip = productosLimitReached
        ? t('plan_limit.max_productos')
        : !hasCategorias
          ? t('producto_form.no_categories')
          : t('actions.new_product');

    const moreLabel = t('common:actions.more', {
        defaultValue: 'Más acciones',
    });

    return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
            {/* Móvil: secundarias en ⋯ */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="cursor-pointer sm:hidden"
                        aria-label={moreLabel}
                    >
                        <MoreHorizontal className="size-4" strokeWidth={2.5} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem
                        disabled={isLoading}
                        onSelect={() => onRefresh()}
                        className="cursor-pointer gap-2"
                    >
                        <RefreshCw
                            className={cn(
                                'size-4',
                                isLoading && 'animate-spin',
                            )}
                            strokeWidth={2.5}
                        />
                        {t('catalog.refresh')}
                    </DropdownMenuItem>

                    <Can permission="carta.export">
                        <DropdownMenuItem asChild>
                            <a
                                href={exportHref}
                                className="cursor-pointer gap-2"
                            >
                                <Download
                                    className="size-4"
                                    strokeWidth={2.5}
                                />
                                {t('actions.export')}
                            </a>
                        </DropdownMenuItem>
                    </Can>

                    {canCopy && onCopy ? (
                        <Can permission="carta.manage-productos">
                            <DropdownMenuItem
                                onSelect={() => onCopy()}
                                className="cursor-pointer gap-2"
                            >
                                <Copy className="size-4" strokeWidth={2.5} />
                                {t('actions.copy_sede', {
                                    defaultValue: 'Copiar a sede',
                                })}
                            </DropdownMenuItem>
                        </Can>
                    ) : null}

                    <Can permission="carta.manage-categorias">
                        <DropdownMenuItem
                            onSelect={() => onNewCategory()}
                            className="cursor-pointer gap-2"
                        >
                            <FolderOpen
                                className="size-4"
                                strokeWidth={2.5}
                            />
                            {t('actions.new_category')}
                        </DropdownMenuItem>
                    </Can>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop: todas las secundarias visibles */}
            <div className="hidden items-center gap-2 sm:flex">
                <ActionTip label={t('catalog.refresh')}>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={onRefresh}
                        disabled={isLoading}
                        aria-label={t('catalog.refresh')}
                        className="cursor-pointer"
                    >
                        <RefreshCw
                            className={cn(
                                'size-4',
                                isLoading && 'animate-spin',
                            )}
                            strokeWidth={2.5}
                        />
                    </Button>
                </ActionTip>

                <Can permission="carta.export">
                    <ActionTip label={t('actions.export')}>
                        <Button
                            type="button"
                            variant="export"
                            size="icon"
                            asChild
                            className="cursor-pointer"
                            aria-label={t('actions.export')}
                        >
                            <a href={exportHref}>
                                <Download
                                    className="size-4"
                                    strokeWidth={2.5}
                                />
                            </a>
                        </Button>
                    </ActionTip>
                </Can>

                {canCopy && onCopy ? (
                    <Can permission="carta.manage-productos">
                        <ActionTip
                            label={t('actions.copy_sede', {
                                defaultValue: 'Copiar a sede',
                            })}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCopy}
                                className="cursor-pointer gap-2"
                            >
                                <Copy className="size-4" strokeWidth={2.5} />
                                <span>
                                    {t('actions.copy_sede', {
                                        defaultValue: 'Copiar a sede',
                                    })}
                                </span>
                            </Button>
                        </ActionTip>
                    </Can>
                ) : null}

                <Can permission="carta.manage-categorias">
                    <ActionTip label={t('actions.new_category')}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onNewCategory}
                            className="cursor-pointer gap-2"
                        >
                            <FolderOpen
                                className="size-4"
                                strokeWidth={2.5}
                            />
                            <span>{t('actions.new_category')}</span>
                        </Button>
                    </ActionTip>
                </Can>
            </div>

            {/* Siempre visibles: Armar + Producto */}
            <Can permission="carta.view">
                <ActionTip label={t('actions.build_menu')}>
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="cursor-pointer gap-2"
                    >
                        <Link href={carta.builder().url}>
                            <Sparkles className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">
                                {t('actions.build_menu')}
                            </span>
                            <span className="sm:hidden">
                                {t('actions.build_menu_short')}
                            </span>
                        </Link>
                    </Button>
                </ActionTip>
            </Can>

            <Can permission="carta.manage-productos">
                <ActionTip label={newProductTip}>
                    <span className="inline-flex">
                        <Button
                            type="button"
                            onClick={onNewProduct}
                            disabled={
                                productosLimitReached || !hasCategorias
                            }
                            className="cursor-pointer gap-2"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">
                                {t('actions.new_product')}
                            </span>
                            <span className="sm:hidden">
                                {t('actions.new_product_short')}
                            </span>
                        </Button>
                    </span>
                </ActionTip>
            </Can>
        </div>
    );
}
