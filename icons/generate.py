"""Generate UX Align PNG icons from scratch (stdlib only).

Design: a Figma-blue selection frame with four small filled corner handles,
on a transparent background. Run:

    python3 icons/generate.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ACCENT = (13, 153, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def make_png(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> bytes:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixels[y * width + x])

    def chunk(typ: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def render(size: int) -> list[tuple[int, int, int, int]]:
    pad = max(2, size // 5)
    line = max(1, size // 16)
    handle = max(2, size // 5)
    handle_half = handle // 2

    inner_left = pad
    inner_right = size - pad - 1
    inner_top = pad
    inner_bottom = size - pad - 1

    corners = [
        (inner_left, inner_top),
        (inner_right, inner_top),
        (inner_left, inner_bottom),
        (inner_right, inner_bottom),
    ]

    pixels: list[tuple[int, int, int, int]] = []
    for y in range(size):
        for x in range(size):
            color = TRANSPARENT
            on_top = inner_left <= x <= inner_right and inner_top <= y < inner_top + line
            on_bottom = (
                inner_left <= x <= inner_right and inner_bottom - line < y <= inner_bottom
            )
            on_left = inner_top <= y <= inner_bottom and inner_left <= x < inner_left + line
            on_right = (
                inner_top <= y <= inner_bottom and inner_right - line < x <= inner_right
            )
            if on_top or on_bottom or on_left or on_right:
                color = ACCENT

            for cx, cy in corners:
                if (
                    cx - handle_half <= x <= cx + handle_half
                    and cy - handle_half <= y <= cy + handle_half
                ):
                    color = ACCENT
                    break
            pixels.append(color)
    return pixels


def main() -> None:
    out_dir = Path(__file__).parent
    for size in (16, 32, 48, 128):
        png = make_png(size, size, render(size))
        path = out_dir / f"icon-{size}.png"
        path.write_bytes(png)
        print(f"wrote {path.name} ({len(png)} bytes)")


if __name__ == "__main__":
    main()
