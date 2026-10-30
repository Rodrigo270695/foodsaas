import { router, usePage } from '@inertiajs/react';
import { Building2, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
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

    const switchSede = (sedeId: string) => {
        if (sedeId === active.id || switching) {
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

    return (
        <div
            className={cn(
                'flex min-w-0 max-w-[min(100%,18rem)] items-center gap-1.5',
                className,
            )}
        >
            {active.can_switch ? (
                <Select
                    value={active.id ?? undefined}
                    onValueChange={switchSede}
                    disabled={switching}
                >
                    <SelectTrigger
                        size="sm"
                        className="h-9 min-w-0 cursor-pointer gap-1.5 border-border/70 bg-background"
                        aria-label={t('sede_switcher.label', {
                            defaultValue: 'Sede activa',
                        })}
                    >
                        <Building2 className="size-3.5 shrink-0 opacity-70" />
                        <SelectValue
                            placeholder={t('sede_switcher.placeholder', {
                                defaultValue: 'Sede',
                            })}
                        />
                    </SelectTrigger>
                    <SelectContent align="end">
                        {active.sedes.map((sede) => (
                            <SelectItem key={sede.id} value={sede.id}>
                                <span className="truncate">
                                    {sede.nombre}
                                    <span className="ml-1 text-muted-foreground">
                                        ({sede.codigo})
                                    </span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <div className="inline-flex h-9 max-w-full items-center gap-1.5 truncate rounded-md border border-border/70 bg-muted/30 px-2.5 text-xs font-medium text-foreground">
                    <Building2 className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate">
                        {current?.nombre ?? '—'}
                    </span>
                </div>
            )}

            {showCopy && onCopyToSede && active.can_switch ? (
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
