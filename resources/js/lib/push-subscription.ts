function readXsrfToken(): string {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return m?.[1] ? decodeURIComponent(m[1]) : '';
}

type PushSubscriptionJson = {
    endpoint: string;
    keys: {
        auth: string;
        p256dh: string;
    };
    contentEncoding?: string;
};

const VAPID_PUBLIC_KEY_BYTES = 65;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

function arrayBufferToUrlBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]!);
    }

    return window
        .btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function resolveApplicationServerKey(vapidPublicKey: string): BufferSource {
    const keyBytes = urlBase64ToUint8Array(vapidPublicKey.trim());

    if (keyBytes.byteLength !== VAPID_PUBLIC_KEY_BYTES) {
        throw new Error(
            `Clave VAPID inválida: se esperaban ${VAPID_PUBLIC_KEY_BYTES} bytes y llegaron ${keyBytes.byteLength}.`,
        );
    }

    return keyBytes;
}

function resolveContentEncoding(): string {
    if ('PushManager' in window) {
        const supported = (
            window.PushManager as typeof PushManager & {
                supportedContentEncodings?: string[];
            }
        ).supportedContentEncodings;

        if (supported?.includes('aes128gcm')) {
            return 'aes128gcm';
        }
    }

    return 'aesgcm';
}

function subscriptionToPayload(subscription: PushSubscription): PushSubscriptionJson {
    const json = subscription.toJSON() as PushSubscriptionJson;
    let auth = json.keys?.auth;
    let p256dh = json.keys?.p256dh;

    if (!auth || !p256dh) {
        const authKey = subscription.getKey('auth');
        const p256dhKey = subscription.getKey('p256dh');
        if (!authKey || !p256dhKey) {
            throw new Error(
                'El navegador no devolvió las claves de la suscripción. Recarga e inténtalo otra vez.',
            );
        }
        auth = arrayBufferToUrlBase64(authKey);
        p256dh = arrayBufferToUrlBase64(p256dhKey);
    }

    if (!json.endpoint) {
        throw new Error('Suscripción sin endpoint.');
    }

    return {
        endpoint: json.endpoint,
        keys: { auth, p256dh },
        contentEncoding: resolveContentEncoding(),
    };
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const data = (await response.json()) as {
            message?: string;
            errors?: Record<string, string[]>;
        };

        if (data.errors) {
            const first = Object.values(data.errors).flat()[0];
            if (first) {
                return first;
            }
        }

        if (data.message) {
            return data.message;
        }
    } catch {
        // ignore
    }

    if (response.status === 419) {
        return 'Sesión expirada (CSRF). Recarga la página e inténtalo de nuevo.';
    }
    if (response.status === 403) {
        return 'No tienes permiso para activar avisos push.';
    }
    if (response.status === 503) {
        return 'Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en el servidor.';
    }
    if (response.status === 404) {
        return 'Ruta /push/subscribe no encontrada. Despliega el backend actualizado.';
    }
    if (response.status === 500) {
        return 'Error 500 al guardar. ¿Corriste la migración push_subscriptions en el servidor?';
    }

    return `${fallback} (${response.status})`;
}

async function syncSubscription(
    subscription: PushSubscription,
    method: 'POST' | 'DELETE',
): Promise<void> {
    const body =
        method === 'DELETE'
            ? { endpoint: subscription.endpoint }
            : subscriptionToPayload(subscription);

    const response = await fetch('/push/subscribe', {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': readXsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(
            await parseErrorMessage(response, 'Error al guardar la suscripción'),
        );
    }
}

/**
 * Si el navegador ya tiene suscripción, solo la reenvía al servidor (sin destruirla).
 */
export async function syncExistingPushSubscription(
    registration: ServiceWorkerRegistration,
): Promise<boolean> {
    const existing = await registration.pushManager.getSubscription();
    if (!existing) {
        return false;
    }

    await syncSubscription(existing, 'POST');

    return true;
}

export async function subscribeToPush(
    registration: ServiceWorkerRegistration,
    vapidPublicKey: string,
): Promise<PushSubscription> {
    if (!registration.active) {
        throw new Error(
            'No hay service worker activo. Recarga la página (Ctrl+F5) e inténtalo de nuevo.',
        );
    }

    // Primero intenta sincronizar la suscripción existente (caso Chrome con permiso ya dado).
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
        try {
            await syncSubscription(existing, 'POST');
            return existing;
        } catch {
            // Si falla (p. ej. VAPID distinta), recreamos abajo.
            try {
                await existing.unsubscribe();
            } catch {
                // ignore
            }
        }
    }

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: resolveApplicationServerKey(vapidPublicKey),
    });

    await syncSubscription(subscription, 'POST');

    return subscription;
}

export async function unsubscribeFromPush(
    registration: ServiceWorkerRegistration,
): Promise<void> {
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        return;
    }

    try {
        await syncSubscription(subscription, 'DELETE');
    } catch {
        // ignore backend errors on disable
    }

    await subscription.unsubscribe();
}

export function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

export async function waitForServiceWorker(
    timeoutMs = 12_000,
): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Este navegador no soporta service workers.');
    }

    const existing = await navigator.serviceWorker.getRegistration();
    if (existing?.active) {
        return existing;
    }

    const registration = await navigator.serviceWorker.ready;

    if (registration.active) {
        return registration;
    }

    await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => {
            reject(
                new Error('El service worker tarda en activarse. Recarga (Ctrl+F5).'),
            );
        }, timeoutMs);

        navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => {
                window.clearTimeout(timer);
                resolve();
            },
            { once: true },
        );
    });

    return navigator.serviceWorker.ready;
}

export function isServiceWorkerControlling(): boolean {
    return Boolean(navigator.serviceWorker?.controller);
}

export type PushStatusResult = {
    ok: boolean;
    subscribed: boolean;
    status: number;
    message?: string;
};

export async function fetchPushStatusDetailed(): Promise<PushStatusResult> {
    try {
        const response = await fetch('/push/status', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            return {
                ok: false,
                subscribed: false,
                status: response.status,
                message: await parseErrorMessage(
                    response,
                    'No se pudo consultar el estado push',
                ),
            };
        }

        const data = (await response.json()) as { subscribed?: boolean };

        return {
            ok: true,
            subscribed: Boolean(data.subscribed),
            status: response.status,
        };
    } catch {
        return {
            ok: false,
            subscribed: false,
            status: 0,
            message: 'Sin conexión al consultar /push/status',
        };
    }
}
