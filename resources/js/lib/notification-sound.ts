/**
 * Sonidos de servicio (mesero ↔ cocina).
 * MP3 en /public/sounds + prime tras el primer clic (como VetSaaS).
 *
 *   public/sounds/cocina-nuevo.mp3  → llegó ítem a cocina
 *   public/sounds/plato-listo.mp3   → cocina marcó listo
 */

type ChimeKind = 'kitchen' | 'ready' | 'ping';

const SOURCES: Record<ChimeKind, string> = {
    kitchen: '/sounds/cocina-nuevo.mp3',
    ready: '/sounds/plato-listo.mp3',
    ping: '/sounds/plato-listo.mp3',
};

let primed = false;
const primedPlayers = new Map<string, HTMLAudioElement>();

function getPrimePlayer(src: string): HTMLAudioElement | null {
    if (typeof window === 'undefined') {
        return null;
    }
    let el = primedPlayers.get(src);
    if (!el) {
        el = new Audio(src);
        el.preload = 'auto';
        primedPlayers.set(src, el);
    }
    return el;
}

/** Desbloquea el audio tras el primer gesto (política del navegador). */
export function unlockNotificationAudio(): void {
    if (typeof window === 'undefined') {
        return;
    }

    for (const src of new Set(Object.values(SOURCES))) {
        const el = getPrimePlayer(src);
        if (!el) {
            continue;
        }
        el.volume = 0;
        const played = el.play();
        if (played === undefined) {
            el.pause();
            el.currentTime = 0;
            el.volume = 1;
            primed = true;
            continue;
        }
        void played
            .then(() => {
                el.pause();
                el.currentTime = 0;
                el.volume = 1;
                primed = true;
            })
            .catch(() => {
                el.volume = 1;
            });
    }
}

function ensureUnlockListener(): void {
    if (typeof window === 'undefined') {
        return;
    }
    const once = () => {
        unlockNotificationAudio();
    };
    window.addEventListener('pointerdown', once, { passive: true });
    window.addEventListener('keydown', once);
    window.addEventListener('touchstart', once, { passive: true });
}

ensureUnlockListener();

function playSynth(kind: ChimeKind): void {
    try {
        const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
        if (!AC) {
            return;
        }
        const audio = new AC();
        const now = audio.currentTime;

        const tone = (freq: number, start: number, dur: number, gain = 0.1) => {
            const osc = audio.createOscillator();
            const g = audio.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.0001, start);
            g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
            osc.connect(g);
            g.connect(audio.destination);
            osc.start(start);
            osc.stop(start + dur + 0.02);
        };

        if (kind === 'kitchen') {
            tone(523.25, now, 0.14);
            tone(659.25, now + 0.12, 0.18, 0.11);
            return;
        }
        if (kind === 'ready') {
            tone(659.25, now, 0.12);
            tone(783.99, now + 0.11, 0.12);
            tone(1046.5, now + 0.22, 0.2, 0.11);
            return;
        }
        tone(880, now, 0.12, 0.09);
    } catch {
        // ignore
    }
}

/** Nueva instancia por reproducción (permite solapar y evita currentTime trabado). */
export function playNotifyChime(kind: ChimeKind = 'ping'): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (!primed) {
        unlockNotificationAudio();
    }

    const src = SOURCES[kind];
    try {
        const el = new Audio(src);
        el.volume = 1;
        const played = el.play();
        if (played === undefined) {
            return;
        }
        void played.catch(() => {
            playSynth(kind);
        });
    } catch {
        playSynth(kind);
    }
}
