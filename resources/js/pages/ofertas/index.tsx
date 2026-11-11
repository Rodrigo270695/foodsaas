import { Head, useForm } from '@inertiajs/react';
import { Percent, TicketPercent } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { EmptyState, PageHeader } from '@/components/data-page';
import { FormField, FormModal } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';

type OfertaRow = {
    id: string;
    codigo: string;
    nombre: string;
    tipo: 'monto' | 'porcentaje';
    valor: number;
    tope_monto: number | null;
    usos_max: number | null;
    usos_count: number;
    vigente_desde: string | null;
    vigente_hasta: string | null;
    activa: boolean;
    vigente_hoy: boolean;
};

type Props = {
    ofertas: OfertaRow[];
};

type FormData = {
    codigo: string;
    nombre: string;
    tipo: 'monto' | 'porcentaje';
    valor: string;
    tope_monto: string;
    usos_max: string;
    vigente_desde: string;
    vigente_hasta: string;
    activa: boolean;
};

const emptyForm = (): FormData => ({
    codigo: '',
    nombre: '',
    tipo: 'porcentaje',
    valor: '',
    tope_monto: '',
    usos_max: '',
    vigente_desde: '',
    vigente_hasta: '',
    activa: true,
});

export default function OfertasIndex({ ofertas }: Props) {
    const { t } = useTranslation(['ofertas', 'common']);
    const [open, setOpen] = useState(false);
    const form = useForm<FormData>(emptyForm());

    const vigentes = useMemo(
        () => ofertas.filter((o) => o.vigente_hoy).length,
        [ofertas],
    );

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            valor: Number(data.valor || 0),
            tope_monto: data.tope_monto !== '' ? Number(data.tope_monto) : null,
            usos_max: data.usos_max !== '' ? Number(data.usos_max) : null,
            vigente_desde: data.vigente_desde || null,
            vigente_hasta: data.vigente_hasta || null,
        }));
        form.post('/ofertas', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };

    return (
        <>
            <Head title={t('ofertas:title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('ofertas:title')}
                    description={t('ofertas:description')}
                    stats={[
                        {
                            icon: TicketPercent,
                            label: t('ofertas:stats.total'),
                            value: ofertas.length,
                            variant: 'primary',
                        },
                        {
                            icon: Percent,
                            label: t('ofertas:stats.activas'),
                            value: vigentes,
                            variant: 'success',
                        },
                    ]}
                    action={
                        <Can permission="ofertas.create">
                            <Button
                                className="cursor-pointer"
                                onClick={() => {
                                    form.setData(emptyForm());
                                    form.clearErrors();
                                    setOpen(true);
                                }}
                            >
                                {t('ofertas:actions.create')}
                            </Button>
                        </Can>
                    }
                />

                {ofertas.length === 0 ? (
                    <EmptyState
                        title={t('ofertas:empty')}
                        icon={TicketPercent}
                    />
                ) : (
                    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
                        {ofertas.map((row) => (
                            <li
                                key={row.id}
                                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold tracking-wide">
                                        {row.codigo}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {row.nombre} ·{' '}
                                        {row.tipo === 'porcentaje'
                                            ? `${row.valor}%`
                                            : `S/ ${row.valor.toFixed(2)}`}
                                        {row.usos_max
                                            ? ` · ${row.usos_count}/${row.usos_max} usos`
                                            : ` · ${row.usos_count} usos`}
                                    </p>
                                </div>
                                <Badge
                                    variant={
                                        row.vigente_hoy ? 'default' : 'secondary'
                                    }
                                >
                                    {row.vigente_hoy
                                        ? t('ofertas:fields.activa')
                                        : '—'}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <FormModal
                open={open}
                onOpenChange={setOpen}
                title={t('ofertas:actions.create')}
                onSubmit={onSubmit}
                footer={
                    <Button
                        type="submit"
                        disabled={form.processing}
                        className="cursor-pointer"
                    >
                        {t('ofertas:actions.save')}
                    </Button>
                }
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                        label={t('ofertas:fields.codigo')}
                        error={form.errors.codigo}
                    >
                        <Input
                            value={form.data.codigo}
                            onChange={(e) =>
                                form.setData(
                                    'codigo',
                                    e.target.value.toUpperCase(),
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('ofertas:fields.nombre')}
                        error={form.errors.nombre}
                    >
                        <Input
                            value={form.data.nombre}
                            onChange={(e) =>
                                form.setData('nombre', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField label={t('ofertas:fields.tipo')}>
                        <Select
                            value={form.data.tipo}
                            onValueChange={(v) =>
                                form.setData(
                                    'tipo',
                                    v as FormData['tipo'],
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="porcentaje">
                                    {t('ofertas:tipos.porcentaje')}
                                </SelectItem>
                                <SelectItem value="monto">
                                    {t('ofertas:tipos.monto')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField
                        label={t('ofertas:fields.valor')}
                        error={form.errors.valor}
                    >
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.data.valor}
                            onChange={(e) =>
                                form.setData('valor', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField label={t('ofertas:fields.tope')}>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.data.tope_monto}
                            onChange={(e) =>
                                form.setData('tope_monto', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField label={t('ofertas:fields.usos_max')}>
                        <Input
                            type="number"
                            min="1"
                            value={form.data.usos_max}
                            onChange={(e) =>
                                form.setData('usos_max', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField label={t('ofertas:fields.desde')}>
                        <Input
                            type="date"
                            value={form.data.vigente_desde}
                            onChange={(e) =>
                                form.setData('vigente_desde', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField label={t('ofertas:fields.hasta')}>
                        <Input
                            type="date"
                            value={form.data.vigente_hasta}
                            onChange={(e) =>
                                form.setData('vigente_hasta', e.target.value)
                            }
                        />
                    </FormField>
                </div>
            </FormModal>
        </>
    );
}

OfertasIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Cobros' },
            { title: 'Ofertas', href: '/ofertas' },
        ]}
    >
        {page}
    </AppLayout>
);
