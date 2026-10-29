import { Head, Link } from '@inertiajs/react';
import { Building2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

type WelcomeProps = {
    restaurant: {
        slug: string;
        razon_social: string;
        nombre_comercial: string | null;
    };
};

export default function TenantWelcome({ restaurant }: WelcomeProps) {
    const title =
        restaurant.nombre_comercial?.trim() ||
        restaurant.razon_social ||
        restaurant.slug;

    return (
        <>
            <Head title={title} />
            <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Building2 className="size-8" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Panel operativo FoodSaaS. Inicia sesión para continuar.
                    </p>
                </div>
                <Button asChild className="gap-2">
                    <Link href="/login">
                        <LogIn className="size-4" />
                        Iniciar sesión
                    </Link>
                </Button>
            </div>
        </>
    );
}
