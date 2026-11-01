import { Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PdfPreviewFrame } from '@/components/pdf-preview-frame';
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
    previewWidthPercent,
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
};

function buildPreviewUrl(
    baseUrl: string,
    formato: TicketAnchoMm,
    bust: number,
    persist = false,
): string {
    const params = new URLSearchParams({
        formato,
        _pv: String(bust),
    });
    if (persist) {
        params.set('persist', '1');
    }
    const sep = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${sep}${params.toString()}`;
}

/**
 * Vista previa e impresión del ticket de venta (estilo VetSaaS / DomPDF térmico).
 * Rollos: 56/57/58/80. El PDF usa el área útil del cabezal (~48 u ~72 mm).
 */
export function VentaTicketDialog({
    open,
    onOpenChange,
    ventaId,
    defaultAncho,
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

    const pdfBaseUrl = useMemo(
        () => (ventaId ? ventas.ticketPdf(ventaId).url : ''),
        [ventaId],
    );

    const iframeSrc = useMemo(
        () =>
            pdfBaseUrl
                ? buildPreviewUrl(pdfBaseUrl, formato, iframeBust)
                : '',
        [pdfBaseUrl, formato, iframeBust],
    );

    const utiles = printableMm(formato);
    const paperPct = previewWidthPercent(formato);

    const handleFormatoChange = (next: TicketAnchoMm) => {
        setFormato(next);
        setIframeBust((value) => value + 1);
    };

    const imprimir = () => {
        if (pdfBaseUrl) {
            void fetch(buildPreviewUrl(pdfBaseUrl, formato, Date.now(), true), {
                credentials: 'same-origin',
            }).catch(() => undefined);
        }
        const win = iframeRef.current?.contentWindow;
        if (win) {
            win.focus();
            win.print();
            return;
        }
        if (iframeSrc) {
            window.open(iframeSrc, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <PdfPreviewFrame
                        src={iframeSrc}
                        title={t('ticket_dialog.iframe_title')}
                        iframeRef={iframeRef}
                        loadingLabel={t('ticket_dialog.loading')}
                        errorLabel={t('ticket_dialog.error')}
                        openLabel={t('ticket_dialog.open_pdf')}
                        paperWidthPercent={paperPct}
                        paperCaption={t('ticket_dialog.preview_caption', {
                            roll: formato,
                            utiles,
                        })}
                    />
                ) : null}

                <DialogFooter className="shrink-0 gap-2 sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
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
