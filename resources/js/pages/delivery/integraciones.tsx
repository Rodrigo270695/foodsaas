import { Head, router, usePage } from '@inertiajs/react';
import { Check, Copy, Loader2, Plug } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, StatBadge } from '@/components/data-page';
import { FormField } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type Integracion = {
    proveedor: string;
    activo: boolean;
    store_id: string | null;
    has_api_key: boolean;
    has_webhook_secret: boolean;
    webhook_url: string;
};

type LogRow = {
    id: string;
    proveedor: string;
    external_id: string;
    estado: string;
    pedido_id: string | null;
    error_mensaje: string | null;
    created_at: string;
};

type Props = {
    integraciones: Integracion[];
    logs: LogRow[];
};

const BASE = '/delivery/integraciones';

function IntegracionCard({ integracion }: { integracion: Integracion }) {
    const { t } = useTranslation(['delivery', 'common']);
    const errors = (usePage().props.errors ?? {}) as Record<string, string>;
    const [activo, setActivo] = useState(integracion.activo);
    const [storeId, setStoreId] = useState(integracion.store_id ?? '');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const id = integracion.proveedor;

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        router.post(
            BASE,
            {
                proveedor: id,
                activo,
                store_id: storeId || null,
                api_key: apiKey || null,
                api_secret: apiSecret || null,
                webhook_secret: webhookSecret || null,
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => {
                    setApiKey('');
                    setApiSecret('');
                    setWebhookSecret('');
                },
            },
        );
    };

    const copyUrl = async () => {
        await navigator.clipboard.writeText(integracion.webhook_url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                    {t(`integraciones.proveedores.${id}`, {
                        defaultValue: id,
                    })}
                </h2>
                <StatBadge
                    label={
                        integracion.activo
                            ? t('integraciones.badge_on')
                            : t('integraciones.badge_off')
                    }
                    value=""
                    variant={integracion.activo ? 'success' : 'muted'}
                />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                    checked={activo}
                    onCheckedChange={(v) => setActivo(v === true)}
                />
                {t('integraciones.activo')}
            </label>

            <FormField
                id={`${id}-store`}
                label={t('integraciones.store_id')}
                error={errors.store_id}
            >
                <Input
                    id={`${id}-store`}
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                />
            </FormField>
            <FormField
                id={`${id}-key`}
                label={t('integraciones.api_key')}
                hint={
                    integracion.has_api_key
                        ? `${t('integraciones.secret_set')}. ${t('integraciones.secret_hint')}`
                        : undefined
                }
                error={errors.api_key}
            >
                <Input
                    id={`${id}-key`}
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </FormField>
            <FormField
                id={`${id}-secret`}
                label={t('integraciones.api_secret')}
                error={errors.api_secret}
            >
                <Input
                    id={`${id}-secret`}
                    type="password"
                    autoComplete="off"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                />
            </FormField>
            <FormField
                id={`${id}-wh`}
                label={t('integraciones.webhook_secret')}
                hint={
                    integracion.has_webhook_secret
                        ? `${t('integraciones.secret_set')}. ${t('integraciones.secret_hint')}`
                        : undefined
                }
                error={errors.webhook_secret}
            >
                <Input
                    id={`${id}-wh`}
                    type="password"
                    autoComplete="off"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                />
            </FormField>

            <FormField id={`${id}-url`} label={t('integraciones.webhook_url')}>
                <div className="flex gap-2">
                    <Input
                        id={`${id}-url`}
                        readOnly
                        value={integracion.webhook_url}
                        className="font-mono text-xs"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 cursor-pointer"
                        onClick={() => void copyUrl()}
                        aria-label={t('integraciones.copy')}
                    >
                        {copied ? (
                            <Check className="size-4" />
                        ) : (
                            <Copy className="size-4" />
                        )}
                    </Button>
                </div>
            </FormField>

            <div>
                <Button
                    type="submit"
                    disabled={saving}
                    className="cursor-pointer gap-2"
                >
                    {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {t('integraciones.save')}
                </Button>
            </div>
        </form>
    );
}

function ImportManual({ proveedores }: { proveedores: string[] }) {
    const { t } = useTranslation(['delivery']);
    const errors = (usePage().props.errors ?? {}) as Record<string, string>;
    const [proveedor, setProveedor] = useState(proveedores[0] ?? '');
    const [externalId, setExternalId] = useState('');
    const [cliente, setCliente] = useState('');
    const [telefono, setTelefono] = useState('');
    const [direccion, setDireccion] = useState('');
    const [notas, setNotas] = useState('');
    const [saving, setSaving] = useState(false);

    const canSubmit =
        !saving &&
        proveedor !== '' &&
        externalId.trim() !== '' &&
        cliente.trim() !== '' &&
        direccion.trim() !== '';

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        router.post(
            `${BASE}/importar`,
            {
                proveedor,
                external_id: externalId,
                cliente,
                telefono: telefono || null,
                direccion,
                notas: notas || null,
            },
            {
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm"
        >
            <div>
                <h2 className="text-lg font-semibold">
                    {t('integraciones.import.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t('integraciones.import.description')}
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                    id="imp-prov"
                    label={t('integraciones.import.proveedor')}
                    error={errors.proveedor}
                >
                    <Select value={proveedor} onValueChange={setProveedor}>
                        <SelectTrigger id="imp-prov" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {proveedores.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {t(`integraciones.proveedores.${p}`, {
                                        defaultValue: p,
                                    })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField
                    id="imp-ext"
                    label={t('integraciones.import.external_id')}
                    required
                    error={errors.external_id}
                >
                    <Input
                        id="imp-ext"
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                    />
                </FormField>
                <FormField
                    id="imp-cli"
                    label={t('integraciones.import.cliente')}
                    required
                    error={errors.cliente}
                >
                    <Input
                        id="imp-cli"
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                    />
                </FormField>
                <FormField
                    id="imp-tel"
                    label={t('integraciones.import.telefono')}
                    error={errors.telefono}
                >
                    <Input
                        id="imp-tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                    />
                </FormField>
                <FormField
                    id="imp-dir"
                    label={t('integraciones.import.direccion')}
                    required
                    error={errors.direccion}
                    className="sm:col-span-2"
                >
                    <Input
                        id="imp-dir"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                    />
                </FormField>
                <FormField
                    id="imp-notas"
                    label={t('integraciones.import.notas')}
                    error={errors.notas}
                    className="sm:col-span-2"
                >
                    <Textarea
                        id="imp-notas"
                        rows={2}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                    />
                </FormField>
            </div>
            <div>
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="cursor-pointer gap-2"
                >
                    {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {t('integraciones.import.submit')}
                </Button>
            </div>
        </form>
    );
}

export default function IntegracionesPage({ integraciones, logs }: Props) {
    const { t } = useTranslation(['delivery', 'common']);

    return (
        <>
            <Head title={t('integraciones.title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('integraciones.title')}
                    description={t('integraciones.description')}
                    stats={integraciones.map((i) => ({
                        label: t(`integraciones.proveedores.${i.proveedor}`, {
                            defaultValue: i.proveedor,
                        }),
                        value: i.activo
                            ? t('integraciones.badge_on')
                            : t('integraciones.badge_off'),
                        icon: Plug,
                        variant: i.activo ? 'success' : 'muted',
                    }))}
                />

                <div className="grid gap-5 lg:grid-cols-2">
                    {integraciones.map((integracion) => (
                        <IntegracionCard
                            key={integracion.proveedor}
                            integracion={integracion}
                        />
                    ))}
                </div>

                <ImportManual
                    proveedores={integraciones.map((i) => i.proveedor)}
                />

                <section className="space-y-2">
                    <h2 className="text-lg font-semibold">
                        {t('integraciones.logs.title')}
                    </h2>
                    <div className="overflow-hidden rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">
                                        {t('integraciones.logs.fecha')}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t('integraciones.logs.proveedor')}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t('integraciones.logs.external_id')}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t('integraciones.logs.estado')}
                                    </th>
                                    <th className="hidden px-3 py-2 md:table-cell">
                                        {t('integraciones.logs.error')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-3 py-6 text-center text-muted-foreground"
                                        >
                                            {t('integraciones.logs.empty')}
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-3 py-2 tabular-nums">
                                                {new Date(
                                                    log.created_at,
                                                ).toLocaleString('es-PE')}
                                            </td>
                                            <td className="px-3 py-2">
                                                {log.proveedor}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-xs">
                                                {log.external_id}
                                            </td>
                                            <td className="px-3 py-2">
                                                <StatBadge
                                                    label={log.estado}
                                                    value=""
                                                    variant={
                                                        log.estado === 'error'
                                                            ? 'danger'
                                                            : 'success'
                                                    }
                                                />
                                            </td>
                                            <td className="hidden px-3 py-2 text-xs text-destructive md:table-cell">
                                                {log.error_mensaje ?? ''}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </>
    );
}

IntegracionesPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Servicio' },
            { title: 'Delivery', href: '/delivery' },
            { title: 'Integraciones' },
        ]}
    >
        {page}
    </AppLayout>
);
