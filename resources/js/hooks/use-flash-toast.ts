import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toastManager, type ToastType } from '@/lib/toast';

export type FlashShape = {
    id?: string | null;
    success?: string | null;
    error?: string | null;
    info?: string | null;
    warning?: string | null;
    copy_url?: string | null;
    copy_label?: string | null;
};

const FLASH_KEYS: { key: keyof FlashShape; type: ToastType }[] = [
    { key: 'success', type: 'success' },
    { key: 'error', type: 'error' },
    { key: 'info', type: 'info' },
    { key: 'warning', type: 'warning' },
];

/** Evita duplicar el mismo flash entre `<FlashToastBridge>` y `useFlashToast`. */
let lastProcessedFlashId: string | null = null;

async function copyToClipboard(value: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(value);
        toastManager.success({ title: 'Enlace copiado' });
    } catch {
        toastManager.error({ title: 'No se pudo copiar el enlace' });
    }
}

function showFlashes(flash: FlashShape): void {
    const copyUrl =
        typeof flash.copy_url === 'string' && flash.copy_url.length > 0
            ? flash.copy_url
            : null;
    const copyLabel =
        typeof flash.copy_label === 'string' && flash.copy_label.length > 0
            ? flash.copy_label
            : 'Enlace de acceso';

    for (const { key, type } of FLASH_KEYS) {
        const message = flash[key];

        if (typeof message !== 'string' || message.length === 0) {
            continue;
        }

        if (key === 'success' && copyUrl) {
            toastManager.add({
                type,
                title: message,
                description: copyLabel,
                duration: 25_000,
                action: {
                    label: 'Copiar enlace',
                    onClick: () => {
                        void copyToClipboard(copyUrl);
                    },
                },
            });
            continue;
        }

        toastManager.add({ type, title: message });
    }
}

export function processFlashPayload(
    flash: FlashShape | null | undefined,
): void {
    if (!flash || typeof flash.id !== 'string' || flash.id === '') {
        return;
    }

    if (lastProcessedFlashId === flash.id) {
        return;
    }

    lastProcessedFlashId = flash.id;
    showFlashes(flash);
}

type InertiaPage = { props?: { flash?: FlashShape | null } };
type InertiaEvent = CustomEvent<{ page?: InertiaPage }>;

/**
 * Escucha visitas Inertia (Toaster fuera del árbol → no hay usePage).
 * Complementa {@link FlashToastBridge}.
 */
export function useFlashToast(): void {
    useEffect(() => {
        const handlePropsFlash = (flash: FlashShape | null | undefined): void => {
            processFlashPayload(flash);
        };

        const initialPage = (router as unknown as { page?: InertiaPage }).page;
        handlePropsFlash(initialPage?.props?.flash);

        const removeSuccess = router.on('success', (event) => {
            const detail = (event as InertiaEvent).detail;
            handlePropsFlash(detail?.page?.props?.flash);
        });

        const removeError = router.on('error', (event) => {
            const detail = (event as InertiaEvent).detail;
            handlePropsFlash(detail?.page?.props?.flash);
        });

        return () => {
            removeSuccess();
            removeError();
        };
    }, []);
}
