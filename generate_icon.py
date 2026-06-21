"""Generate app.ico for LAN Transfer desktop app."""

from pathlib import Path
from PIL import Image, ImageDraw


def main():
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Blue rounded-rectangle background
    draw.rounded_rectangle([(16, 16), (240, 240)], radius=32, fill=(66, 133, 244))

    # White right-pointing arrow (transfer symbol)
    arrow = [
        (60, 118),
        (146, 118),
        (146, 92),
        (192, 128),
        (146, 164),
        (146, 138),
        (60, 138),
    ]
    draw.polygon(arrow, fill="white")

    out = Path(__file__).resolve().parent / "public" / "app.ico"
    out.parent.mkdir(exist_ok=True)
    img.save(str(out), format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
    print(f"Icon saved to {out}")


if __name__ == "__main__":
    main()
