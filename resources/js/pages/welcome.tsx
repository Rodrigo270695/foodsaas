import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login } from '@/routes';

import type { Auth } from '@/types';

export default function Welcome() {
    const { auth, name } = usePage<{ name: string; auth: Auth }>().props;

    return (
        <>
            <Head title="Welcome" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
                <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
                    <img
                        src="/logo.png"
                        alt=""
                        className="size-28 object-contain"
                    />
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Plataforma para gestionar tu restaurante.
                        </p>
                    </div>
                    <nav className="flex flex-wrap items-center justify-center gap-3">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Iniciar sesión
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </div>
        </>
    );
}
