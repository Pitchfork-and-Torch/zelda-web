"""Original 1200x630 card and app icons. No game art."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONT_DIR = Path.home() / "botnapper" / "public" / "fonts" / "fontshare"
CLASH = FONT_DIR / "clash-display" / "otf" / "ClashDisplay-Semibold.otf"
SATOSHI = FONT_DIR / "satoshi" / "otf" / "Satoshi-Medium.otf"
SATOSHI_REG = FONT_DIR / "satoshi" / "otf" / "Satoshi-Regular.otf"

BG = (14, 17, 16, 255)
GOLD = (198, 161, 90, 255)
INK = (231, 226, 214, 255)
MUTED = (163, 156, 142, 255)


def font(path: Path, size: int) -> ImageFont.ImageFont:
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.truetype("arial.ttf", size)


def card() -> Image.Image:
    img = Image.new("RGB", (1200, 630), BG[:3])
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((36, 36, 1164, 594), radius=18, outline=GOLD[:3], width=2)
    draw.text((72, 78), "SNES PLAYER", font=font(SATOSHI, 28), fill=MUTED[:3])
    draw.text((68, 150), "Zelda", font=font(CLASH, 168), fill=INK[:3])
    draw.text((72, 360), "A Link to the Past", font=font(SATOSHI, 48), fill=GOLD[:3])
    draw.text((72, 500), "The cartridge stays on your device.", font=font(SATOSHI_REG, 32), fill=MUTED[:3])
    draw.text((72, 548), "zelda.jonbailey.xyz", font=font(SATOSHI, 28), fill=INK[:3])
    return img


def icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)
    pad = max(8, size // 16)
    draw.rounded_rectangle(
        (pad, pad, size - pad - 1, size - pad - 1),
        radius=size // 6,
        outline=GOLD,
        width=max(2, size // 48),
    )
    mark = font(CLASH, int(size * 0.42))
    text = "Z"
    box = draw.textbbox((0, 0), text, font=mark)
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.text(((size - tw) / 2 - box[0], (size - th) / 2 - box[1]), text, font=mark, fill=GOLD)
    return img


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    image = card()
    image.save(PUBLIC / "og.jpg", "JPEG", quality=90, optimize=True)
    image.save(PUBLIC / "share-card.jpg", "JPEG", quality=90, optimize=True)
    image.save(PUBLIC / "og.png", "PNG", optimize=True)
    icon(180).save(PUBLIC / "icon-180.png", "PNG")
    icon(192).save(PUBLIC / "icon-192.png", "PNG")
    icon(512).save(PUBLIC / "icon-512.png", "PNG")
    print("wrote og.jpg og.png share-card.jpg icon-180 icon-192 icon-512")


if __name__ == "__main__":
    main()
