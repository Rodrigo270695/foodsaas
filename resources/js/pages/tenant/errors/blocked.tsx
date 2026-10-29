import { Head } from '@inertiajs/react';
import { Ban, CalendarX, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type BlockType = 'suspended' | 'cancelled' | 'expired';

type BlockedProps = {
    block_type?: BlockType;
    estado: string;
    razon_social: string;
    reason: string | null;
    suspended_at: string | null;
    cancelled_at: string | null;
};

const CONFIG: Record<
    BlockType,
    { icon: typeof Lock; title: string; subtitle: string }
> = {
    expired: {
        icon: CalendarX,
        title: 'Plan vencido',
        subtitle:
            'Renueva tu suscripción en Orvae para volver a usar FoodSaaS.',
    },
    suspended: {
        icon: Lock,
        title: 'Acceso suspendido',
        subtitle: 'Contacta a soporte para reactivar tu restaurante.',
    },
    cancelled: {
        icon: Ban,
        title: 'Cuenta cancelada',
        subtitle: 'Esta cuenta ya no está disponible.',
    },
};

export default function TenantBlocked({
    block_type,
    estado,
    razon_social,
    reason,
}: BlockedProps) {
    const variant: BlockType =
        block_type ?? (estado === 'cancelled' ? 'cancelled' : 'suspended');
    const config = CONFIG[variant];
    const Icon = config.icon;

    return (
        <>
            <Head title={config.title} />
            <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-4 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border">
                    <Icon className="size-8" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">{config.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        {razon_social}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {config.subtitle}
                    </p>
                </div>
                {reason ? (
                    <Card className="w-full text-left">
                        <CardHeader>
                            <CardTitle className="text-base">Detalle</CardTitle>
                            <CardDescription>Motivo registrado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-line text-sm text-muted-foreground">
                                {reason}
                            </p>
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </>
    );
}
