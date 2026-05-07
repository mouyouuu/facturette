from pathlib import Path
import struct
import sys

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(r"D:\TELECHARGEMENTS\ChatGPT Image 6 mai 2026, 04_13_07.png")
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
OUT_DIR = ROOT / "build"

PNG_PATH = OUT_DIR / "icon.png"
ICO_PATH = OUT_DIR / "icon.ico"
ICNS_PATH = OUT_DIR / "icon.icns"
PWA_ICON_DIR = ROOT / "pwa" / "icons"

ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ICNS_SIZES = [(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)]
ALPHA_CROP_THRESHOLD = 8
PADDING_RATIO = 0.12
PWA_ICONS = [180, 192, 512]


def make_square_icon(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    alpha_mask = image.getchannel("A").point(lambda value: 255 if value >= ALPHA_CROP_THRESHOLD else 0)
    bbox = alpha_mask.getbbox() or image.getbbox()

    if bbox:
        left, top, right, bottom = bbox
        content_width = right - left
        content_height = bottom - top
        padding = int(max(content_width, content_height) * PADDING_RATIO)
        center_x = (left + right) // 2
        center_y = (top + bottom) // 2
        side = max(content_width, content_height) + padding * 2

        crop_left = center_x - side // 2
        crop_top = center_y - side // 2
        crop_right = crop_left + side
        crop_bottom = crop_top + side

        padded = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        paste_x = max(0, -crop_left)
        paste_y = max(0, -crop_top)
        source_box = (
            max(0, crop_left),
            max(0, crop_top),
            min(image.width, crop_right),
            min(image.height, crop_bottom),
        )
        padded.alpha_composite(image.crop(source_box), (paste_x, paste_y))
        image = padded

    image = ImageOps.contain(image, (1024, 1024), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    x = (1024 - image.width) // 2
    y = (1024 - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    return canvas


def ico_bmp_payload(image: Image.Image, size: int) -> bytes:
    frame = image.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    width = height = size
    xor = bytearray()

    for y in range(height - 1, -1, -1):
        for x in range(width):
            r, g, b, a = frame.getpixel((x, y))
            xor.extend((b, g, r, a))

    mask_stride = ((width + 31) // 32) * 4
    and_mask = bytes(mask_stride * height)
    header = struct.pack(
        "<IIIHHIIIIII",
        40,
        width,
        height * 2,
        1,
        32,
        0,
        len(xor) + len(and_mask),
        0,
        0,
        0,
        0,
    )
    return header + bytes(xor) + and_mask


def save_windows_ico(image: Image.Image, path: Path) -> None:
    payloads = [(size[0], ico_bmp_payload(image, size[0])) for size in ICO_SIZES]
    directory_size = 6 + len(payloads) * 16
    offset = directory_size

    header = bytearray(struct.pack("<HHH", 0, 1, len(payloads)))
    body = bytearray()

    for size, payload in payloads:
        width_byte = 0 if size == 256 else size
        height_byte = 0 if size == 256 else size
        header.extend(struct.pack("<BBBBHHII", width_byte, height_byte, 0, 0, 1, 32, len(payload), offset))
        body.extend(payload)
        offset += len(payload)

    path.write_bytes(bytes(header + body))


def save_pwa_icons(image: Image.Image) -> None:
    PWA_ICON_DIR.mkdir(parents=True, exist_ok=True)

    for size in PWA_ICONS:
        resized = image.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(PWA_ICON_DIR / f"icon-{size}.png")


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source icon introuvable: {SOURCE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    icon = make_square_icon(SOURCE)
    icon.save(PNG_PATH)
    save_windows_ico(icon, ICO_PATH)
    icon.save(ICNS_PATH, sizes=ICNS_SIZES)
    save_pwa_icons(icon)

    print(f"PNG : {PNG_PATH}")
    print(f"ICO : {ICO_PATH}")
    print(f"ICNS: {ICNS_PATH}")
    print(f"PWA : {PWA_ICON_DIR}")


if __name__ == "__main__":
    main()
