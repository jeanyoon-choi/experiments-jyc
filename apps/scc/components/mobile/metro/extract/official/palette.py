import re, pymupdf, json
d = pymupdf.open('ref/colors.pdf')
rgb = []
for p in d:
    t = p.get_text()
    rgb += [tuple(int(v) for v in m) for m in re.findall(r'(?<!Adobe )RGB\n|R (\d+) / G (\d+) / B ?(\d+)\nR', t) if m and m[0]]
ids = ['1','2','3','4','5','6','7','8','9','gyeongui-jungang','suin-bundang','shinbundang','incheon-1','airport',
       'ui-sinseol','sillim','uijeongbu','everline','incheon-2','gimpo-gold','gyeongchun','gyeonggang','seohae']
print(len(rgb))
pal = {i: '#%02X%02X%02X' % c for i, c in zip(ids, rgb)}
print(json.dumps(pal, indent=1))
json.dump(pal, open('ex/palette.json', 'w'), indent=1)
