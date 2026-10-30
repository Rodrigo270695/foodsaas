import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            locale: string;
            timezone: string;
            auth: Auth;
            sidebarOpen: boolean;
            demo_mutations_locked?: boolean;
            [key: string]: unknown;
        };
    }
}
