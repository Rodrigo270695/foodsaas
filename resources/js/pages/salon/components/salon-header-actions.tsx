import { Copy, LayoutGrid, Link2, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
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
import { InfoHint } from '@/components/ui/info-hint';
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
    canUpdate?: boolean;
    joinMode?: boolean;
    onToggleJoinMode?: () => void;
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
    canUpdate = false,
    joinMode = false,
    onToggleJoinMode,
    onRefresh,
    onCopy,
    onNewZona,
    onNewMesa,
}: SalonHeaderActionsProps) {
    const { t } = useTranslation(['salon', 'common']);

    const newMesaTip = mesasLimitReached
        ? t('plan_limit.max_mesas')
        : !hasZonas
          ? t('mesa_form.no_zonas')
          : t('actions.new_mesa');

    const moreLabel = t('common:actions.more', {
        defaultValue: 'Más acciones',
    });

    return (
        <div className="flex flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
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
                        {t('floor.refresh')}
                    </DropdownMenuItem>

                    {canCopy && onCopy ? (
                        <Can permission="salon.create">
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

                    <Can permission="salon.create">
                        <DropdownMenuItem
                            onSelect={() => onNewZona()}
                            className="cursor-pointer gap-2"
                        >
                            <LayoutGrid
                                className="size-4"
                                strokeWidth={2.5}
                            />
                            {t('actions.new_zona')}
                        </DropdownMenuItem>
                    </Can>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop: secundarias visibles */}
            <div className="hidden items-center gap-2 sm:flex">
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
                            className={cn(
                                'size-4',
                                isLoading && 'animate-spin',
                            )}
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
                                <span>
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
                            <LayoutGrid
                                className="size-4"
                                strokeWidth={2.5}
                            />
                            <span>{t('actions.new_zona')}</span>
                        </Button>
                    </ActionTip>
                </Can>
            </div>

            {/* Siempre: Unir (modo) + Nueva mesa */}
            {canUpdate && onToggleJoinMode ? (
                <Can permission="salon.update">
                    <div className="relative inline-flex">
                        <ActionTip
                            label={
                                joinMode
                                    ? t('union.mode_on')
                                    : t('union.mode')
                            }
                        >
                            <Button
                                type="button"
                                variant={joinMode ? 'default' : 'outline'}
                                size="icon"
                                aria-pressed={joinMode}
                                aria-label={t('union.mode')}
                                onClick={onToggleJoinMode}
                                className={cn(
                                    'cursor-pointer',
                                    joinMode &&
                                        'bg-[#660033] text-white hover:bg-[#660033]/90',
                                )}
                            >
                                <Link2 className="size-4" strokeWidth={2.5} />
                            </Button>
                        </ActionTip>
                        <InfoHint
                            variant="badge"
                            label={t('union.info_label')}
                            side="bottom"
                            align="end"
                            contentClassName="max-w-72"
                            className="absolute -top-1.5 -right-1.5 z-10"
                        >
                            {t('union.hint')}
                        </InfoHint>
                    </div>
                </Can>
            ) : null}

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
