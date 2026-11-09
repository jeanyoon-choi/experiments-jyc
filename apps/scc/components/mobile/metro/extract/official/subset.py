import json, sys, os
from fontTools import subset
names = json.load(open(sys.argv[1]))  # list of strings
out = sys.argv[2]
chars = set(''.join(names)) | set(chr(c) for c in range(0x20, 0x7f)) | set('·‧–—()')
text = ''.join(sorted(chars))
for w, f in (('500', 'Medium'), ('700', 'Bold'), ('800', 'ExtraBold')):
    o = subset.Options(); o.flavor = 'woff2'; o.layout_features = ['kern', 'liga', 'ccmp', 'locl']; o.name_IDs = ['*']; o.notdef_outline = True
    font = subset.load_font(f'font/alrim/SeoulAlrim-{f}.otf', o)
    s = subset.Subsetter(o); s.populate(text=text); s.subset(font)
    p = os.path.join(out, f'alrim-{w}.woff2'); subset.save_font(font, p, o)
    print(p, os.path.getsize(p), len(chars))
