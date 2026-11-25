import sys; sys.path.insert(0, sys.argv[4])
from c3lib import *
pdf, work, pub = sys.argv[1:4]
cat = json.load(open(f'{pub}/catalog.json')); by = {c['id']:c for c in cat}
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
names = {norm(c['name']): c for c in cat if c['brand']=='Eko-Okna'}
ALIAS = {'mb86foldlinehd':'mb86foldlinehd','millenniumpivotplus':'millenniumpluspivot','cortizobifoldplus':'cortizobifoldplus','masterline8hiddenvent':'masterline8hiddenvent','ultraglidemaxlightmonorail':'ultraglide','vs600':'vs600'}
KEYS = [('Frame depth','inbouwdiepte kozijn'),('Sash depth','vleugeldiepte'),('Leaf depth','vleugeldiepte'),('Glazing thickness','glasdikte'),('Max. sash weight','max. vleugelgewicht'),('Max. leaf weight','max. vleugelgewicht'),('Max. weight','max. gewicht'),('Fire resistance','brandwerendheid')]
def tech(p):
    out=[]
    for l in text(pdf, p).split('\n'):
        for k, nl in KEYS:
            m = re.match(r'\s*'+re.escape(k)+r'[^\d]*?\s{2,}(.+?)\s*$', l)
            if m and not any(nl in x for x in out):
                v = re.sub(r'\s{2,}.*', '', m.group(1)).strip()
                if re.match(r'^[\d,.\s/–-]+ ?(mm|kg)?$', v) or v.startswith('EI'): out.append(v.replace(' ', '') + ' ' + nl)
    return out
PAGES = list(range(8,24)) + list(range(30,47)) + list(range(52,60)) + list(range(64,73)) + list(range(76,87))
new=0; upd=0
for p in PAGES:
    ls = [l.strip() for l in text(pdf, p).split('\n') if l.strip()]
    name, kind = ls[0], ls[1]
    key = norm(name); o = names.get(ALIAS.get(key, key))
    ims = imgs(pdf, work, 'a', p, wr=(600,1300), hr=(600,1300))
    if not ims: print('noimg', p, name); continue
    if not o:
        k = kind.upper()
        c, g = ('schuif','Schuifsystemen · aluminium') if re.search('SLID|LIFT|FOLD', k) else ('technisch','Technische deuren · brandwerend') if 'FIRE' in k else ('buiten','Buitendeuren · aluminium') if k.startswith('DOOR') else ('ramen','Ramen · aluminium')
        id_ = 'eko-' + re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
        what = {'schuif':'schuifsysteem','technisch':'brandwerend systeem','buiten':'deursysteem','ramen':'raam- en deursysteem'}[c]
        o = dict(id=id_, brand='Eko-Okna', page=0, tagline='', descPL='', tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}',
                 name=name.title().replace('Mb-','MB-').replace(' Ei',' EI').replace(' Oc',' OC').replace(' Xl',' XL').replace(' Hs',' HS'), cat=c, group=g, descNL=f'Aluminium {what} met thermisch onderbroken profielen. Op maat gemaakt in elke RAL-kleur, structuurlak of houtdecor.', features=['thermisch onderbroken aluminium profielen','elke RAL-kleur, binnen en buiten verschillend mogelijk','dubbel of drievoudig glas'])
        cat.append(o); by[id_]=o; new+=1; print('NEW', p, o['name'], c)
    else: upd+=1
    main = max(ims, key=lambda i:i.width*i.height)
    put(pub, o, main, 'hero', 1300)
    if len(ims) > 1: strip(pub, o, ims, 520, q=86)
    t = tech(p)
    if t: o['tech'] = [x for x in o.get('tech', []) if not any(nl in x for _, nl in KEYS)] + t
print('updated', upd, 'new', new)
# Pivot Line
o = by.get('eko-pivot-line-panelen')
if o:
    T=[]; L=[]
    for p in list(range(105,111)) + [112,113]:
        nm = re.findall(r'PIVOT \d+(?: PWZ)?', text(pdf, p)); nm=[n.title().replace('Pwz','PWZ') for n in dict.fromkeys(nm)]
        ims = tiles(pdf, work, 'a', p, (620,670), (620,670))
        for k, im in enumerate(ims): T.append(im); L.append(nm[k] if k < len(nm) else '')
    strip(pub, o, T, 480, L); sc = imgs(pdf, work, 'a', 104, wr=(780,900), hr=(560,650))
    if sc: put(pub, o, sc[0], 'scene')
    o['features'] = [f for f in o.get('features', []) if 'ontwerpen' not in f] + [f'{len(T)} ontwerpen, optioneel met led-verlichting in de greep']
    print('pivot', len(T), L[:4], 'scene' in o)
def base(id_, name, c, group, desc, feat):
    o = by.get(id_) or dict(id=id_, brand='Eko-Okna', page=0, tagline='', descPL='', tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}')
    o.update(name=name, cat=c, group=group, descNL=desc, features=feat)
    if id_ not in by: cat.append(o); by[id_]=o
    return o
o = base('eko-cortizo-tamiz','Cortizo Tamiz buitenluiken','zonwering','Shutters','Aluminium buitenluiken met vaste of verstelbare lamellen. Als draailuik, schuifluik, vouwluik of vast paneel; regelt licht en inkijk en houdt de warmte buiten.',['vaste of verstelbare lamellen','draai-, schuif- of vouwluik','aluminium in RAL-kleur of houtdecor','geschikt voor grote overspanningen'])
im = imgs(pdf, work, 'a', 94, wr=(340,420), hr=(370,440)); 
if im: put(pub, o, im[0], 'hero')
im = imgs(pdf, work, 'a', 95, wr=(1100,1300), hr=(1300,1600))
if im: put(pub, o, im[0], 'scene')
o = base('eko-exclusive-aluline','Exclusive AluLine: ramen, deur en schuifpui in één lijn','ramen','Ramen · aluminium','Productset waarin aluminium ramen, voordeur en schuifpui op elkaar zijn afgestemd: dezelfde smalle aanzichten, dezelfde kleur en bijpassend beslag.',['COR Vision Plus schuifpui met minimale aanzichtbreedte','Decalu 88 Hidden ramen met verdekte vleugel','Despiro voordeur in dezelfde kleur','één ontwerp voor de hele gevel'])
im = imgs(pdf, work, 'a', 91, wr=(900,1100), hr=(600,750))
if im: put(pub, o, im[0], 'scene')
o = by.get('eko-eko-persiane-aluminium-luiken')
if o:
    im = imgs(pdf, work, 'a', 93, wr=(1100,1300), hr=(1300,1600))
    if im: put(pub, o, im[0], 'scene')
o = by.get('eko-kleurenpalet')
if o:
    im = imgs(pdf, work, 'a', 90, wr=(760,860), hr=(430,500))
    if im: put(pub, o, im[0], 'scene')
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False); print(len(cat))
