import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toastManager } from '@/lib/toast';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import caja from '../caja-routes';
import { CAJA_BILLETERAS } from './billeteras-types';
import { formatArqueoMoney } from './arqueo-types';

type EgresoRow = {
    id: string;
    monto: string | number;
    medio: string;
    motivo: string;
    notas: string | null;
    created_at: string;
    created_by?: { id: number; name: string } | null;
};

type SesionEgresoModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    egresos: EgresoRow[];
    motivos: string[];
    medios: string[];
    moneda?: string;
};

type FormData = {
    monto: string;
    medio: string;
    motivo: string;
    notas: string;
};

/** Efectivo + billeteras (sin tarjeta POS). */
function mediosEgreso(all: string[]): string[] {
    const allowed = new Set<string>(['efectivo', ...CAJA_BILLETERAS]);
    const filtered = all.filter((m) => allowed.has(m));
    return filtered.length > 0 ? filtered : ['efectivo', ...CAJA_BILLETERAS];
}

const emptyForm = (medios: string[], motivos: string[]): FormData => ({
    monto: '',
    medio: medios.includes('efectivo') ? 'efectivo' : (medios[0] ?? 'efectivo'),
    motivo: motivos.includes('otros')
        ? 'otros'
        : motivos.includes('insumos')
          ? 'insumos'
          : (motivos[0] ?? 'otros'),
    notas: '',
});

export function SesionEgresoModal({
    open,
    onOpenChange,
    egresos,
    motivos,
    medios,
    moneda = 'PEN',
}: SesionEgresoModalProps) {
    const { t, i18n } = useTranslation(['caja', 'common']);
    const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-PE';
    const canales = useMemo(() => mediosEgreso(medios), [medios]);

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>(() => emptyForm(canales, motivos));
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            reset();
            clearErrors();
            setData(emptyForm(canales, motivos));
        }
        wasOpenRef.current = open;
    }, [open, canales, motivos, reset, clearErrors, setData]);

    const total = useMemo(
        () =>
            egresos
                .reduce((sum, e) => sum + Number(e.monto || 0), 0)
                .toFixed(2),
        [egresos],
    );

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(caja.egresos.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
                setData(emptyForm(canales, motivos));
                toastManager.success({ title: t('egreso.ok') });
            },
            onError: (formErrors) => {
                const message = Object.values(formErrors).find(
                    (v): v is string => typeof v === 'string' && v.trim() !== '',
                );
                if (message) {
                    toastManager.error({ title: message });
                }
            },
        });
    }

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('egreso.registrar')}
            description={t('egreso.description')}
            size="md"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        {t('common:actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing}
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        {t('egreso.guardar')}
                    </Button>
                </>
            }
        >
            <div className="grid w-full min-w-0 gap-4">
                <FormField
                    id="egreso-monto"
                    className="w-full min-w-0"
                    label={t('egreso.monto')}
                    error={errors.monto}
                    required
                >
                    <Input
                        id="egreso-monto"
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        step="0.01"
                        value={data.monto}
                        onChange={(ev) => setData('monto', ev.target.value)}
                        className="h-10 w-full min-w-0 tabular-nums"
                        autoFocus
                    />
                </FormField>

                <FormField
                    id="egreso-medio"
                    className="w-full min-w-0"
                    label={t('egreso.de_donde')}
                    error={errors.medio}
                    required
                >
                    <Select
                        value={data.medio}
                        onValueChange={(v) => setData('medio', v)}
                    >
                        <SelectTrigger
                            id="egreso-medio"
                            className="h-10 w-full min-w-0 cursor-pointer justify-between"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
                            {canales.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {t(`medios.${m}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField
                    id="egreso-motivo"
                    className="w-full min-w-0"
                    label={t('egreso.motivo')}
                    error={errors.motivo}
                    required
                >
                    <Select
                        value={data.motivo}
                        onValueChange={(v) => setData('motivo', v)}
                    >
                        <SelectTrigger
                            id="egreso-motivo"
                            className="h-10 w-full min-w-0 cursor-pointer justify-between"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
                            {motivos.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {t(`egreso.motivos.${m}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField
                    id="egreso-notas"
                    className="w-full min-w-0"
                    label={t('egreso.detalle')}
                    error={errors.notas}
                >
                    <Textarea
                        id="egreso-notas"
                        value={data.notas}
                        onChange={(ev) => setData('notas', ev.target.value)}
                        rows={3}
                        className="w-full min-w-0 resize-y"
                    />
                </FormField>

                <div className="overflow-hidden rounded-xl border border-border/60">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/40 px-3 py-2.5">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {t('egreso.list_title')}
                        </p>
                        <span className="text-xs font-medium tabular-nums text-rose-700 dark:text-rose-300">
                            {t('egreso.list_total')}:{' '}
                            {formatArqueoMoney(total, moneda, locale)}
                        </span>
                    </div>
                    {egresos.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground">
                            {t('egreso.list_empty')}
                        </p>
                    ) : (
                        <ul className="max-h-48 divide-y divide-border/40 overflow-y-auto">
                            {egresos.map((row) => {
                                const when = formatPeruDateTime(row.created_at);
                                return (
                                    <li
                                        key={row.id}
                                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {t(`egreso.motivos.${row.motivo}`)}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {t(`medios.${row.medio}`)}
                                                {row.notas
                                                    ? ` · ${row.notas}`
                                                    : ''}
                                                {` · ${when.fecha} ${when.hora}`}
                                                {row.created_by
                                                    ? ` · ${row.created_by.name}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <span className="shrink-0 font-medium tabular-nums text-rose-700 dark:text-rose-300">
                                            −
                                            {formatArqueoMoney(
                                                String(row.monto),
                                                moneda,
                                                locale,
                                            )}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </FormModal>
    );
}
