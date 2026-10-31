import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import caja from '../caja-routes';
import { ArqueoResumen } from './arqueo-resumen';
import { arqueoCsrfToken, type ArqueoPayload } from './arqueo-types';

type SesionArqueoDetalleModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sesionId: string | null;
};

/** Vista de solo lectura del arqueo (sesión cerrada). */
export function SesionArqueoDetalleModal({
    open,
    onOpenChange,
    sesionId,
}: SesionArqueoDetalleModalProps) {
    const { t } = useTranslation(['caja', 'common']);
    const [arqueo, setArqueo] = useState<ArqueoPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !sesionId) {
            return;
        }

        setArqueo(null);
        setError(null);
        setLoading(true);

        const url = caja.arqueo(sesionId).url;
        const token = arqueoCsrfToken();

        void fetch(url, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('arqueo_failed');
                }

                return res.json() as Promise<{ arqueo: ArqueoPayload }>;
            })
            .then((json) => {
                setArqueo(json.arqueo);
            })
            .catch(() => {
                setError(t('sesiones.dialog_cerrar.arqueo_error'));
            })
            .finally(() => {
                setLoading(false);
            });
    }, [open, sesionId, t]);

    return (
        <FormModal
            open={open && sesionId !== null}
            onOpenChange={onOpenChange}
            size="lg"
            title={t('sesiones.dialog_detalle.title')}
            description={t('sesiones.dialog_detalle.description')}
            footer={
                <Button
                    type="button"
                    className="cursor-pointer"
                    onClick={() => onOpenChange(false)}
                >
                    {t('sesiones.dialog_detalle.close')}
                </Button>
            }
        >
            <div className="flex w-full min-w-0 flex-col gap-5">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {t('sesiones.dialog_cerrar.loading_arqueo')}
                    </div>
                ) : null}

                {error ? (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : null}

                {arqueo ? <ArqueoResumen arqueo={arqueo} /> : null}
            </div>
        </FormModal>
    );
}
