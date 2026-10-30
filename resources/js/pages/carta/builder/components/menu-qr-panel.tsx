import { Copy, Download, ExternalLink, Loader2, QrCode } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    buildQrWithLogoDataUrl,
    downloadDataUrl,
} from '@/lib/qr-with-logo';
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';

type MenuQrPanelProps = {
    publicPath: string;
    publicada: boolean;
    /** Logo del restaurante (centro del QR). */
    logoUrl?: string | null;
    /** Nombre para el archivo descargado. */
    downloadName?: string;
};

export function MenuQrPanel({
    publicPath,
    publicada,
    logoUrl = null,
    downloadName = 'carta-qr',
}: MenuQrPanelProps) {
    const { t } = useTranslation('carta');
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [building, setBuilding] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const absoluteUrl = useMemo(() => {
        if (typeof window === 'undefined') {
            return publicPath;
        }

        return `${window.location.origin}${publicPath}`;
    }, [publicPath]);

    useEffect(() => {
        let cancelled = false;
        setBuilding(true);

        void buildQrWithLogoDataUrl({
            data: absoluteUrl,
            size: 512,
            logoUrl,
        })
            .then((url) => {
                if (!cancelled) {
                    setQrDataUrl(url);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setQrDataUrl(null);
                    toastManager.error({
                        title: t('builder.qr_build_error', {
                            defaultValue: 'No se pudo generar el QR.',
                        }),
                    });
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setBuilding(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [absoluteUrl, logoUrl, t]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const dataUrl =
                qrDataUrl ??
                (await buildQrWithLogoDataUrl({
                    data: absoluteUrl,
                    size: 1024,
                    logoUrl,
                }));

            const safeName = downloadName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-_]+/gi, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            downloadDataUrl(
                dataUrl,
                `${safeName || 'carta-qr'}.png`,
            );
            toastManager.success({
                title: t('builder.qr_downloaded', {
                    defaultValue: 'QR descargado',
                }),
            });
        } catch {
            toastManager.error({
                title: t('builder.qr_download_error', {
                    defaultValue: 'No se pudo descargar el QR.',
                }),
            });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-3">
            <div className="flex items-center gap-2">
                <QrCode className="size-4 text-brand-700 dark:text-brand-300" />
                <p className="text-sm font-semibold">{t('builder.qr_title')}</p>
            </div>

            <div
                className={cn(
                    'flex flex-col items-center gap-3 rounded-xl border bg-background/80 p-3',
                    !publicada && 'border-amber-300/60 bg-amber-50/40',
                )}
            >
                <div className="relative flex size-40 items-center justify-center rounded-xl border bg-white p-2 shadow-sm">
                    {building || !qrDataUrl ? (
                        <Loader2
                            className="size-6 animate-spin text-muted-foreground"
                            aria-hidden
                        />
                    ) : (
                        <img
                            src={qrDataUrl}
                            alt={t('builder.qr_alt')}
                            width={160}
                            height={160}
                            className="size-full object-contain"
                        />
                    )}
                </div>
                <p className="w-full break-all text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {absoluteUrl}
                </p>
                <div className="flex w-full flex-wrap justify-center gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer gap-1"
                        disabled={!qrDataUrl || downloading}
                        onClick={() => void handleDownload()}
                    >
                        {downloading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Download className="size-3.5" />
                        )}
                        {t('builder.qr_download', {
                            defaultValue: 'Descargar',
                        })}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer gap-1"
                        onClick={async () => {
                            await navigator.clipboard.writeText(absoluteUrl);
                            toastManager.success({
                                title: t('builder.qr_copied'),
                            });
                        }}
                    >
                        <Copy className="size-3.5" />
                        {t('builder.qr_copy')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer gap-1"
                        asChild
                    >
                        <a
                            href={absoluteUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink className="size-3.5" />
                            {t('builder.qr_open')}
                        </a>
                    </Button>
                </div>
                {!publicada ? (
                    <p className="text-center text-[11px] font-medium text-amber-800 dark:text-amber-300">
                        {t('builder.qr_unpublished')}
                    </p>
                ) : (
                    <p className="text-center text-[11px] text-emerald-700 dark:text-emerald-300">
                        {t('builder.qr_live', {
                            defaultValue: 'Enlace activo para clientes.',
                        })}
                    </p>
                )}
            </div>
        </div>
    );
}
