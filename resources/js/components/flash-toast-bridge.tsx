import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import {
    processFlashPayload,
    type FlashShape,
} from '@/hooks/use-flash-toast';

type PageProps = {
    flash?: FlashShape | null;
};

/**
 * Dentro del árbol Inertia: muestra toasts cuando `props.flash` cambia
 * (redirects con `->with('success', …)` vía HandleInertiaRequests).
 */
export function FlashToastBridge() {
    const { props } = usePage<PageProps>();

    useEffect(() => {
        processFlashPayload(props.flash);
    }, [props.flash]);

    return null;
}
