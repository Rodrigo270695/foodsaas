import { Link } from '@inertiajs/react';
import {
    Copy,
    Download,
    FolderOpen,
    Plus,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
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
    const { t } = useTranslation('carta');

    const newProductTip = productosLimitReached
        ? t('plan_limit.max_productos')
        : !hasCategorias
          ? t('producto_form.no_categories')
          : t('actions.new_product');

    return (
        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
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
                        className={cn('size-4', isLoading && 'animate-spin')}
                        strokeWidth={2.5}
                    />
                </Button>
            </ActionTip>

            <Can permission="carta.export">
                <ActionTip label={t('actions.export')}>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        asChild
                        className="cursor-pointer"
                        aria-label={t('actions.export')}
                    >
                        <a href={exportHref}>
                            <Download className="size-4" strokeWidth={2.5} />
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
                            <span className="hidden sm:inline">
                                {t('actions.copy_sede', {
                                    defaultValue: 'Copiar a sede',
                                })}
                            </span>
                        </Button>
                    </ActionTip>
                </Can>
            ) : null}

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

            <Can permission="carta.manage-categorias">
                <ActionTip label={t('actions.new_category')}>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onNewCategory}
                        className="cursor-pointer gap-2"
                    >
                        <FolderOpen className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">
                            {t('actions.new_category')}
                        </span>
                    </Button>
                </ActionTip>
            </Can>

            <Can permission="carta.manage-productos">
                <ActionTip label={newProductTip}>
                    <span className="inline-flex">
                        <Button
                            type="button"
                            onClick={onNewProduct}
                            disabled={productosLimitReached || !hasCategorias}
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
