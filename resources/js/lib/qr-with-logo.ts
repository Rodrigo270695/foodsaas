import QRCode from 'qrcode';

export type QrWithLogoOptions = {
    /** URL o texto a codificar. */
    data: string;
    /** Tamaño del canvas en px (cuadrado). */
    size?: number;
    /** URL del logo (mismo origen o con CORS). Si falla, se genera el QR sin logo. */
    logoUrl?: string | null;
    /** Fracción del QR cubierta por el logo (0.18–0.28 recomendado). */
    logoRatio?: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar el logo'));
        img.src = src;
    });
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

/**
 * Genera un QR en canvas (error correction H) con logo centrado opcional.
 * Devuelve data URL PNG listo para `<img>` o descarga.
 */
export async function buildQrWithLogoDataUrl(
    options: QrWithLogoOptions,
): Promise<string> {
    const size = options.size ?? 512;
    const logoRatio = Math.min(0.28, Math.max(0.16, options.logoRatio ?? 0.22));

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    await QRCode.toCanvas(canvas, options.data, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
            dark: '#111111',
            light: '#ffffff',
        },
    });

    const logoUrl = options.logoUrl?.trim();
    if (!logoUrl) {
        return canvas.toDataURL('image/png');
    }

    try {
        const logo = await loadImage(logoUrl);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return canvas.toDataURL('image/png');
        }

        const logoBox = size * logoRatio;
        const pad = logoBox * 0.18;
        const box = logoBox + pad * 2;
        const x = (size - box) / 2;
        const y = (size - box) / 2;

        // Fondo blanco redondeado para no tapar el QR de golpe.
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, x, y, box, box, box * 0.18);
        ctx.fill();

        // Logo centrado (contain).
        const maxInner = logoBox;
        const scale = Math.min(maxInner / logo.width, maxInner / logo.height);
        const dw = logo.width * scale;
        const dh = logo.height * scale;
        const dx = (size - dw) / 2;
        const dy = (size - dh) / 2;
        ctx.drawImage(logo, dx, dy, dw, dh);
    } catch {
        // Sin logo si CORS o URL inválida: el QR sigue siendo usable.
    }

    return canvas.toDataURL('image/png');
}

export function downloadDataUrl(
    dataUrl: string,
    filename: string,
): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
}
