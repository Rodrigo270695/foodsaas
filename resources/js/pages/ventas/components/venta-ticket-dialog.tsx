import { Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    normalizeTicketAncho,
    printableMm,
    TICKET_ANCHO_OPTIONS,
    type TicketAnchoMm,
} from '@/lib/ticket-ancho';
import ventas from '../ventas-routes';

export type { TicketAnchoMm };

export type VentaTicketDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ventaId: string | null;
    defaultAncho?: TicketAnchoMm | string | null;
    autoPrint?: boolean;
    onAutoPrintConsumed?: () => void;
};

function buildTicketPreviewUrl(
    baseUrl: string,
    formato: TicketAnchoMm,
    bust: number,
    options?: { persist?: boolean; autoPrint?: boolean },
): string {
    const params = new URLSearchParams({
        formato,
        _pv: String(bust),
    });
    if (options?.persist) {
        params.set('persist', '1');
    }
    if (options?.autoPrint) {
        params.set('print', '1');
    }
    const sep = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${sep}${params.toString()}`;
}

/**
 * Vista previa HTML e impresión del ticket (mismo patrón que VetSaaS).
 * Sin visor PDF del navegador: el iframe carga text/html térmico.
 */
export function VentaTicketDialog({
    open,
    onOpenChange,
    ventaId,
    defaultAncho,
    autoPrint = false,
    onAutoPrintConsumed,
}: VentaTicketDialogProps) {
    const { t } = useTranslation(['ventas', 'common']);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [formato, setFormato] = useState<TicketAnchoMm>(() =>
        normalizeTicketAncho(defaultAncho),
    );
    const [iframeBust, setIframeBust] = useState(0);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormato(normalizeTicketAncho(defaultAncho));
            setIframeBust((value) => value + 1);
        }
    }, [open, defaultAncho, ventaId]);

    const ticketBaseUrl = useMemo(
        () => (ventaId ? ventas.ticket(ventaId).url : ''),
        [ventaId],
    );

    const iframeSrc = useMemo(
        () =>
            ticketBaseUrl
                ? buildTicketPreviewUrl(ticketBaseUrl, formato, iframeBust, {
                      autoPrint,
                  })
                : '',
        [ticketBaseUrl, formato, iframeBust, autoPrint],
    );

    const utiles = printableMm(formato);

    const handleFormatoChange = (next: TicketAnchoMm) => {
        setFormato(next);
        setIframeBust((value) => value + 1);
    };

    const imprimir = () => {
        if (ticketBaseUrl) {
            void fetch(
                buildTicketPreviewUrl(ticketBaseUrl, formato, Date.now(), {
                    persist: true,
                }),
                { credentials: 'same-origin' },
            ).catch(() => undefined);
        }
        const win = iframeRef.current?.contentWindow;
        if (win) {
            win.focus();
            win.print();
        }
    };

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);
        if (!next) {
            onAutoPrintConsumed?.();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-1rem)] flex-col gap-3 p-4 sm:max-w-2xl sm:p-6">
                <DialogHeader className="shrink-0 space-y-1 pr-8 text-left">
                    <DialogTitle>{t('ticket_dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('ticket_dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <Label className="text-xs font-medium text-foreground">
                        {t('ticket_dialog.format_label')}
                    </Label>
                    <div
                        className="flex flex-wrap gap-2"
                        role="radiogroup"
                        aria-label={t('ticket_dialog.format_label')}
                    >
                        {TICKET_ANCHO_OPTIONS.map((value) => (
                            <Button
                                key={value}
                                type="button"
                                size="sm"
                                variant={
                                    formato === value ? 'default' : 'outline'
                                }
                                className="h-8 cursor-pointer px-3 text-xs"
                                role="radio"
                                aria-checked={formato === value}
                                onClick={() => handleFormatoChange(value)}
                            >
                                {t(`ticket_dialog.formatos.${value}`)}
                            </Button>
                        ))}
                    </div>
                    <p className="text-[0.7rem] leading-snug text-muted-foreground">
                        {t('ticket_dialog.hint')}
                    </p>
                    <p className="text-[0.7rem] leading-snug text-muted-foreground">
                        {t('ticket_dialog.hint_printable', {
                            roll: formato,
                            utiles,
                        })}
                    </p>
                </div>

                {open && iframeSrc ? (
                    <iframe
                        ref={iframeRef}
                        title={t('ticket_dialog.iframe_title')}
                        src={iframeSrc}
                        className="min-h-[50vh] w-full flex-1 rounded-md border border-border bg-white"
                    />
                ) : null}

                <DialogFooter className="shrink-0 gap-2 sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        className="cursor-pointer"
                    >
                        {t('common:actions.close')}
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer gap-1.5"
                        onClick={imprimir}
                        disabled={!ventaId}
                    >
                        <Printer className="size-4 shrink-0" aria-hidden />
                        {t('ticket_dialog.print')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
