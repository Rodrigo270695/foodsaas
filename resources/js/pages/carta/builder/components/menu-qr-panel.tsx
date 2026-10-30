import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toastManager } from '@/lib/toast';

type MenuQrPanelProps = {
    publicPath: string;
    publicada: boolean;
};

export function MenuQrPanel({ publicPath, publicada }: MenuQrPanelProps) {
    const { t } = useTranslation('carta');
    const absoluteUrl = useMemo(() => {
        if (typeof window === 'undefined') {
            return publicPath;
        }

        return `${window.location.origin}${publicPath}`;
    }, [publicPath]);

    const qrSrc = useMemo(
        () =>
            `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(absoluteUrl)}`,
        [absoluteUrl],
    );

    return (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-3">
            <div className="flex items-center gap-2">
                <QrCode className="size-4 text-brand-700 dark:text-brand-300" />
                <p className="text-sm font-semibold">{t('builder.qr_title')}</p>
            </div>
            <div className="flex items-center gap-3">
                <img
                    src={qrSrc}
                    alt={t('builder.qr_alt')}
                    width={96}
                    height={96}
                    className="rounded-lg border bg-white p-1"
                />
                <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {absoluteUrl}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
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
                            <a href={absoluteUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-3.5" />
                                {t('builder.qr_open')}
                            </a>
                        </Button>
                    </div>
                    {!publicada ? (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            {t('builder.qr_unpublished')}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
