import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    /** URL del PDF (misma origen). */
    src: string;
    title: string;
    className?: string;
    /** Ref opcional al iframe (impresión). */
    iframeRef?: React.RefObject<HTMLIFrameElement | null>;
    loadingLabel?: string;
    errorLabel?: string;
    openLabel?: string;
    /**
     * Ancho relativo del “papel” en la vista previa (1–100).
     * El visor PDF escala al iframe: sin esto, 48 mm y 72 mm se ven iguales.
     */
    paperWidthPercent?: number;
    /** Leyenda bajo el selector / sobre el preview (área útil del cabezal). */
    paperCaption?: string;
};

/**
 * Vista previa rápida: iframe directo al PDF (streaming del navegador).
 * Spinner hasta onLoad; si tarda demasiado, aviso + enlace para abrir.
 */
export function PdfPreviewFrame({
    src,
    title,
    className,
    iframeRef,
    loadingLabel = 'Cargando vista previa…',
    errorLabel = 'No se pudo generar el PDF.',
    openLabel = 'Abrir PDF',
    paperWidthPercent,
    paperCaption,
}: Props) {
    const [loading, setLoading] = useState(true);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        setLoading(true);
        setTimedOut(false);

        const timer = window.setTimeout(() => {
            setTimedOut(true);
            setLoading(false);
        }, 35000);

        return () => window.clearTimeout(timer);
    }, [src]);

    const widthPct = Math.min(
        100,
        Math.max(40, paperWidthPercent ?? 100),
    );
    const constrainPaper = paperWidthPercent != null && paperWidthPercent < 100;

    const frameClass =
        className ??
        'min-h-[50vh] w-full flex-1 rounded-md border border-border bg-white';

    return (
        <div
            className={cn(
                'relative min-h-[50vh] w-full flex-1',
                constrainPaper &&
                    'overflow-auto rounded-md border border-border/70 bg-muted/35 p-2',
            )}
        >
            {paperCaption ? (
                <p className="mb-1.5 text-center text-[0.65rem] leading-snug text-muted-foreground">
                    {paperCaption}
                </p>
            ) : null}

            <div
                className={cn(
                    'relative mx-auto transition-[width] duration-200 ease-out',
                    constrainPaper ? 'min-w-[148px]' : 'h-full w-full',
                )}
                style={{ width: `${widthPct}%` }}
            >
                {loading ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md border border-border bg-muted/30">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                            {loadingLabel}
                        </div>
                    </div>
                ) : null}

                {timedOut ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-md border border-amber-500/30 bg-background/95 p-4 text-center">
                        <AlertTriangle
                            className="size-5 text-amber-700 dark:text-amber-300"
                            aria-hidden
                        />
                        <p className="max-w-md text-sm text-amber-950 dark:text-amber-100">
                            {errorLabel}
                        </p>
                        <Button type="button" variant="outline" size="sm" asChild>
                            <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5"
                            >
                                <ExternalLink
                                    className="size-3.5"
                                    aria-hidden
                                />
                                {openLabel}
                            </a>
                        </Button>
                    </div>
                ) : null}

                <iframe
                    ref={iframeRef}
                    title={title}
                    src={src}
                    onLoad={() => {
                        setLoading(false);
                        setTimedOut(false);
                    }}
                    className={cn(frameClass, loading && 'opacity-0')}
                />
            </div>
        </div>
    );
}
