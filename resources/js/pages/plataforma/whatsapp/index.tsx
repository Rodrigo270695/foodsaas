import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/data-page/page-header';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

type Session = {
    status: string;
    phone: string | null;
    push_name: string | null;
    is_ready: boolean;
    last_error: string | null;
    last_synced_at: string | null;
} | null;

type Props = {
    configured: boolean;
    session_name: string;
    session: Session;
};

type QrPayload = {
    ready?: boolean;
    qr_code?: string | null;
    message?: string | null;
    error?: string | null;
    phone?: string | null;
};

function qrSrc(code: string): string {
    if (code.startsWith('data:') || code.startsWith('http')) {
        return code;
    }

    return `data:image/png;base64,${code}`;
}

export default function PlatformWhatsAppIndex({ configured, session_name, session }: Props) {
    const flash = usePage().props.flash as { success?: string; error?: string; info?: string } | null;
    const ready = session?.is_ready === true;
    const [qr, setQr] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('Prueba de FoodSaaS. WhatsApp de plataforma conectado.');

    useEffect(() => {
        if (!configured || ready) {
            return;
        }

        let stop = false;

        const pull = async () => {
            try {
                const response = await fetch('/plataforma/whatsapp/qr', {
                    headers: { Accept: 'application/json' },
                });
                const data = (await response.json()) as QrPayload;
                if (stop) {
                    return;
                }
                if (data.ready) {
                    router.reload({ only: ['session'] });
                    return;
                }
                setQr(data.qr_code ?? null);
                setHint(data.message ?? data.error ?? null);
            } catch {
                if (!stop) {
                    setHint('No se pudo leer el QR. Vuelve a sincronizar.');
                }
            }
        };

        void pull();
        const timer = window.setInterval(() => {
            void pull();
        }, 4000);

        return () => {
            stop = true;
            window.clearInterval(timer);
        };
    }, [configured, ready]);

    return (
        <AppLayout>
            <Head title="WhatsApp de plataforma" />
            <div className="flex flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title="WhatsApp de plataforma"
                    description="Solo el superadmin vincula este número. Los restaurantes no ven esta pantalla ni usan esta sesión."
                />

                {flash?.success ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                        {flash.success}
                    </p>
                ) : null}
                {flash?.info ? (
                    <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
                        {flash.info}
                    </p>
                ) : null}
                {flash?.error ? (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200" role="alert">
                        {flash.error}
                    </p>
                ) : null}

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Sesión</p>
                        <h2 className="mt-2 text-2xl font-semibold text-foreground">{session_name}</h2>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">Estado</dt>
                                <dd className="font-medium">{session?.status ?? 'sin sesión'}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">Número</dt>
                                <dd className="font-medium">{session?.phone || '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">Nombre</dt>
                                <dd className="font-medium">{session?.push_name || '—'}</dd>
                            </div>
                        </dl>
                        {session?.last_error ? (
                            <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">{session.last_error}</p>
                        ) : null}
                        <div className="mt-6 flex flex-wrap gap-2">
                            <Button
                                type="button"
                                disabled={!configured}
                                onClick={() => router.post('/plataforma/whatsapp/sync')}
                            >
                                {ready ? 'Volver a sincronizar' : 'Conectar y mostrar QR'}
                            </Button>
                            {ready ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.post('/plataforma/whatsapp/logout')}
                                >
                                    Desvincular
                                </Button>
                            ) : null}
                        </div>
                        {!configured ? (
                            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                                Falta la configuración. Al final del entorno activa OPENWA_ENABLED, OPENWA_API_URL y OPENWA_API_KEY.
                            </p>
                        ) : null}
                    </div>

                    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-brand-600/30 bg-brand-50/40 p-6 dark:bg-brand-600/10">
                        {ready ? (
                            <p className="text-center text-sm text-foreground">
                                El número de plataforma está listo
                                {session?.phone ? ` (${session.phone})` : ''}.
                            </p>
                        ) : qr ? (
                            <img src={qrSrc(qr)} alt="Código QR para vincular WhatsApp de plataforma" className="w-56 rounded-md bg-white p-2" />
                        ) : (
                            <p className="max-w-xs text-center text-sm text-muted-foreground">
                                {hint ?? 'Sincroniza para generar el QR y escanéalo con el WhatsApp de la casa.'}
                            </p>
                        )}
                    </div>
                </section>

                {ready ? (
                    <form
                        className="max-w-xl space-y-3 rounded-xl border border-border bg-card p-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            router.post('/plataforma/whatsapp/test', { phone, message });
                        }}
                    >
                        <h2 className="text-base font-semibold">Mensaje de prueba</h2>
                        <label className="block text-sm">
                            <span className="text-muted-foreground">Número</span>
                            <input
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                placeholder="987654321"
                                inputMode="tel"
                                required
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-muted-foreground">Texto</span>
                            <textarea
                                className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                maxLength={500}
                                required
                            />
                        </label>
                        <Button type="submit">Enviar prueba</Button>
                    </form>
                ) : null}
            </div>
        </AppLayout>
    );
}
