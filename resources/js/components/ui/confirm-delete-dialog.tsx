import { router } from '@inertiajs/react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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
import { toastManager } from '@/lib/toast';
export type ConfirmDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    /** URL DELETE de Inertia. Si es null, el botón queda deshabilitado. */
    deleteUrl: string | null;
    confirmLabel?: string;
    loadingLabel?: string;
    onSuccess?: () => void;
};

/**
 * Modal de confirmación de borrado (reemplaza window.confirm).
 * Los errores de negocio (p. ej. categoría con productos) se muestran
 * vía toast global de validación Inertia.
 */
export function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    deleteUrl,
    confirmLabel,
    loadingLabel,
    onSuccess,
}: ConfirmDeleteDialogProps) {
    const { t } = useTranslation('common');
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!deleteUrl) {
            return;
        }
        setProcessing(true);
        router.delete(deleteUrl, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                onOpenChange(false);
                onSuccess?.();
            },
            onError: (errors) => {
                const first = Object.values(errors).find((value) => {
                    if (typeof value === 'string') {
                        return value.length > 0;
                    }
                    return Array.isArray(value) && typeof value[0] === 'string';
                });
                const message = Array.isArray(first) ? first[0] : first;
                toastManager.error({
                    title:
                        typeof message === 'string' && message.length > 0
                            ? message
                            : t('delete.blocked_toast'),
                });
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <TriangleAlert
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    </div>
                    <DialogTitle className="pt-2 text-base">{title}</DialogTitle>
                    <DialogDescription className="text-sm" asChild>
                        <div>{description}</div>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        {t('actions.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={processing || !deleteUrl}
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : null}
                        {processing
                            ? (loadingLabel ?? t('delete.deleting'))
                            : (confirmLabel ?? t('actions.delete'))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
