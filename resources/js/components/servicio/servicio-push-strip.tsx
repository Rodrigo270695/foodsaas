import { BellRing, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { cn } from '@/lib/utils';

/**
 * Control de push del SO dentro de la campana de servicio (una sola campana en el header).
 */
export function ServicioPushStrip() {
    const {
        browserSupported,
        configured,
        permission,
        subscribed,
        swReady,
        loading,
        error,
        enable,
        disable,
    } = usePushNotifications();

    if (!browserSupported || !configured) {
        return null;
    }

    if (subscribed) {
        return (
            <div className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-2">
                <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <BellRing className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">
                        Avisos del sistema activos (suenan minimizado)
                    </span>
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-[11px]"
                    onClick={() => void disable()}
                    disabled={loading}
                >
                    {loading ? (
                        <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                        'Quitar'
                    )}
                </Button>
            </div>
        );
    }

    const denied = permission === 'denied';

    return (
        <div className="space-y-1.5 border-t border-border/70 px-3 py-2">
            <p
                className={cn(
                    'text-[11px] leading-snug',
                    denied || error
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground',
                )}
            >
                {denied
                    ? 'El navegador bloqueó avisos. En el candado del sitio → Notificaciones → Permitir, y recarga.'
                    : (error ??
                      'Para que suene con la app minimizada o en otra pestaña, activa avisos del sistema.')}
            </p>
            {!denied ? (
                <Button
                    type="button"
                    size="sm"
                    className="h-7 w-full text-[11px]"
                    onClick={() => void enable()}
                    disabled={loading || !swReady}
                >
                    {loading ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                    ) : !swReady ? (
                        'Preparando…'
                    ) : (
                        'Activar avisos del sistema'
                    )}
                </Button>
            ) : null}
        </div>
    );
}
