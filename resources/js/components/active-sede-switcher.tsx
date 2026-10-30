import { router, usePage } from '@inertiajs/react';
import { Building2, Copy } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ActiveSedeOption = {
    id: string;
    nombre: string;
    codigo: string;
};

export type ActiveSedeShared = {
    id: string | null;
    sedes: ActiveSedeOption[];
    can_switch: boolean;
} | null;

type ActiveSedeSwitcherProps = {
    className?: string;
    /** Si hay destinos, muestra botón para abrir el modal de copia (lo maneja la vista). */
    onCopyToSede?: () => void;
    showCopy?: boolean;
};

export function ActiveSedeSwitcher({
    className,
    onCopyToSede,
    showCopy = false,
}: ActiveSedeSwitcherProps) {
    const { t } = useTranslation('common');
    const page = usePage<{ active_sede?: ActiveSedeShared }>();
    const active = page.props.active_sede ?? null;
    const [switching, setSwitching] = useState(false);

    const current = useMemo(
        () => active?.sedes.find((s) => s.id === active.id) ?? null,
        [active],
    );

    if (!active || active.sedes.length === 0) {
        return null;
    }

    const canSwitch = active.can_switch && active.sedes.length > 1;

    const switchSede = (sedeId: string) => {
        if (sedeId === active.id || switching || !canSwitch) {
            return;
        }
        setSwitching(true);
        router.post(
            '/sede-activa',
            { sede_id: sedeId },
            {
                preserveScroll: true,
                onFinish: () => setSwitching(false),
            },
        );
    };

    const control: ReactNode = (
        <div className="flex min-w-0 flex-col gap-0.5">
            <span className="hidden text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:block">
                {t('sede_switcher.label', { defaultValue: 'Sede activa' })}
            </span>
            <Select
                value={active.id ?? undefined}
                onValueChange={switchSede}
                disabled={switching || !canSwitch}
            >
                <SelectTrigger
                    size="sm"
                    className={cn(
                        'h-9 min-w-[10.5rem] max-w-[18rem] cursor-pointer gap-1.5 border-[#660033]/25 bg-background shadow-none',
                        'hover:border-[#660033]/45 focus-visible:border-[#660033]/50 focus-visible:ring-[#660033]/20',
                        !canSwitch &&
                            'cursor-default opacity-100 disabled:opacity-100',
                    )}
                    aria-label={t('sede_switcher.label', {
                        defaultValue: 'Sede activa',
                    })}
                >
                    <Building2 className="size-3.5 shrink-0 text-[#660033]" />
                    <SelectValue
                        placeholder={t('sede_switcher.placeholder', {
                            defaultValue: 'Elige sede',
                        })}
                    >
                        {current ? (
                            <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate font-medium">
                                    {current.nombre}
                                </span>
                                <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                                    {current.codigo}
                                </span>
                            </span>
                        ) : null}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[14rem]">
                    {active.sedes.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id}>
                            <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
                                <span className="truncate font-medium">
                                    {sede.nombre}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    {sede.codigo}
                                </span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <div
            className={cn(
                'flex min-w-0 max-w-[min(100%,20rem)] items-center gap-1.5',
                className,
            )}
        >
            {canSwitch ? (
                control
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>{control}</TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                        {t('sede_switcher.only_one', {
                            defaultValue:
                                'Solo tienes una sede; crea otra en Configuración → Sedes para poder cambiar.',
                        })}
                    </TooltipContent>
                </Tooltip>
            )}

            {showCopy && onCopyToSede && canSwitch ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="mt-auto size-9 shrink-0 cursor-pointer"
                            onClick={onCopyToSede}
                            aria-label={t('sede_switcher.copy', {
                                defaultValue: 'Copiar a otra sede',
                            })}
                        >
                            <Copy className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {t('sede_switcher.copy', {
                            defaultValue: 'Copiar a otra sede',
                        })}
                    </TooltipContent>
                </Tooltip>
            ) : null}
        </div>
    );
}
