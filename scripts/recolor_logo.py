"""Recolorea public/logo.png al burdeos de marca (#660033)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public' / 'logo.png'

BRAND = (102, 0, 51)  # #660033
BRAND_DARK = (51, 0, 26)
BRAND_MID = (140, 20, 70)
BRAND_LIGHT = (180, 80, 120)


def recolor(img: Image.Image) -> Image.Image:
    out = img.convert('RGBA')
    px = out.load()
    assert px is not None
    w, h = out.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum > 235:
                px[x, y] = (255, 255, 255, a)
            elif lum > 190:
                px[x, y] = (*BRAND_LIGHT, a)
            elif lum > 120:
                px[x, y] = (*BRAND_MID, a)
            elif lum < 45:
                px[x, y] = (*BRAND_DARK, a)
            else:
                px[x, y] = (*BRAND, a)

    return out


def main() -> None:
    img = Image.open(SRC)
    recolor(img).save(SRC, 'PNG')
    print(f'Logo recoloreado: {SRC}')


if __name__ == '__main__':
    main()
