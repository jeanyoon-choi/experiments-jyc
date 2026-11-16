import json, sys
d=json.load(open('geo.json')); L=json.load(open('labels.json'))
r1=lambda v: round(float(v),1)
miss=[]
for s in d['stations']:
    v=L[s['id']]; tr=bool(s['discs']); rows=[]
    if v['k']:
        for r in v['k']: rows.append([r['t'],r1(r['x']-s['x']),r1(r['y']-s['y']),r['s'],r['w']])
    else:
        miss.append(('kr',s['name'])); rows.append([s['name'],8,4,14.6 if tr else 12.7,800 if tr else 700])
    if s.get('en') or v['e']:
        if v['e']:
            for r in v['e']: rows.append([r['t'],r1(r['x']-s['x']),r1(r['y']-s['y']),r['s'],r['w']])
        else:
            miss.append(('en',s['name'])); k=rows[-1]; es=10.0 if tr else 6.9; rows.append([s.get('en') or '',k[1],r1(k[2]+es*1.15),es,700])
    for r in v.get('x',[]) or []: rows.append([r['t'],r1(r['x']-s['x']),r1(r['y']-s['y']),r['s'],r['w']])
    s['label']={'rows':rows}; s.pop('branch',None)
    s['x']=r1(s['x']) if False else round(s['x'],2)
g=json.load(open('ground2.json')); d['ground']={'seoul':g['seoul'],'water':g['water']}
pr=json.load(open('printed.json'))
for l in d['lines']: l['colour']='#%02X%02X%02X'%tuple(pr[l['id']])
OV=json.load(open('overrides.json'))
for s in d['stations']:
    if s['name'] in OV and 'name' in OV[s['name']]: s['name']=OV[s['name']]['name']
json.dump(d,open('new.json','w'),ensure_ascii=False,separators=(',',':'))
print('missing',miss)
