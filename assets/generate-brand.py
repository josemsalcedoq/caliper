"""Generate the Caliper repo social-preview banner (1280x640 PNG).

Used as GitHub's Open Graph / social preview image. Re-run after a
brand or tagline change:

    python3 assets/generate-brand.py
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


W, H = 1280, 640
BG = (28, 28, 30, 255)
ACCENT = (13, 153, 255, 255)
RED = (255, 77, 77, 255)
TEXT = (255, 255, 255, 255)
MUTED = (255, 255, 255, 158)
FAINT = (255, 255, 255, 110)

# Try a sequence of fonts so the script works on a stock macOS install
# without depending on Inter being present.
FONT_BOLD_CANDIDATES = [
    "/System/Library/Fonts/SFNSRounded.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
FONT_REGULAR_CANDIDATES = [
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
FONT_MONO_CANDIDATES = [
    "/System/Library/Fonts/SFNSMono.ttf",
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Courier.ttc",
]


def load_font(candidates: list[str], size: int) -> ImageFont.ImageFont:
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_brand_mark(draw: ImageDraw.ImageDraw, x: int, y: int, size: int) -> None:
    """Selection-frame mark with four filled corner handles, the same
    geometry as the toolbar icon, scaled up."""
    thick = max(3, size // 50)
    handle = max(20, size // 7)
    half = handle // 2
    inner = size // 4
    inner_left = x + inner
    inner_right = x + size - inner
    inner_top = y + inner
    inner_bottom = y + size - inner

    # Frame outline
    draw.rectangle([inner_left, inner_top, inner_right, inner_top + thick], fill=ACCENT)
    draw.rectangle(
        [inner_left, inner_bottom - thick, inner_right, inner_bottom], fill=ACCENT
    )
    draw.rectangle([inner_left, inner_top, inner_left + thick, inner_bottom], fill=ACCENT)
    draw.rectangle(
        [inner_right - thick, inner_top, inner_right, inner_bottom], fill=ACCENT
    )

    # Corner handles
    for cx, cy in [
        (inner_left, inner_top),
        (inner_right, inner_top),
        (inner_left, inner_bottom),
        (inner_right, inner_bottom),
    ]:
        draw.rectangle(
            [cx - half, cy - half, cx + half, cy + half], fill=ACCENT
        )


def draw_red_measure(draw: ImageDraw.ImageDraw, x: int, y: int, length: int, label: str) -> None:
    """Small red distance indicator with end caps and a value pill."""
    line_y = y
    draw.rectangle([x, line_y, x + length, line_y + 2], fill=RED)
    draw.rectangle([x, line_y - 6, x + 2, line_y + 8], fill=RED)
    draw.rectangle([x + length - 2, line_y - 6, x + length, line_y + 8], fill=RED)

    pill_w, pill_h = 60, 28
    pill_x = x + (length - pill_w) // 2
    pill_y = line_y - pill_h - 8
    draw.rounded_rectangle(
        [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
        radius=5,
        fill=RED,
    )
    font_pill = load_font(FONT_MONO_CANDIDATES, 16)
    bbox = draw.textbbox((0, 0), label, font=font_pill)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        (pill_x + (pill_w - tw) // 2, pill_y + (pill_h - th) // 2 - 2),
        label,
        font=font_pill,
        fill=TEXT,
    )


def main() -> None:
    img = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Subtle dotted grid in the background for texture
    dot_color = (255, 255, 255, 14)
    for gy in range(40, H, 40):
        for gx in range(40, W, 40):
            draw.rectangle([gx, gy, gx + 1, gy + 1], fill=dot_color)

    # Brand mark
    mark_size = 280
    mark_x = 140
    mark_y = (H - mark_size) // 2
    draw_brand_mark(draw, mark_x, mark_y, mark_size)

    # Wordmark
    font_brand = load_font(FONT_BOLD_CANDIDATES, 132)
    text_x = mark_x + mark_size + 80
    draw.text((text_x, 218), "Caliper", font=font_brand, fill=TEXT)

    # Tagline
    font_tag = load_font(FONT_REGULAR_CANDIDATES, 32)
    draw.text(
        (text_x + 4, 372),
        "Inspect any web UI like Figma.",
        font=font_tag,
        fill=MUTED,
    )

    # Sub-tagline
    font_sub = load_font(FONT_REGULAR_CANDIDATES, 24)
    draw.text(
        (text_x + 4, 416),
        "Measure padding, margin, distance, typography.",
        font=font_sub,
        fill=FAINT,
    )

    # Decorative red measurement under the tagline
    draw_red_measure(draw, text_x + 4, 484, 220, "192.5")

    # Repo url at bottom
    font_url = load_font(FONT_MONO_CANDIDATES, 18)
    draw.text(
        (text_x + 4, 526),
        "github.com/josemsalcedoq/caliper",
        font=font_url,
        fill=FAINT,
    )

    out = Path(__file__).parent / "social-preview.png"
    img.save(out, "PNG")
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
