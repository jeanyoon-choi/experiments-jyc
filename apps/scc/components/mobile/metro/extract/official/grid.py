import sys
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
step = int(sys.argv[7]) if len(sys.argv) > 7 else 50
scale = float(sys.argv[8]) if len(sys.argv) > 8 else 2
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int((x1 - x0) * scale), int((y1 - y0) * scale)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for x in range((x0 // step + 1) * step, x1, step):
    X = (x - x0) * scale; d.line([(X, 0), (X, im.height)], fill=(255, 0, 255), width=1); d.text((X + 2, 2), str(x), fill=(255, 0, 255))
for y in range((y0 // step + 1) * step, y1, step):
    Y = (y - y0) * scale; d.line([(0, Y), (im.width, Y)], fill=(255, 0, 255), width=1); d.text((2, Y + 2), str(y), fill=(255, 0, 255))
im.save(out)
