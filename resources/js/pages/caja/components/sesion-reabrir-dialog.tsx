import { router } from '@inertiajs/react';
import { Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
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
import caja from '../caja-routes';

type SesionReabrirDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sesionId: string | null;
};

export function SesionReabrirDialog({
    open,
    onOpenChange,
    sesionId,
}: SesionReabrirDialogProps) {
    const { t } = useTranslation(['caja', 'common']);
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!sesionId) {
            return;
        }

        setProcessing(true);
        router.post(
            caja.reabrir(sesionId).url,
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => onOpenChange(false),
            },
        );
    };

    return (
        <Dialog open={open && sesionId !== null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        <RotateCcw className="size-5" strokeWidth={2.5} />
                    </div>
                    <DialogTitle className="pt-2 text-base">
                        {t('sesiones.dialog_reabrir.title')}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        {t('sesiones.dialog_reabrir.description')}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        {t('common:actions.cancel')}
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer gap-2"
                        onClick={onConfirm}
                        disabled={processing || !sesionId}
                    >
                        {processing ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {t('sesiones.dialog_reabrir.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
