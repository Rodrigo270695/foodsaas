/**
 * Tonos cortos vía Web Audio (sin archivos).
 * El audio se desbloquea con el primer gesto del usuario (política del navegador).
 */

type ChimeKind = 'kitchen' | 'ready' | 'ping';

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
    if (!AC) {
        return null;
    }
    if (!ctx) {
        ctx = new AC();
    }
    return ctx;
}

export function unlockNotificationAudio(): void {
    const audio = getCtx();
    if (!audio) {
        return;
    }
    if (audio.state === 'suspended') {
        void audio.resume();
    }
    unlocked = true;
}

function ensureUnlockListener(): void {
    if (typeof window === 'undefined' || unlocked) {
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

function tone(
    audio: AudioContext,
    frequency: number,
    start: number,
    duration: number,
    gain = 0.08,
): void {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
}

/** Reproduce un chime amable. Ignora si el audio aún no está desbloqueado. */
export function playNotifyChime(kind: ChimeKind = 'ping'): void {
    const audio = getCtx();
    if (!audio) {
        return;
    }
    if (audio.state === 'suspended') {
        void audio.resume().catch(() => undefined);
    }

    const now = audio.currentTime;

    if (kind === 'kitchen') {
        // Dos notas ascendentes: llegó pedido a cocina
        tone(audio, 523.25, now, 0.14, 0.09);
        tone(audio, 659.25, now + 0.12, 0.18, 0.1);
        return;
    }

    if (kind === 'ready') {
        // Tres notas brillantes: plato listo para servir
        tone(audio, 659.25, now, 0.12, 0.09);
        tone(audio, 783.99, now + 0.11, 0.12, 0.09);
        tone(audio, 1046.5, now + 0.22, 0.2, 0.1);
        return;
    }

    tone(audio, 880, now, 0.12, 0.08);
}
