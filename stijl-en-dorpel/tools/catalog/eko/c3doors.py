import sys; sys.path.insert(0, sys.argv[5])
from c3lib import *
despiro, entrance, work, pub = sys.argv[1:5]
cat = json.load(open(f'{pub}/catalog.json')); by = {c['id']:c for c in cat}
def base(id_, name, c, group, desc, feat):
    o = by.get(id_) or dict(id=id_, brand='Eko-Okna', page=0, tagline='', descPL='', tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}')
    o.update(name=name, cat=c, group=group, descNL=desc, features=feat)
    if id_ not in by: cat.append(o); by[id_]=o
    return o
def addfeat(o, n): o['features'] = [f for f in o.get('features', []) if 'modellen' not in f and 'ontwerpen' not in f] + [f'{n} ontwerpen in deze collectie']
H=440
JOBS = [
 ('eko-panele-aluminiowe-despiro', despiro, 'd', range(6,26), r'Panel (DP\d+)', lambda m: m.group(1), 5),
 ('eko-despiro-retro-line-aluminium-panelen', despiro, 'd', range(28,33), r'Panel (RL\d+)', lambda m: m.group(1), 27),
 ('eko-panele-ekoline', entrance, 'e', range(14,86), r'Panel (\d+)', lambda m: 'EkoLine '+m.group(1), 9),
 ('eko-panele-aluline', entrance, 'e', range(14,86), r'Panel (\d+)', lambda m: 'AluLine '+m.group(1), 9),
 ('eko-panele-szklane-ekovitre', entrance, 'e', range(88,96), r'Panel (\d+)', lambda m: 'EkoVitre '+m.group(1), 87),
 ('eko-panele-tloczone-classicline', entrance, 'e', range(98,109), r'Panel (\d+)', lambda m: 'ClassicLine '+m.group(1), 97),
 ('eko-drzwi-modelowe-pvc', entrance, 'e', range(136,156), r'Model (\d+)', lambda m: 'Model '+m.group(1), 135),
 ('eko-overzetpanelen', entrance, 'e', range(158,195), r'([A-Z]{3,}) ET', lambda m: m.group(1).title(), 157),
]
for id_, pdf, tag, pages, rx, fmt, scene in JOBS:
    o = by.get(id_)
    if not o: print('MISSING', id_); continue
    T, L, bad = series(pdf, work, tag, pages, rx, fmt)
    strip(pub, o, T, H, L); addfeat(o, len(T))
    big = imgs(pdf, work, tag, scene, wr=(800,1000), hr=(600,800))
    if big: put(pub, o, big[0], 'scene')
    print(id_, len(T), 'labels' in o, 'scene' in o, bad[:3])
# MasterLine 8 Despiro / Pivot: catalogue photos
for id_, p in (('eko-masterline-8-despiro', 35), ('eko-masterline-8-pivot', 37), ('eko-presto-stalen-draaideuren', None)):
    o = by.get(id_)
    if o and p:
        big = imgs(despiro, work, 'd', p, wr=(800,1000), hr=(600,800))
        if big: put(pub, o, big[0], 'scene'); print(id_, 'scene')
o = by.get('eko-unico-stalen-draaideuren') or by.get('eko-presto-stalen-draaideuren')
if o:
    big = imgs(entrance, work, 'e', 197, wr=(800,1000), hr=(600,800))
    if big: put(pub, o, big[0], 'scene')
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False); print(len(cat))
