import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="toaster group z-[100]"
            position="top-right"
            richColors
            closeButton
            expand
            duration={4000}
            toastOptions={{
                classNames: {
                    toast: 'group toast pointer-events-auto rounded-xl border border-border/60 bg-card text-foreground shadow-lg shadow-foreground/5 ring-1 ring-border/30 backdrop-blur-sm',
                    title: 'text-sm font-semibold',
                    description: 'text-xs text-muted-foreground',
                    actionButton:
                        'rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground cursor-pointer hover:bg-primary/90',
                    cancelButton:
                        'rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-muted/80',
                    closeButton:
                        'cursor-pointer rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--card)',
                    '--normal-text': 'var(--foreground)',
                    '--normal-border': 'var(--border)',
                    '--success-bg': 'oklch(0.98 0.02 165)',
                    '--success-text': 'var(--primary)',
                    '--success-border': 'oklch(0.85 0.08 165)',
                    '--error-bg': 'oklch(0.97 0.03 25)',
                    '--error-text': 'var(--destructive)',
                    '--error-border': 'oklch(0.85 0.1 25)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
