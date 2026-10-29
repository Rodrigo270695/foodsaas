import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TenantRequiredProps = {
    attempted_path: string;
};

export default function TenantRequired({ attempted_path }: TenantRequiredProps) {
    return (
        <>
            <Head title="Selecciona un restaurante" />
            <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
                <h1 className="text-xl font-semibold">
                    Esta sección es del panel de un restaurante
                </h1>
                <p className="text-sm text-muted-foreground">
                    Estás en el panel central. La ruta{' '}
                    <span className="font-mono">{attempted_path}</span> requiere
                    entrar por el subdominio del tenant o usar impersonación
                    (próximamente).
                </p>
                <Button asChild variant="outline" className="gap-2">
                    <Link href="/plataforma/tenants">
                        <ArrowLeft className="size-4" />
                        Ir a tenants
                    </Link>
                </Button>
            </div>
        </>
    );
}
