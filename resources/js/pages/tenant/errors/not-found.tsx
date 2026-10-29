import { Head } from '@inertiajs/react';
import { Building2, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type NotFoundProps = {
    slug: string;
};

export default function TenantNotFound({ slug }: NotFoundProps) {
    return (
        <>
            <Head title="Restaurante no encontrado" />
            <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border">
                    <Building2 className="size-10" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        No encontramos este restaurante
                    </h1>
                    <p className="text-base text-muted-foreground">
                        La dirección{' '}
                        <span className="font-mono text-foreground">{slug}</span>{' '}
                        no está registrada en FoodSaaS.
                    </p>
                </div>
                <Card className="w-full text-left">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <HelpCircle className="size-5 text-primary" />
                            ¿Qué puedes hacer?
                        </CardTitle>
                        <CardDescription>
                            Revisa el subdominio o contacta a soporte Orvae.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="grid gap-3 text-sm text-muted-foreground">
                            <li>
                                Verifica que la URL sea{' '}
                                <span className="font-mono">{slug}.…</span> sin
                                espacios ni mayúsculas.
                            </li>
                            <li>
                                Si acabas de contratar el servicio, la activación
                                puede tardar unos minutos.
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
