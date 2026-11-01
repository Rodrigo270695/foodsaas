import { ExternalLink, Printer } from 'lucide-react';
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

export type VentaCpeDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    numeroCompleto?: string | null;
    tipoComprobante?: 'boleta' | 'factura' | string | null;
    pdfTicketUrl?: string | null;
    pdfA4Url?: string | null;
    enlaceConsulta?: string | null;
    autoPrint?: boolean;
    onAutoPrintConsumed?: () => void;
};

function swapTicketA4(url: string, format: 'ticket' | 'a4'): string {
    if (format === 'a4') {
        return url.includes('/pdf/ticket/')
            ? url.replace('/pdf/ticket/', '/pdf/a4/')
            : url;
    }

    return url.includes('/pdf/a4/')
        ? url.replace('/pdf/a4/', '/pdf/ticket/')
        : url;
}

/**
 * Vista previa del PDF de Lucode/APISUNAT (boleta/factura electrónica).
 */
export function VentaCpeDialog({
    open,
    onOpenChange,
    numeroCompleto,
    tipoComprobante,
    pdfTicketUrl,
    pdfA4Url,
    enlaceConsulta,
    autoPrint = false,
    onAutoPrintConsumed,
}: VentaCpeDialogProps) {
    const { t } = useTranslation(['ventas', 'common']);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [format, setFormat] = useState<'ticket' | 'a4'>('ticket');
    const [bust, setBust] = useState(0);
    const [pendingAutoPrint, setPendingAutoPrint] = useState(false);

    const basePdf =
        pdfTicketUrl ||
        pdfA4Url ||
        enlaceConsulta ||
        null;

    useEffect(() => {
        if (!open) {
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormat('ticket');
        setBust((value) => value + 1);
        setPendingAutoPrint(autoPrint);
    }, [open, autoPrint, basePdf]);

    const iframeSrc = useMemo(() => {
        if (!basePdf) {
            return '';
        }
        const swapped = swapTicketA4(basePdf, format);
        const sep = swapped.includes('?') ? '&' : '?';

        return `${swapped}${sep}_pv=${bust}`;
    }, [basePdf, format, bust]);

    const imprimir = () => {
        const win = iframeRef.current?.contentWindow;
        if (win) {
            win.focus();
            win.print();
        }
    };

    const titulo =
        tipoComprobante === 'factura'
            ? t('cpe_dialog.title_factura')
            : t('cpe_dialog.title_boleta');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-1rem)] flex-col gap-3 p-4 sm:max-w-2xl sm:p-6">
                <DialogHeader className="shrink-0 space-y-1 pr-8 text-left">
                    <DialogTitle>{titulo}</DialogTitle>
                    <DialogDescription>
                        {numeroCompleto
                            ? t('cpe_dialog.description_numero', {
                                  numero: numeroCompleto,
                              })
                            : t('cpe_dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={format === 'ticket' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormat('ticket')}
                    >
                        {t('cpe_dialog.format_ticket')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={format === 'a4' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormat('a4')}
                    >
                        {t('cpe_dialog.format_a4')}
                    </Button>
                    {basePdf ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer gap-1.5"
                            asChild
                        >
                            <a
                                href={iframeSrc || basePdf}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink
                                    className="size-3.5"
                                    aria-hidden
                                />
                                {t('cpe_dialog.open_external')}
                            </a>
                        </Button>
                    ) : null}
                </div>

                {open && iframeSrc ? (
                    <iframe
                        ref={iframeRef}
                        title={t('cpe_dialog.iframe_title')}
                        src={iframeSrc}
                        className="min-h-[50vh] w-full flex-1 rounded-md border border-border bg-white"
                        onLoad={() => {
                            if (!pendingAutoPrint) {
                                return;
                            }
                            setPendingAutoPrint(false);
                            onAutoPrintConsumed?.();
                            window.setTimeout(() => imprimir(), 400);
                        }}
                    />
                ) : (
                    <p className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                        {t('cpe_dialog.sin_pdf')}
                    </p>
                )}

                <DialogFooter className="shrink-0 gap-2 sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common:actions.close')}
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer gap-1.5"
                        disabled={!iframeSrc}
                        onClick={imprimir}
                    >
                        <Printer className="size-4 shrink-0" aria-hidden />
                        {t('cpe_dialog.print')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
