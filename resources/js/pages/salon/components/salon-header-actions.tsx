import { LayoutGrid, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type SalonHeaderActionsProps = {
    isLoading: boolean;
    mesasLimitReached: boolean;
    hasZonas: boolean;
    onRefresh: () => void;
    onNewZona: () => void;
    onNewMesa: () => void;
};

export function SalonHeaderActions({
    isLoading,
    mesasLimitReached,
    hasZonas,
    onRefresh,
    onNewZona,
    onNewMesa,
}: SalonHeaderActionsProps) {
    const { t } = useTranslation('salon');

    return (
        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                aria-label={t('floor.refresh')}
                className="cursor-pointer"
            >
                <RefreshCw
                    className={cn('size-4', isLoading && 'animate-spin')}
                    strokeWidth={2.5}
                />
            </Button>
            <Can permission="salon.create">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onNewZona}
                    className="cursor-pointer gap-2"
                >
                    <LayoutGrid className="size-4" strokeWidth={2.5} />
                    <span className="hidden sm:inline">
                        {t('actions.new_zona')}
                    </span>
                </Button>
            </Can>
            <Can permission="salon.create">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <Button
                                type="button"
                                onClick={onNewMesa}
                                disabled={mesasLimitReached || !hasZonas}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    {t('actions.new_mesa')}
                                </span>
                                <span className="sm:hidden">
                                    {t('actions.new_mesa_short')}
                                </span>
                            </Button>
                        </span>
                    </TooltipTrigger>
                    {mesasLimitReached ? (
                        <TooltipContent side="bottom" className="max-w-xs">
                            {t('plan_limit.max_mesas')}
                        </TooltipContent>
                    ) : !hasZonas ? (
                        <TooltipContent side="bottom" className="max-w-xs">
                            {t('mesa_form.no_zonas')}
                        </TooltipContent>
                    ) : null}
                </Tooltip>
            </Can>
        </div>
    );
}
