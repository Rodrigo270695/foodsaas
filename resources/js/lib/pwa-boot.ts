const SW_RELOAD_KEY = 'foodsaas-sw-reload';

export function recoverPwaBoot(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return;
    }

    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem(SW_RELOAD_KEY) === '1') {
            return;
        }

        sessionStorage.setItem(SW_RELOAD_KEY, '1');
        window.location.reload();
    });

    window.addEventListener('load', () => {
        window.setTimeout(() => {
            sessionStorage.removeItem(SW_RELOAD_KEY);
        }, 5000);
    });
}
