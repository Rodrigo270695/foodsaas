import type { ReactNode } from 'react';

/**
 * Layout sin sidebar / breadcrumbs: cartas públicas e impresión PDF.
 */
export default function BlankLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-zinc-100 text-foreground print:bg-white">
            {children}
        </div>
    );
}
