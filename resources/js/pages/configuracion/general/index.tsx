import type { FormDataConvertible } from '@inertiajs/core';
import { Head, router } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Eye,
    EyeOff,
    Info,
    KeyRound,
    Loader2,
    Palette,
    Phone,
    Receipt,
    Save,
    ShieldCheck,
    Store,
    Trash2,
    XCircle,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormSection } from '@/components/forms';
import {
    GeoCascadeFields,
    type GeoCascadeValue,
} from '@/components/geo/geo-cascade-fields';
import { PageHeader } from '@/components/data-page/page-header';
import { StatBadge } from '@/components/data-page/stat-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { LogoUploader } from './components/logo-uploader';
import { SectionCard } from './components/section-card';
import general from './general-routes';
import type {
    ConfiguracionGeneralProps,
    GeneralTab,
    IgvAfectacion,
    RestaurantSetting,
    TicketAnchoMm,
} from './types';

const TICKET_ANCHOS: readonly TicketAnchoMm[] = ['56', '57', '58', '80'];

type FormState = {
    ruc: string;
    razon_social: string;
    nombre_comercial: string;
    direccion_fiscal: string;
    distrito_id: number | null;
    email_institucional: string;
    telefono_principal: string;
    web_url: string;
    moneda: 'PEN' | 'USD';
    igv_porcentaje: string;
    igv_alimentos_porcentaje: string;
    igv_afectacion: IgvAfectacion;
    precio_incluye_igv: boolean;
    ticket_ancho_mm: TicketAnchoMm;
    emite_comprobantes_sunat: boolean;
    apisunat_token: string;
    apisunat_mode: 'sandbox' | 'produccion';
};

const normalizeTicketAncho = (value: string | null | undefined): TicketAnchoMm =>
    TICKET_ANCHOS.includes(value as TicketAnchoMm)
        ? (value as TicketAnchoMm)
        : '80';

const buildInitialState = (setting: RestaurantSetting): FormState => ({
    ruc: setting.ruc ?? '',
    razon_social: setting.razon_social ?? '',
    nombre_comercial: setting.nombre_comercial ?? '',
    direccion_fiscal: setting.direccion_fiscal ?? '',
    distrito_id: setting.distrito_id ?? null,
    email_institucional: setting.email_institucional ?? '',
    telefono_principal: setting.telefono_principal ?? '',
    web_url: setting.web_url ?? '',
    moneda: setting.moneda === 'USD' ? 'USD' : 'PEN',
    igv_porcentaje: setting.igv_porcentaje ?? '18.00',
    igv_alimentos_porcentaje: setting.igv_alimentos_porcentaje ?? '18.00',
    igv_afectacion:
        setting.igv_afectacion === 'exonerado' ||
        setting.igv_afectacion === 'inafecto'
            ? setting.igv_afectacion
            : 'gravado',
    precio_incluye_igv: setting.precio_incluye_igv,
    ticket_ancho_mm: normalizeTicketAncho(setting.ticket_ancho_mm),
    emite_comprobantes_sunat: setting.emite_comprobantes_sunat,
    apisunat_token: '',
    apisunat_mode: setting.apisunat_mode === 'produccion' ? 'produccion' : 'sandbox',
});

const buildInitialGeo = (setting: RestaurantSetting): GeoCascadeValue => {
    if (!setting.distrito_model) {
        return {
            departamento_id: null,
            provincia_id: null,
            distrito_id: setting.distrito_id ?? null,
        };
    }

    return {
        departamento_id: setting.distrito_model.provincia.departamento_id,
        provincia_id: setting.distrito_model.provincia_id,
        distrito_id: setting.distrito_model.id,
    };
};

const resolveErrorTab = (errors: Record<string, string>): GeneralTab => {
    const keys = Object.keys(errors);

    if (
        keys.some((key) =>
            [
                'moneda',
                'igv_porcentaje',
                'igv_alimentos_porcentaje',
                'igv_afectacion',
                'precio_incluye_igv',
                'ticket_ancho_mm',
                'emite_comprobantes_sunat',
                'apisunat_token',
                'apisunat_mode',
            ].includes(key),
        )
    ) {
        return 'facturacion';
    }

    return 'identidad';
};

export default function Index({
    setting,
    restaurant_header,
    departamentos,
    plan_permite_factura_electronica,
    mutations_locked = false,
}: ConfiguracionGeneralProps) {
    const { t } = useTranslation(['general', 'common']);
    const { can, isSuperadmin } = usePermission();
    const canUpdate = can('config-general.update') && !mutations_locked;

    const [data, setDataInternal] = useState<FormState>(() =>
        buildInitialState(setting),
    );
    const [activeTab, setActiveTab] = useState<GeneralTab>('identidad');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [clearLogo, setClearLogo] = useState(false);
    const [clearApisunat, setClearApisunat] = useState(false);
    const [showApisunatToken, setShowApisunatToken] = useState(false);
    const [geo, setGeo] = useState<GeoCascadeValue>(() =>
        buildInitialGeo(setting),
    );
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const recentSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    /* eslint-disable react-hooks/set-state-in-effect -- sync local form state with Inertia props after save */
    useEffect(() => {
        setDataInternal(buildInitialState(setting));
        setGeo(buildInitialGeo(setting));
        setLogoFile(null);
        setClearLogo(false);
        setClearApisunat(false);
        setShowApisunatToken(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setting.updated_at]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        return () => {
            if (recentSuccessTimerRef.current) {
                clearTimeout(recentSuccessTimerRef.current);
            }
        };
    }, []);

    const setData = useCallback(
        <K extends keyof FormState>(key: K, value: FormState[K]) => {
            setDataInternal((current) => ({ ...current, [key]: value }));
        },
        [],
    );

    const handleGeoChange = (next: GeoCascadeValue) => {
        setGeo(next);
        setData('distrito_id', next.distrito_id);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload: Record<string, FormDataConvertible> = {
            _method: 'put',
            ruc: data.ruc,
            razon_social: data.razon_social,
            nombre_comercial: data.nombre_comercial,
            direccion_fiscal: data.direccion_fiscal,
            distrito_id: data.distrito_id ?? '',
            email_institucional: data.email_institucional,
            telefono_principal: data.telefono_principal,
            web_url: data.web_url,
            moneda: data.moneda,
            igv_porcentaje: data.igv_porcentaje,
            igv_alimentos_porcentaje: data.igv_alimentos_porcentaje,
            igv_afectacion: data.igv_afectacion,
            precio_incluye_igv: data.precio_incluye_igv ? 1 : 0,
            ticket_ancho_mm: data.ticket_ancho_mm,
            emite_comprobantes_sunat: data.emite_comprobantes_sunat ? 1 : 0,
            clear_logo: clearLogo ? 1 : 0,
        };

        if (isSuperadmin) {
            payload.clear_apisunat = clearApisunat ? 1 : 0;
            payload.apisunat_mode = data.apisunat_mode;
            if (data.apisunat_token) {
                payload.apisunat_token = data.apisunat_token;
            }
        }

        if (logoFile) {
            payload.logo = logoFile;
        }

        const logoChanged = Boolean(logoFile) || clearLogo;

        setProcessing(true);
        router.post(general.update().url, payload, {
            preserveScroll: true,
            forceFormData: true,
            onError: (errs) => {
                setErrors(errs as Partial<Record<string, string>>);
                setActiveTab(resolveErrorTab(errs));
            },
            onSuccess: () => {
                setErrors({});
                setRecentlySuccessful(true);
                if (recentSuccessTimerRef.current) {
                    clearTimeout(recentSuccessTimerRef.current);
                }
                recentSuccessTimerRef.current = setTimeout(() => {
                    setRecentlySuccessful(false);
                }, 2500);

                if (logoChanged) {
                    setLogoFile(null);
                    setClearLogo(false);
                    router.reload({ only: ['setting', 'clinic_branding'] });
                }
            },
            onFinish: () => setProcessing(false),
        });
    };

    const restaurantName =
        restaurant_header?.nombre_comercial ||
        restaurant_header?.razon_social ||
        '';

    return (
        <>
            <Head title={t('title')} />

            <form
                onSubmit={handleSubmit}
                className="flex flex-1 flex-col gap-5 p-4 pb-28 sm:p-6"
            >
                <PageHeader
                    title={t('title')}
                    description={
                        mutations_locked
                            ? t('demo_locked.description')
                            : restaurantName
                              ? t('description_for', { name: restaurantName })
                              : t('description')
                    }
                    stats={[
                        {
                            label: t('stats_badges.identity', {
                                defaultValue: 'Identidad',
                            }),
                            value: data.ruc.trim() ? 'OK' : '—',
                            variant: data.ruc.trim() ? 'success' : 'warning',
                            icon: Store,
                        },
                        {
                            label: t('stats_badges.logo', {
                                defaultValue: 'Logo',
                            }),
                            value: setting.logo_url ? 'OK' : '—',
                            variant: setting.logo_url ? 'success' : 'muted',
                            icon: Palette,
                        },
                        {
                            label: t('stats_badges.sunat', {
                                defaultValue: 'SUNAT',
                            }),
                            value: data.emite_comprobantes_sunat
                                ? 'Activo'
                                : 'Off',
                            variant: data.emite_comprobantes_sunat
                                ? 'info'
                                : 'muted',
                            icon: Receipt,
                        },
                        {
                            label: t('stats_badges.currency', {
                                defaultValue: 'Moneda',
                            }),
                            value: data.moneda,
                            variant: 'primary',
                            icon: Building2,
                        },
                    ]}
                />

                {mutations_locked ? (
                    <Alert>
                        <ShieldCheck />
                        <AlertTitle>{t('demo_locked.title')}</AlertTitle>
                        <AlertDescription>
                            {t('demo_locked.description')}
                        </AlertDescription>
                    </Alert>
                ) : null}

                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as GeneralTab)
                    }
                    className="gap-5"
                >
                    <div className="sticky top-0 z-30 -mx-2 border-b border-transparent bg-background/95 px-2 py-2 backdrop-blur-md supports-backdrop-filter:bg-background/85">
                        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0">
                            <TabsTrigger
                                value="identidad"
                                className="group h-auto min-h-18 w-full min-w-0 cursor-pointer justify-start gap-3 overflow-hidden whitespace-normal border-border/70 bg-card/70 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md data-[state=active]:border-sky-400 data-[state=active]:bg-sky-50 data-[state=active]:text-sky-950 dark:data-[state=active]:bg-sky-950/40 dark:data-[state=active]:text-sky-100"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300">
                                    <Store className="size-4.5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate font-semibold">
                                        {t('tabs.identidad.title')}
                                    </span>
                                    <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:block">
                                        {t('tabs.identidad.description')}
                                    </span>
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="facturacion"
                                className="group h-auto min-h-18 w-full min-w-0 cursor-pointer justify-start gap-3 overflow-hidden whitespace-normal border-border/70 bg-card/70 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md data-[state=active]:border-emerald-400 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 dark:data-[state=active]:bg-emerald-950/40 dark:data-[state=active]:text-emerald-100"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                                    <Receipt className="size-4.5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate font-semibold">
                                        {t('tabs.facturacion.title')}
                                    </span>
                                    <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:block">
                                        {t('tabs.facturacion.description')}
                                    </span>
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent
                        value="identidad"
                        className="space-y-5 data-[state=active]:animate-in data-[state=active]:fade-in-50"
                    >
                        <SectionCard
                            icon={Building2}
                            title={t('sections.identidad.title')}
                            description={t('sections.identidad.description')}
                        >
                            <FormSection index={0} title="" columns={2} className="gap-0">
                                <FormField
                                    id="general-ruc"
                                    label={t('fields.ruc')}
                                    error={errors.ruc}
                                    hint={t('fields.ruc_hint')}
                                >
                                    <Input
                                        id="general-ruc"
                                        value={data.ruc}
                                        onChange={(e) =>
                                            setData(
                                                'ruc',
                                                e.target.value
                                                    .replace(/\D/g, '')
                                                    .slice(0, 11),
                                            )
                                        }
                                        placeholder="20123456789"
                                        maxLength={11}
                                        inputMode="numeric"
                                        className="font-mono tabular-nums"
                                        disabled={!canUpdate}
                                    />
                                </FormField>

                                <FormField
                                    id="general-razon-social"
                                    label={t('fields.razon_social')}
                                    error={errors.razon_social}
                                >
                                    <Input
                                        id="general-razon-social"
                                        value={data.razon_social}
                                        onChange={(e) =>
                                            setData('razon_social', e.target.value)
                                        }
                                        placeholder="Restaurante El Fogón SAC"
                                        disabled={!canUpdate}
                                    />
                                </FormField>

                                <FormField
                                    id="general-nombre-comercial"
                                    label={t('fields.nombre_comercial')}
                                    error={errors.nombre_comercial}
                                    hint={t('fields.nombre_comercial_hint')}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        id="general-nombre-comercial"
                                        value={data.nombre_comercial}
                                        onChange={(e) =>
                                            setData(
                                                'nombre_comercial',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="El Fogón"
                                        disabled={!canUpdate}
                                    />
                                </FormField>

                                <FormField
                                    id="general-direccion-fiscal"
                                    label={t('fields.direccion_fiscal')}
                                    error={errors.direccion_fiscal}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        id="general-direccion-fiscal"
                                        value={data.direccion_fiscal}
                                        onChange={(e) =>
                                            setData(
                                                'direccion_fiscal',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Av. Principal 123, Lima"
                                        disabled={!canUpdate}
                                    />
                                </FormField>

                                <div className="sm:col-span-2">
                                    <GeoCascadeFields
                                        departamentos={departamentos}
                                        value={geo}
                                        onChange={handleGeoChange}
                                        disabled={!canUpdate || processing}
                                        errors={{
                                            distrito_id: errors.distrito_id,
                                        }}
                                        labels={{
                                            departamento: t('fields.departamento'),
                                            provincia: t('fields.provincia'),
                                            distrito: t('fields.distrito'),
                                        }}
                                    />
                                </div>
                            </FormSection>
                        </SectionCard>

                        <SectionCard
                            icon={Phone}
                            title={t('sections.contacto.title')}
                            description={t('sections.contacto.description')}
                        >
                            <FormSection index={1} title="" columns={2} className="gap-0">
                                <FormField
                                    id="general-email-institucional"
                                    label={t('fields.email_institucional')}
                                    error={errors.email_institucional}
                                >
                                    <Input
                                        id="general-email-institucional"
                                        type="email"
                                        value={data.email_institucional}
                                        onChange={(e) =>
                                            setData(
                                                'email_institucional',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="hola@mirestaurante.pe"
                                        autoComplete="email"
                                        disabled={!canUpdate}
                                    />
                                </FormField>

                                <FormField
                                    id="general-telefono-principal"
                                    label={t('fields.telefono_principal')}
                                    error={errors.telefono_principal}
                                >
                                    <Input
                                        id="general-telefono-principal"
                                        value={data.telefono_principal}
                                        onChange={(e) =>
                                            setData(
                                                'telefono_principal',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="+51 1 555-0101"
                                        autoComplete="tel"
                                        disabled={!canUpdate}
                                    />
                                </FormField>

                                <FormField
                                    id="general-web-url"
                                    label={t('fields.web_url')}
                                    error={errors.web_url}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        id="general-web-url"
                                        type="url"
                                        value={data.web_url}
                                        onChange={(e) =>
                                            setData('web_url', e.target.value)
                                        }
                                        placeholder="https://mirestaurante.pe"
                                        disabled={!canUpdate}
                                    />
                                </FormField>
                            </FormSection>
                        </SectionCard>

                        <SectionCard
                            icon={Palette}
                            title={t('sections.branding.title')}
                            description={t('sections.branding.description')}
                        >
                            <FormSection index={2} title="" columns={1} className="gap-0">
                                <FormField
                                    id="general-logo"
                                    label={t('fields.logo')}
                                    error={errors.logo}
                                    hint={t('fields.logo_hint')}
                                >
                                    <LogoUploader
                                        currentUrl={setting.logo_url}
                                        file={logoFile}
                                        pendingRemoval={clearLogo}
                                        error={errors.logo}
                                        canUpdate={canUpdate}
                                        onSelect={(file) => {
                                            setLogoFile(file);
                                            setClearLogo(false);
                                        }}
                                        onClearSelection={() => setLogoFile(null)}
                                        onTogglePendingRemoval={() =>
                                            setClearLogo((c) => !c)
                                        }
                                    />
                                </FormField>
                            </FormSection>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent
                        value="facturacion"
                        className="space-y-5 data-[state=active]:animate-in data-[state=active]:fade-in-50"
                    >
                        <SectionCard
                            icon={Receipt}
                            title={t('sections.facturacion.title')}
                            description={t('sections.facturacion.description')}
                            badge={
                                <StatBadge
                                    label=""
                                    value={
                                        setting.emite_comprobantes_sunat
                                            ? t('state.configured')
                                            : t('state.not_configured')
                                    }
                                    variant={
                                        setting.emite_comprobantes_sunat
                                            ? 'success'
                                            : 'muted'
                                    }
                                    icon={
                                        setting.emite_comprobantes_sunat
                                            ? CheckCircle2
                                            : XCircle
                                    }
                                />
                            }
                        >
                            <FormSection index={3} title="" columns={2} className="gap-0">
                                <FormField
                                    id="general-moneda"
                                    label={t('fields.moneda')}
                                    error={errors.moneda}
                                    required
                                >
                                    <Select
                                        value={data.moneda}
                                        onValueChange={(v) =>
                                            setData('moneda', v as 'PEN' | 'USD')
                                        }
                                        disabled={!canUpdate}
                                    >
                                        <SelectTrigger id="general-moneda">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">
                                                PEN — {t('fields.moneda_pen')}
                                            </SelectItem>
                                            <SelectItem value="USD">
                                                USD — {t('fields.moneda_usd')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormField>

                                <FormField
                                    id="general-igv-afectacion"
                                    label={t('fields.igv_afectacion')}
                                    error={errors.igv_afectacion}
                                    hint={t('fields.igv_afectacion_hint')}
                                    required
                                    className="sm:col-span-2"
                                >
                                    <Select
                                        value={data.igv_afectacion}
                                        onValueChange={(v) => {
                                            const afectacion = v as IgvAfectacion;
                                            setData('igv_afectacion', afectacion);
                                            if (afectacion !== 'gravado') {
                                                setData('igv_porcentaje', '0');
                                                setData(
                                                    'igv_alimentos_porcentaje',
                                                    '0',
                                                );
                                            } else if (
                                                data.igv_porcentaje === '0'
                                            ) {
                                                setData('igv_porcentaje', '18.00');
                                                setData(
                                                    'igv_alimentos_porcentaje',
                                                    '18.00',
                                                );
                                            }
                                        }}
                                        disabled={!canUpdate}
                                    >
                                        <SelectTrigger id="general-igv-afectacion">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gravado">
                                                {t('fields.igv_afectacion_gravado')}
                                            </SelectItem>
                                            <SelectItem value="exonerado">
                                                {t(
                                                    'fields.igv_afectacion_exonerado',
                                                )}
                                            </SelectItem>
                                            <SelectItem value="inafecto">
                                                {t('fields.igv_afectacion_inafecto')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormField>

                                <FormField
                                    id="general-igv-porcentaje"
                                    label={t('fields.igv_porcentaje')}
                                    error={errors.igv_porcentaje}
                                    hint={t('fields.igv_porcentaje_hint')}
                                    required
                                >
                                    <Input
                                        id="general-igv-porcentaje"
                                        type="number"
                                        value={data.igv_porcentaje}
                                        onChange={(e) =>
                                            setData(
                                                'igv_porcentaje',
                                                e.target.value,
                                            )
                                        }
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        className="tabular-nums"
                                        disabled={
                                            !canUpdate ||
                                            data.igv_afectacion !== 'gravado'
                                        }
                                    />
                                </FormField>

                                <FormField
                                    id="general-igv-alimentos"
                                    label={t('fields.igv_alimentos_porcentaje')}
                                    error={errors.igv_alimentos_porcentaje}
                                    hint={t(
                                        'fields.igv_alimentos_porcentaje_hint',
                                    )}
                                    required
                                >
                                    <Input
                                        id="general-igv-alimentos"
                                        type="number"
                                        value={data.igv_alimentos_porcentaje}
                                        onChange={(e) =>
                                            setData(
                                                'igv_alimentos_porcentaje',
                                                e.target.value,
                                            )
                                        }
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        className="tabular-nums"
                                        disabled={
                                            !canUpdate ||
                                            data.igv_afectacion !== 'gravado'
                                        }
                                    />
                                </FormField>

                                <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                                    {t('fields.igv_restaurante_note')}
                                </div>

                                <div className="sm:col-span-2">
                                    <ToggleRow
                                        id="general-precio-incluye-igv"
                                        label={t('fields.precio_incluye_igv')}
                                        hint={t('fields.precio_incluye_igv_hint')}
                                        checked={data.precio_incluye_igv}
                                        onChange={(v) =>
                                            setData('precio_incluye_igv', v)
                                        }
                                        disabled={!canUpdate}
                                    />
                                </div>

                                <FormField
                                    id="general-ticket-ancho-mm"
                                    label={t('fields.ticket_ancho_mm')}
                                    error={errors.ticket_ancho_mm}
                                    hint={t('fields.ticket_ancho_mm_hint')}
                                    className="sm:col-span-2"
                                >
                                    <Select
                                        value={data.ticket_ancho_mm}
                                        onValueChange={(v) =>
                                            setData(
                                                'ticket_ancho_mm',
                                                v as TicketAnchoMm,
                                            )
                                        }
                                        disabled={!canUpdate}
                                    >
                                        <SelectTrigger id="general-ticket-ancho-mm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TICKET_ANCHOS.map((ancho) => (
                                                <SelectItem
                                                    key={ancho}
                                                    value={ancho}
                                                >
                                                    {t(
                                                        `fields.ticket_ancho_mm_${ancho}`,
                                                    )}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>

                                <div className="flex flex-col gap-3 sm:col-span-2">
                                    {!plan_permite_factura_electronica ? (
                                        <div className="flex gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                                            <Info
                                                className="mt-0.5 size-4 shrink-0"
                                                aria-hidden
                                            />
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium text-foreground">
                                                    {t(
                                                        'plan_sin_facturacion_electronica.title',
                                                    )}
                                                </span>
                                                <span>
                                                    {t(
                                                        'plan_sin_facturacion_electronica.body',
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ) : null}
                                    <ToggleRow
                                        id="general-emite-sunat"
                                        label={t(
                                            'fields.emite_comprobantes_sunat',
                                        )}
                                        hint={t(
                                            'fields.emite_comprobantes_sunat_hint',
                                        )}
                                        checked={data.emite_comprobantes_sunat}
                                        onChange={(v) =>
                                            setData(
                                                'emite_comprobantes_sunat',
                                                v,
                                            )
                                        }
                                        disabled={
                                            !canUpdate ||
                                            !plan_permite_factura_electronica
                                        }
                                    />
                                </div>

                                {plan_permite_factura_electronica &&
                                    !isSuperadmin && (
                                        <div className="sm:col-span-2">
                                            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
                                                        <KeyRound
                                                            className="size-4"
                                                            strokeWidth={2}
                                                        />
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {t(
                                                                'fields.apisunat_title',
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t(
                                                                'fields.apisunat_tenant_hint',
                                                            )}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                                                            setting.apisunat_configurado
                                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 ring-amber-200'
                                                        }`}
                                                    >
                                                        {setting.apisunat_configurado ? (
                                                            <>
                                                                <CheckCircle2 className="size-3" />
                                                                {t(
                                                                    'fields.apisunat_status_configured',
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="size-3" />
                                                                {t(
                                                                    'fields.apisunat_status_pending',
                                                                )}
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                {plan_permite_factura_electronica &&
                                    isSuperadmin && (
                                        <div className="sm:col-span-2">
                                            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                                <div className="mb-3 flex items-center gap-2">
                                                    <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
                                                        <KeyRound
                                                            className="size-4"
                                                            strokeWidth={2}
                                                        />
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {t(
                                                                'fields.apisunat_title',
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t(
                                                                'fields.apisunat_superadmin_hint',
                                                            )}
                                                        </p>
                                                    </div>
                                                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                                                        <ShieldCheck className="size-3" />
                                                        {t(
                                                            'fields.apisunat_superadmin_badge',
                                                        )}
                                                    </span>
                                                    {setting.apisunat_configurado ? (
                                                        <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                                                            <CheckCircle2 className="size-3" />
                                                            {t(
                                                                'fields.apisunat_status_configured',
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    <FormField
                                                        id="apisunat-mode"
                                                        label={t(
                                                            'fields.apisunat_mode',
                                                        )}
                                                        error={
                                                            errors.apisunat_mode
                                                        }
                                                        hint={
                                                            data.apisunat_mode ===
                                                            'produccion'
                                                                ? t(
                                                                      'fields.apisunat_mode_produccion_hint',
                                                                  )
                                                                : t(
                                                                      'fields.apisunat_mode_sandbox_hint',
                                                                  )
                                                        }
                                                    >
                                                        <Select
                                                            value={
                                                                data.apisunat_mode
                                                            }
                                                            onValueChange={(
                                                                v,
                                                            ) =>
                                                                setData(
                                                                    'apisunat_mode',
                                                                    v as
                                                                        | 'sandbox'
                                                                        | 'produccion',
                                                                )
                                                            }
                                                            disabled={
                                                                !canUpdate
                                                            }
                                                        >
                                                            <SelectTrigger id="apisunat-mode">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="sandbox">
                                                                    {t(
                                                                        'fields.apisunat_mode_sandbox',
                                                                    )}
                                                                </SelectItem>
                                                                <SelectItem value="produccion">
                                                                    {t(
                                                                        'fields.apisunat_mode_produccion',
                                                                    )}
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormField>

                                                    <FormField
                                                        id="apisunat-token"
                                                        label={
                                                            setting.apisunat_configurado
                                                                ? t(
                                                                      'fields.apisunat_token_replace',
                                                                  )
                                                                : t(
                                                                      'fields.apisunat_token',
                                                                  )
                                                        }
                                                        error={
                                                            errors.apisunat_token
                                                        }
                                                        hint={t(
                                                            'fields.apisunat_token_hint',
                                                        )}
                                                    >
                                                        <div className="relative">
                                                            <Input
                                                                id="apisunat-token"
                                                                type={
                                                                    showApisunatToken
                                                                        ? 'text'
                                                                        : 'password'
                                                                }
                                                                value={
                                                                    data.apisunat_token
                                                                }
                                                                onChange={(e) =>
                                                                    setData(
                                                                        'apisunat_token',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder={
                                                                    setting.apisunat_configurado
                                                                        ? '••••••••••••••••'
                                                                        : 'eyJhbGciOiJIUzI1NiIs...'
                                                                }
                                                                className="pr-10 font-mono text-xs"
                                                                disabled={
                                                                    !canUpdate ||
                                                                    clearApisunat
                                                                }
                                                                autoComplete="off"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setShowApisunatToken(
                                                                        (v) =>
                                                                            !v,
                                                                    )
                                                                }
                                                                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                                                tabIndex={-1}
                                                                aria-label={
                                                                    showApisunatToken
                                                                        ? t(
                                                                              'fields.apisunat_token_hide',
                                                                          )
                                                                        : t(
                                                                              'fields.apisunat_token_show',
                                                                          )
                                                                }
                                                            >
                                                                {showApisunatToken ? (
                                                                    <EyeOff className="size-4" />
                                                                ) : (
                                                                    <Eye className="size-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </FormField>

                                                    {setting.apisunat_configurado &&
                                                    canUpdate ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setClearApisunat(
                                                                    (v) => !v,
                                                                )
                                                            }
                                                            className={`inline-flex items-center gap-1.5 self-start rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                                                clearApisunat
                                                                    ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/30 hover:bg-destructive/20'
                                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-destructive'
                                                            }`}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                            {clearApisunat
                                                                ? t(
                                                                      'fields.apisunat_clear_cancel',
                                                                  )
                                                                : t(
                                                                      'fields.apisunat_clear',
                                                                  )}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </FormSection>
                        </SectionCard>
                    </TabsContent>
                </Tabs>

                {canUpdate && (
                    <div className="fixed right-2 bottom-2 z-40 w-[calc(100%-1rem)] max-w-xl rounded-xl border border-border/70 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md md:w-[calc(100vw-var(--sidebar-width)-2rem)]">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck
                                    className="size-4 shrink-0 text-primary/70"
                                    strokeWidth={2.25}
                                />
                                <span className="truncate">
                                    {setting.actualizado_por
                                        ? t('footer.last_updated_by', {
                                              name: setting.actualizado_por
                                                  .name,
                                          })
                                        : t('footer.never_updated')}
                                </span>
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <Loader2
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : recentlySuccessful ? (
                                    <CheckCircle2
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                ) : (
                                    <Save className="size-4" strokeWidth={2.5} />
                                )}
                                {recentlySuccessful
                                    ? t('actions.saved')
                                    : t('actions.save')}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </>
    );
}

type ToggleRowProps = {
    id: string;
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
};

function ToggleRow({
    id,
    label,
    hint,
    checked,
    onChange,
    disabled,
}: ToggleRowProps) {
    return (
        <label
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60"
        >
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(c) => onChange(c === true)}
                disabled={disabled}
                className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{label}</span>
                {hint && (
                    <span className="text-xs text-muted-foreground">{hint}</span>
                )}
            </div>
        </label>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Configuración' },
            { title: 'General', href: '/configuracion/general' },
        ]}
    >
        {page}
    </AppLayout>
);
