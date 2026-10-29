import { Form, Head } from '@inertiajs/react';
import { KeyRound, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    token: string | null;
    valid: boolean;
    restaurant_name?: string | null;
    admin_email?: string | null;
    error?: string | null;
};

export default function BootstrapWelcome({
    token,
    valid,
    restaurant_name,
    admin_email,
    error,
}: Props) {
    const name = restaurant_name?.trim() || 'tu restaurante';

    return (
        <>
            <Head title="Activar acceso" />

            <div className="mb-6 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm">
                {valid ? (
                    <KeyRound
                        aria-hidden="true"
                        strokeWidth={2.25}
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    />
                ) : (
                    <ShieldAlert
                        aria-hidden="true"
                        strokeWidth={2.25}
                        className="mt-0.5 size-4 shrink-0 text-amber-600"
                    />
                )}
                <div className="text-pretty">
                    <p className="font-medium">
                        {valid ? 'Activa tu acceso' : 'Enlace no disponible'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                        {valid
                            ? `Bienvenido a ${name}. Confirma para elegir tu contraseña e ingresar.`
                            : (error ??
                              `No pudimos validar el enlace de ${name}.`)}
                    </p>
                    {valid && admin_email ? (
                        <p className="mt-2 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                            {admin_email}
                        </p>
                    ) : null}
                </div>
            </div>

            {valid && token ? (
                <Form
                    method="post"
                    action={`/auth/bienvenida/${encodeURIComponent(token)}`}
                    className="flex flex-col gap-4"
                >
                    {({ processing }) => (
                        <Button
                            type="submit"
                            size="lg"
                            disabled={processing}
                            className="h-11 w-full text-base font-medium"
                        >
                            {processing ? <Spinner /> : null}
                            Continuar y crear mi contraseña
                        </Button>
                    )}
                </Form>
            ) : null}
        </>
    );
}
