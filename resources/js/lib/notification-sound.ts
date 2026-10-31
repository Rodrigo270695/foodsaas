/**
 * Sonidos de servicio (mesero ↔ cocina).
 * Igual que VetSaaS sala de espera: MP3 en /public/sounds + prime tras el primer clic.
 *
 * Archivos (reemplázalos por los tuyos):
 *   public/sounds/cocina-nuevo.mp3  → llegó ítem a cocina
 *   public/sounds/plato-listo.mp3   → cocina marcó listo
 */

type ChimeKind = 'kitchen' | 'ready' | 'ping';

const SOURCES: Record<ChimeKind, string> = {
    kitchen: '/sounds/cocina-nuevo.mp3',
    ready: '/sounds/plato-listo.mp3',
    ping: '/sounds/plato-listo.mp3',
};

const players = new Map<string, HTMLAudioElement>();
let primed = false;

function getPlayer(src: string): HTMLAudioElement | null {
    if (typeof window === 'undefined') {
        return null;
    }
    let el = players.get(src);
    if (!el) {
        el = new Audio(src);
        el.preload = 'auto';
        players.set(src, el);
    }
    return el;
}

/** Desbloquea el audio tras el primer gesto (política del navegador). */
export function unlockNotificationAudio(): void {
    if (primed || typeof window === 'undefined') {
        return;
    }

    primed = true;
    for (const src of new Set(Object.values(SOURCES))) {
        const el = getPlayer(src);
        if (!el) {
            continue;
        }
        el.volume = 0;
        const played = el.play();
        if (played === undefined) {
            el.pause();
            el.currentTime = 0;
            el.volume = 1;
            continue;
        }
        void played
            .then(() => {
                el.pause();
                el.currentTime = 0;
                el.volume = 1;
            })
            .catch(() => {
                primed = false;
                el.volume = 1;
            });
    }
}

function ensureUnlockListener(): void {
    if (typeof window === 'undefined' || primed) {
        return;
    }
    const once = () => {
        unlockNotificationAudio();
        window.removeEventListener('pointerdown', once);
        window.removeEventListener('keydown', once);
    };
    window.addEventListener('pointerdown', once, { passive: true });
    window.addEventListener('keydown', once);
}

ensureUnlockListener();

function playFile(src: string): boolean {
    const el = getPlayer(src);
    if (!el) {
        return false;
    }
    el.volume = 1;
    try {
        el.currentTime = 0;
    } catch {
        // Archivo aún no listo
    }
    void el.play().catch(() => {
        // Bloqueado hasta un clic en la página
    });
    return true;
}

/** Fallback sintético si no hay MP3 o falla la carga. */
function playSynth(kind: ChimeKind): void {
    const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
    if (!AC) {
        return;
    }
    const audio = new AC();
    const now = audio.currentTime;

    const tone = (freq: number, start: number, dur: number, gain = 0.09) => {
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
        tone(659.25, now + 0.12, 0.18, 0.1);
        return;
    }
    if (kind === 'ready') {
        tone(659.25, now, 0.12);
        tone(783.99, now + 0.11, 0.12);
        tone(1046.5, now + 0.22, 0.2, 0.1);
        return;
    }
    tone(880, now, 0.12, 0.08);
}

/** Reproduce el sonido personalizado (MP3) o el tono sintético de respaldo. */
export function playNotifyChime(kind: ChimeKind = 'ping'): void {
    const src = SOURCES[kind];
    if (playFile(src)) {
        return;
    }
    playSynth(kind);
}
