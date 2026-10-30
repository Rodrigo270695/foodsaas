import { FolderOpen, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type CartaHeaderActionsProps = {
    isLoading: boolean;
    productosLimitReached: boolean;
    hasCategorias: boolean;
    onRefresh: () => void;
    onNewCategory: () => void;
    onNewProduct: () => void;
};

export function CartaHeaderActions({
    isLoading,
    productosLimitReached,
    hasCategorias,
    onRefresh,
    onNewCategory,
    onNewProduct,
}: CartaHeaderActionsProps) {
    const { t } = useTranslation('carta');

    return (
        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
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
            <Can permission="carta.create">
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
            </Can>
            <Can permission="carta.create">
                <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    {productosLimitReached ? (
                        <TooltipContent side="bottom" className="max-w-xs">
                            {t('plan_limit.max_productos')}
                        </TooltipContent>
                    ) : !hasCategorias ? (
                        <TooltipContent side="bottom" className="max-w-xs">
                            {t('producto_form.no_categories')}
                        </TooltipContent>
                    ) : null}
                </Tooltip>
            </Can>
        </div>
    );
}
