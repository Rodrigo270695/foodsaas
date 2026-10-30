import { Copy, LayoutGrid, Plus, RefreshCw } from 'lucide-react';
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

type SalonHeaderActionsProps = {
    isLoading: boolean;
    mesasLimitReached: boolean;
    hasZonas: boolean;
    canCopy?: boolean;
    onRefresh: () => void;
    onCopy?: () => void;
    onNewZona: () => void;
    onNewMesa: () => void;
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

export function SalonHeaderActions({
    isLoading,
    mesasLimitReached,
    hasZonas,
    canCopy = false,
    onRefresh,
    onCopy,
    onNewZona,
    onNewMesa,
}: SalonHeaderActionsProps) {
    const { t } = useTranslation('salon');

    const newMesaTip = mesasLimitReached
        ? t('plan_limit.max_mesas')
        : !hasZonas
          ? t('mesa_form.no_zonas')
          : t('actions.new_mesa');

    return (
        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
            <ActionTip label={t('floor.refresh')}>
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
            </ActionTip>

            {canCopy && onCopy ? (
                <Can permission="salon.create">
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

            <Can permission="salon.create">
                <ActionTip label={t('actions.new_zona')}>
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
                </ActionTip>
            </Can>

            <Can permission="salon.create">
                <ActionTip label={newMesaTip}>
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
                </ActionTip>
            </Can>
        </div>
    );
}
