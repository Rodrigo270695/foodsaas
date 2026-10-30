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

function loadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (crossOrigin) {
            img.crossOrigin = crossOrigin;
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = src;
    });
}

/**
 * Genera el QR vía API pública y lo carga como blob (evita canvas «tainted»).
 * Sin dependencia npm `qrcode`.
 */
async function loadQrImage(data: string, size: number): Promise<HTMLImageElement> {
    const api = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&ecc=H&data=${encodeURIComponent(data)}`;
    const res = await fetch(api);
    if (!res.ok) {
        throw new Error(`QR HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
        return await loadImage(objectUrl);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
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
 * Genera un QR en canvas (ECC H) con logo centrado opcional.
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
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas no disponible');
    }

    const qr = await loadQrImage(options.data, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(qr, 0, 0, size, size);

    const logoUrl = options.logoUrl?.trim();
    if (!logoUrl) {
        return canvas.toDataURL('image/png');
    }

    try {
        const logo = await loadImage(logoUrl, 'anonymous');
        const logoBox = size * logoRatio;
        const pad = logoBox * 0.18;
        const box = logoBox + pad * 2;
        const x = (size - box) / 2;
        const y = (size - box) / 2;

        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, x, y, box, box, box * 0.18);
        ctx.fill();

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

export function downloadDataUrl(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
}
