import { Head, Link, router, usePage } from '@inertiajs/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { abastecimientoUrl, type Prioridad } from './types';

type Props = {
    sedes: { id: string; nombre: string }[];
    default_solicitante_id: string;
};

type FormLinea = {
    linea_tipo: 'insumo' | 'producto';
    nombre: string;
    cantidad: string;
    unidad: string;
};

const emptyLinea = (): FormLinea => ({
    linea_tipo: 'insumo',
    nombre: '',
    cantidad: '',
    unidad: 'und',
});

export default function AbastecimientoFormPage({
    sedes,
    default_solicitante_id,
}: Props) {
    const { t } = useTranslation(['abastecimiento', 'common']);
    const page = usePage();
    const errors = (page.props.errors ?? {}) as Record<string, string>;

    const [saving, setSaving] = useState(false);
    const [solicitanteId, setSolicitanteId] = useState(default_solicitante_id);
    const [abastecedoraId, setAbastecedoraId] = useState('');
    const [prioridad, setPrioridad] = useState<Prioridad>('normal');
    const [fechaNecesaria, setFechaNecesaria] = useState('');
    const [notas, setNotas] = useState('');
    const [lineas, setLineas] = useState<FormLinea[]>([emptyLinea()]);

    const sedeOptions: ComboboxOption[] = useMemo(
        () => sedes.map((s) => ({ value: s.id, label: s.nombre })),
        [sedes],
    );

    const setLinea = (index: number, patch: Partial<FormLinea>) =>
        setLineas((prev) =>
            prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
        );

    const canSubmit =
        !saving &&
        solicitanteId !== '' &&
        abastecedoraId !== '' &&
        solicitanteId !== abastecedoraId &&
        lineas.length > 0 &&
        lineas.every((l) => l.nombre.trim() !== '' && Number(l.cantidad) > 0);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            abastecimientoUrl.store,
            {
                sede_solicitante_id: solicitanteId,
                sede_abastecedora_id: abastecedoraId,
                prioridad,
                fecha_necesaria: fechaNecesaria || null,
                notas: notas || null,
                lineas,
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <>
            <Head title={t('form.create')} />
            <form
                onSubmit={onSubmit}
                className="flex flex-1 flex-col gap-5 p-4 sm:gap-6 sm:p-6"
            >
                <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {t('form.create')}
                        </h1>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            {t('form.subtitle')}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer"
                        >
                            <Link href={abastecimientoUrl.index}>
                                {t('common:actions.cancel')}
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit}
                            className="cursor-pointer gap-2"
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {t('actions.save')}
                        </Button>
                    </div>
                </header>

                <FormSection
                    index={0}
                    title={t('form.section_datos')}
                    columns={2}
                >
                    <FormField
                        id="rq-solicitante"
                        label={t('form.solicitante')}
                        required
                        error={errors.sede_solicitante_id}
                    >
                        <Combobox
                            id="rq-solicitante"
                            options={sedeOptions}
                            value={solicitanteId || null}
                            onChange={(v) => setSolicitanteId(v ?? '')}
                            placeholder={t('form.sede_placeholder')}
                        />
                    </FormField>
                    <FormField
                        id="rq-abastecedora"
                        label={t('form.abastecedora')}
                        required
                        error={errors.sede_abastecedora_id}
                    >
                        <Combobox
                            id="rq-abastecedora"
                            options={sedeOptions.filter(
                                (s) => s.value !== solicitanteId,
                            )}
                            value={abastecedoraId || null}
                            onChange={(v) => setAbastecedoraId(v ?? '')}
                            placeholder={t('form.sede_placeholder')}
                        />
                    </FormField>
                    <FormField
                        id="rq-prioridad"
                        label={t('form.prioridad')}
                        error={errors.prioridad}
                    >
                        <Select
                            value={prioridad}
                            onValueChange={(v) => setPrioridad(v as Prioridad)}
                        >
                            <SelectTrigger id="rq-prioridad" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(['baja', 'normal', 'alta'] as const).map(
                                    (p) => (
                                        <SelectItem key={p} value={p}>
                                            {t(`prioridades.${p}`)}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField
                        id="rq-fecha"
                        label={t('form.fecha_necesaria')}
                        error={errors.fecha_necesaria}
                    >
                        <Input
                            id="rq-fecha"
                            type="date"
                            value={fechaNecesaria}
                            onChange={(e) => setFechaNecesaria(e.target.value)}
                        />
                    </FormField>
                    <FormField
                        id="rq-notas"
                        label={t('form.notas')}
                        error={errors.notas}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="rq-notas"
                            rows={2}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder={t('form.notas_placeholder')}
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title={t('form.lineas')}
                    description={t('form.lineas_hint')}
                    columns={1}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            onClick={() =>
                                setLineas((prev) => [...prev, emptyLinea()])
                            }
                        >
                            <Plus className="size-3.5" />
                            {t('actions.add_linea')}
                        </Button>
                    }
                >
                    {typeof errors.lineas === 'string' ? (
                        <p className="text-xs text-destructive">
                            {errors.lineas}
                        </p>
                    ) : null}
                    <div className="divide-y overflow-hidden rounded-xl border bg-background">
                        {lineas.map((linea, index) => (
                            <div
                                key={`linea-${index}`}
                                className="grid gap-2 p-3 lg:grid-cols-[8rem_minmax(0,1fr)_7rem_6rem_2.5rem] lg:items-center"
                            >
                                <Select
                                    value={linea.linea_tipo}
                                    onValueChange={(v) =>
                                        setLinea(index, {
                                            linea_tipo:
                                                v as FormLinea['linea_tipo'],
                                        })
                                    }
                                >
                                    <SelectTrigger
                                        className="w-full"
                                        aria-label={t('form.tipo')}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="insumo">
                                            {t('form.tipo_insumo')}
                                        </SelectItem>
                                        <SelectItem value="producto">
                                            {t('form.tipo_producto')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    aria-label={t('form.nombre')}
                                    placeholder={t('form.nombre_placeholder')}
                                    value={linea.nombre}
                                    onChange={(e) =>
                                        setLinea(index, {
                                            nombre: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    type="number"
                                    min={0.001}
                                    step="0.001"
                                    inputMode="decimal"
                                    aria-label={t('form.cantidad')}
                                    placeholder={t('form.cantidad')}
                                    value={linea.cantidad}
                                    onChange={(e) =>
                                        setLinea(index, {
                                            cantidad: e.target.value,
                                        })
                                    }
                                    className="text-right tabular-nums"
                                />
                                <Input
                                    aria-label={t('form.unidad')}
                                    placeholder={t('form.unidad')}
                                    maxLength={20}
                                    value={linea.unidad}
                                    onChange={(e) =>
                                        setLinea(index, {
                                            unidad: e.target.value,
                                        })
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 cursor-pointer text-destructive"
                                    disabled={lineas.length <= 1}
                                    aria-label={t('form.remove')}
                                    onClick={() =>
                                        setLineas((prev) =>
                                            prev.filter((_, i) => i !== index),
                                        )
                                    }
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </FormSection>
            </form>
        </>
    );
}

AbastecimientoFormPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Abastecimiento', href: '/abastecimiento' },
            { title: 'Nuevo' },
        ]}
    >
        {page}
    </AppLayout>
);
