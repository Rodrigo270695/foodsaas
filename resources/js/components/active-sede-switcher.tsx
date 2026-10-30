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

/** Iniciales cortas para el trigger en pantallas pequeñas (ej. "Pruebas FoodSaaS" → "PF"). */
export function sedeInitials(nombre: string): string {
    const parts = nombre
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    if (parts.length === 1) {
        const word = parts[0];
        return word.slice(0, Math.min(2, word.length)).toUpperCase();
    }

    const first = parts[0][0] ?? '';
    const last = parts[parts.length - 1][0] ?? '';

    return `${first}${last}`.toUpperCase();
}

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
        <Select
            value={active.id ?? undefined}
            onValueChange={switchSede}
            disabled={switching || !canSwitch}
        >
            <SelectTrigger
                size="sm"
                className={cn(
                    'h-9 w-auto min-w-0 cursor-pointer gap-1 border-[#660033]/25 bg-background px-2 shadow-none',
                    // Móvil: solo iniciales. sm+: nombre + código.
                    'sm:min-w-[10.5rem] sm:max-w-[18rem] sm:gap-1.5 sm:px-2.5',
                    '[&_svg:last-child]:size-3.5 sm:[&_svg:last-child]:size-4',
                    'hover:border-[#660033]/45 focus-visible:border-[#660033]/50 focus-visible:ring-[#660033]/20',
                    !canSwitch &&
                        'cursor-default opacity-100 disabled:opacity-100',
                )}
                aria-label={
                    current
                        ? `${t('sede_switcher.label', {
                              defaultValue: 'Sede activa',
                          })}: ${current.nombre}`
                        : t('sede_switcher.label', {
                              defaultValue: 'Sede activa',
                          })
                }
            >
                <Building2 className="hidden size-3.5 shrink-0 text-[#660033] sm:block" />
                <SelectValue
                    placeholder={t('sede_switcher.placeholder', {
                        defaultValue: 'Elige sede',
                    })}
                >
                    {current ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                            <span
                                className="text-xs font-semibold tracking-wide sm:hidden"
                                aria-hidden
                            >
                                {sedeInitials(current.nombre)}
                            </span>
                            <span className="hidden min-w-0 truncate font-medium sm:inline">
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
    );

    const tooltipBody = canSwitch
        ? (current?.nombre ??
          t('sede_switcher.label', { defaultValue: 'Sede activa' }))
        : t('sede_switcher.only_one', {
              defaultValue:
                  'Solo tienes una sede; crea otra en Configuración → Sedes para poder cambiar.',
          });

    return (
        <div
            className={cn(
                'flex min-w-0 items-center gap-1.5 sm:max-w-[min(100%,20rem)]',
                className,
            )}
        >
            <Tooltip>
                <TooltipTrigger asChild>{control}</TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    {tooltipBody}
                </TooltipContent>
            </Tooltip>

            {showCopy && onCopyToSede && canSwitch ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 shrink-0 cursor-pointer"
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
