import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import {
    fetchPushStatusDetailed,
    isPushSupported,
    isServiceWorkerControlling,
    subscribeToPush,
    unsubscribeFromPush,
    waitForServiceWorker,
} from '@/lib/push-subscription';

type PushShared = {
    enabled: boolean;
    vapidPublicKey: string | null;
};

type UsePushNotificationsResult = {
    browserSupported: boolean;
    configured: boolean;
    supported: boolean;
    permission: NotificationPermission | 'unsupported';
    subscribed: boolean;
    swReady: boolean;
    loading: boolean;
    testing: boolean;
    error: string | null;
    testMessage: string | null;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
    sendTest: () => Promise<void>;
};

function readXsrfToken(): string {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return m?.[1] ? decodeURIComponent(m[1]) : '';
}

export function usePushNotifications(): UsePushNotificationsResult {
    const { push } = usePage().props as { push?: PushShared | null };
    const browserSupported = isPushSupported();
    const configured = Boolean(push?.enabled && push?.vapidPublicKey);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
        browserSupported ? Notification.permission : 'unsupported',
    );
    const [subscribed, setSubscribed] = useState(false);
    const [swReady, setSwReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testMessage, setTestMessage] = useState<string | null>(null);

    const supported = browserSupported && configured;

    useEffect(() => {
        if (!supported) {
            setSwReady(false);
            return;
        }

        let cancelled = false;

        const syncState = async (): Promise<void> => {
            try {
                const registration = await waitForServiceWorker();
                if (cancelled) {
                    return;
                }

                void registration.update();
                setSwReady(isServiceWorkerControlling());

                const existing = await registration.pushManager.getSubscription();
                const status = await fetchPushStatusDetailed();

                if (cancelled) {
                    return;
                }

                if (!status.ok) {
                    setSubscribed(false);
                    setError(
                        status.message ??
                            'No se pudo hablar con el servidor de push. ¿Desplegaste las rutas /push/*?',
                    );
                    return;
                }

                if (existing !== null && !status.subscribed) {
                    // Autocuración: Chrome ya tiene la suscripción; la reenviamos al servidor.
                    try {
                        await subscribeToPush(
                            registration,
                            push?.vapidPublicKey ?? '',
                        );
                        const again = await fetchPushStatusDetailed();
                        if (cancelled) {
                            return;
                        }
                        setSubscribed(again.subscribed);
                        setError(
                            again.subscribed
                                ? null
                                : (again.message ??
                                  'No se pudo guardar la suscripción en el servidor. Pulsa Activar.'),
                        );
                        return;
                    } catch (caught) {
                        if (!cancelled) {
                            setSubscribed(false);
                            setError(
                                caught instanceof Error
                                    ? caught.message
                                    : 'El navegador tiene permiso, pero el servidor rechazó la suscripción.',
                            );
                        }
                        return;
                    }
                }

                setSubscribed(existing !== null && status.subscribed);
                setError(null);
            } catch {
                if (!cancelled) {
                    setSwReady(false);
                    setSubscribed(false);
                }
            }
        };

        void syncState();

        return () => {
            cancelled = true;
        };
    }, [supported, push?.vapidPublicKey]);

    const enable = useCallback(async () => {
        if (!browserSupported) {
            setError('Este navegador no soporta notificaciones push.');
            return;
        }

        if (!configured || !push?.vapidPublicKey) {
            setError('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en el servidor.');
            return;
        }

        setLoading(true);
        setError(null);
        setTestMessage(null);

        try {
            const registration = await waitForServiceWorker();
            void registration.update();
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== 'granted') {
                setError('Permiso de notificaciones denegado.');
                return;
            }

            await subscribeToPush(registration, push.vapidPublicKey);
            const status = await fetchPushStatusDetailed();
            setSubscribed(status.subscribed);
            setSwReady(isServiceWorkerControlling());

            if (!status.subscribed) {
                setError(
                    status.message ??
                        'El servidor no confirmó la suscripción. Revisa la pestaña Red → POST /push/subscribe.',
                );
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'No se pudo activar push.');
            setSubscribed(false);
        } finally {
            setLoading(false);
        }
    }, [browserSupported, configured, push?.vapidPublicKey]);

    const disable = useCallback(async () => {
        setLoading(true);
        setError(null);
        setTestMessage(null);

        try {
            const registration = await waitForServiceWorker();
            await unsubscribeFromPush(registration);
            setSubscribed(false);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'No se pudo desactivar push.');
        } finally {
            setLoading(false);
        }
    }, []);

    const sendTest = useCallback(async () => {
        setTesting(true);
        setError(null);
        setTestMessage(null);

        try {
            const response = await fetch('/push/test', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: '{}',
            });

            const data = (await response.json().catch(() => ({}))) as {
                ok?: boolean;
                message?: string;
            };

            if (!response.ok || !data.ok) {
                setError(
                    data.message ??
                        `No se pudo enviar la prueba (${response.status}).`,
                );
                if (response.status === 422) {
                    setSubscribed(false);
                }
                return;
            }

            setTestMessage(
                data.message ??
                    'Prueba enviada. Mira el centro de notificaciones del sistema.',
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : 'Error de red al enviar la prueba.',
            );
        } finally {
            setTesting(false);
        }
    }, []);

    return {
        browserSupported,
        configured,
        supported,
        permission,
        subscribed,
        swReady,
        loading,
        testing,
        error,
        testMessage,
        enable,
        disable,
        sendTest,
    };
}
