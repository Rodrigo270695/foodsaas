import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

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
};

/**
 * Carga el PDF como blob para detectar errores (HTML 500, login, etc.)
 * en lugar de mostrar un iframe en blanco.
 */
export function PdfPreviewFrame({
    src,
    title,
    className,
    iframeRef,
    loadingLabel = 'Cargando vista previa…',
    errorLabel = 'No se pudo generar el PDF.',
    openLabel = 'Abrir PDF',
}: Props) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!src) {
            return;
        }

        let cancelled = false;
        let objectUrl: string | null = null;

        setLoading(true);
        setError(null);
        setBlobUrl(null);

        void fetch(src, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/pdf',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (res) => {
                const ct = (res.headers.get('content-type') ?? '').toLowerCase();
                if (!res.ok) {
                    const body = await res.text();
                    const snippet = body.replace(/<[^>]+>/g, ' ').trim().slice(0, 160);
                    throw new Error(
                        snippet || `Error HTTP ${res.status}`,
                    );
                }
                if (!ct.includes('pdf') && !ct.includes('octet-stream')) {
                    const body = await res.text();
                    const snippet = body.replace(/<[^>]+>/g, ' ').trim().slice(0, 160);
                    throw new Error(
                        snippet || 'El servidor no devolvió un PDF.',
                    );
                }

                return res.blob();
            })
            .then((blob) => {
                if (cancelled) {
                    return;
                }
                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            })
            .catch((err: unknown) => {
                if (cancelled) {
                    return;
                }
                const message =
                    err instanceof Error ? err.message : errorLabel;
                setError(message || errorLabel);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src, errorLabel]);

    if (loading) {
        return (
            <div
                className={
                    className ??
                    'flex min-h-[50vh] items-center justify-center rounded-md border border-border bg-muted/20'
                }
            >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {loadingLabel}
                </div>
            </div>
        );
    }

    if (error || !blobUrl) {
        return (
            <div
                className={
                    className ??
                    'flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center'
                }
            >
                <AlertTriangle className="size-5 text-destructive" aria-hidden />
                <p className="max-w-md text-sm text-destructive">
                    {error ?? errorLabel}
                </p>
                <Button type="button" variant="outline" size="sm" asChild>
                    <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5"
                    >
                        <ExternalLink className="size-3.5" aria-hidden />
                        {openLabel}
                    </a>
                </Button>
            </div>
        );
    }

    return (
        <iframe
            ref={iframeRef}
            title={title}
            src={blobUrl}
            className={
                className ??
                'min-h-[50vh] w-full flex-1 rounded-md border border-border bg-white'
            }
        />
    );
}
