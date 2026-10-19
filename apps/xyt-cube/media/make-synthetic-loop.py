"""Synthetic calibration clip for spacetime/1.

Static camera, 8 s at 24 fps, 960x540, every motion periodic in 8 s so the
first and last frames meet (loopable, needed by O1). Grid lines show spatial
lensing, the clock and the printed time show local time, and the three balls
and the sweeping bar show slit-scan shear.

Usage: python3 make-synthetic-loop.py <frames-dir>
Then:  ffmpeg -framerate 24 -i <frames-dir>/%04d.png -c:v libx264 -pix_fmt yuv420p synthetic-loop.mp4
"""

import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H, FPS, SECONDS = 960, 540, 24, 8
FRAMES = FPS * SECONDS
PAPER = (233, 230, 223)
INK = (23, 23, 23)
GRID = (205, 201, 192)
GRID_STRONG = (176, 171, 160)
BALLS = [((200, 40, 30), 130, 8.0), ((30, 70, 190), 270, 4.0), (INK, 410, 8.0 / 3.0)]


def font(size):
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def frame(index, label_font):
    t = index / FPS
    phase = t / SECONDS
    image = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(image)

    for x in range(0, W + 1, 40):
        draw.line([(x, 0), (x, H)], fill=GRID_STRONG if x % 160 == 0 else GRID, width=1)
    for y in range(0, H + 1, 40):
        draw.line([(0, y), (W, y)], fill=GRID_STRONG if y % 160 == 0 else GRID, width=1)

    # Sweeping bar: one pass per loop.
    bar_x = int(phase * W)
    draw.rectangle([bar_x - 6, 0, bar_x + 6, H], fill=(23, 23, 23, 255))

    # Clock: one turn per loop, eight ticks.
    cx, cy, r = 250, 280, 150
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(246, 244, 239), outline=INK, width=5)
    for k in range(8):
        a = 2 * math.pi * k / 8
        draw.line(
            [(cx + math.sin(a) * (r - 22), cy - math.cos(a) * (r - 22)),
             (cx + math.sin(a) * (r - 6), cy - math.cos(a) * (r - 6))],
            fill=INK, width=5,
        )
    a = 2 * math.pi * phase
    draw.line([(cx, cy), (cx + math.sin(a) * (r - 30), cy - math.cos(a) * (r - 30))], fill=(200, 40, 30), width=9)
    draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=INK)

    # Balls: ping-pong across the right half at three periods dividing 8 s.
    for colour, y, period in BALLS:
        s = 0.5 - 0.5 * math.cos(2 * math.pi * t / period)
        x = 480 + s * 420
        draw.ellipse([x - 28, y - 28, x + 28, y + 28], fill=colour)

    draw.text((24, 18), f"{t:4.2f} s", font=label_font, fill=INK)
    return image


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    label_font = font(30)
    for index in range(FRAMES):
        frame(index, label_font).save(os.path.join(out, f"{index:04d}.png"))


if __name__ == "__main__":
    main()
