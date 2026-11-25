import sys, re, json, os, subprocess, xml.etree.ElementTree as ET
from PIL import Image, ImageFilter
prod, aio, work, pub = sys.argv[1:5]
def images(pdf, tag, p):
    d = f'{work}/{tag}{p}'; os.makedirs(d, exist_ok=True)
    if not os.path.exists(f'{d}/p.xml'): subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',pdf,f'{d}/p'],capture_output=True)
    pg = ET.parse(f'{d}/p.xml').getroot().find('page')
    ims = [(int(float(i.get('top'))),int(float(i.get('left'))),abs(int(float(i.get('width')))),abs(int(float(i.get('height')))),i.get('src')) for i in pg.findall('image')]
    tx = [(int(t.get('top')),int(t.get('left')),int(t.get('width')),int(t.get('height')),''.join(t.itertext()).strip()) for t in pg.findall('text')]
    return ims, tx, int(pg.get('width'))
_R={}
def crop(pdf, tag, p, i):
    if (tag,p) not in _R:
        subprocess.run(['pdftoppm','-r','216','-f',str(p),'-l',str(p),'-png','-singlefile',pdf,f'{work}/{tag}r{p}'],capture_output=True)
        _R[(tag,p)] = Image.open(f'{work}/{tag}r{p}.png').convert('RGB')
    return _R[(tag,p)].crop((i[1]*2, i[0]*2, (i[1]+i[2])*2, (i[0]+i[3])*2))
def flat(path):
    im = Image.open(path)
    if im.mode in ('RGBA','LA','P'):
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.split()[3]); im = bg
    return im.convert('RGB')
cat = json.load(open(f'{pub}/catalog.json')); by = {c['id']:c for c in cat}
PAN = [(['eko-panele-ekoline','eko-panele-aluline'], range(24,29), 'Model'), (['eko-panele-szklane-ekovitre'], [29], 'EkoVitre'), (['eko-panele-tloczone-classicline'], [30], 'ClassicLine'), (['eko-drzwi-modelowe-pvc'], [31,32], 'Model'), (['eko-panele-aluminiowe-despiro'], [33,34], 'Despiro')]
H = 300
for ids, pages, nm in PAN:
    tiles=[]; labels=[]
    for p in pages:
        ims, tx, pw = images(prod, 'pr', p)
        sel = [i for i in ims if 170 < i[2] < 300 and 170 < i[3] < 300]
        seen=set(); uniq=[]
        for i in sorted(sel, key=lambda i:(i[1] > pw/2, round(i[0]/25), i[1])):
            k=(round(i[0]/8), round(i[1]/8))
            if k in seen: continue
            seen.add(k); uniq.append(i)
        nums = [t for t in tx if re.fullmatch(r'\d{2,3}', t[4])]
        for i in uniq:
            im = crop(prod, 'pr', p, i); pair = len(ids) > 1
            im = im.crop((round(im.width*.10), round(im.height*.12), round(im.width*(.88 if pair else .72)), round(im.height*.96)))
            if im.getextrema() == ((255,255),)*3: continue
            im = im.resize((round(im.width*H/im.height), H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2,60,2))
            c2 = [t for t in nums if abs(t[0]-i[0]) < 60 and -80 < t[1]-i[1] < 80]
            lab = min(c2, key=lambda t: abs(t[0]-i[0])+abs(t[1]-i[1]))[4] if c2 else ''
            tiles.append(im); labels.append(lab)
    T, L = tiles, labels
    for n_, id_ in enumerate(ids):
        tiles = T[0::len(ids)]; labels = L[0::len(ids)]
        gap=4; W=sum(t.width for t in tiles)+gap*(len(tiles)-1); st=Image.new('RGB',(W,H),'white'); x=0; pos=[]
        for t in tiles: st.paste(t,(x,0)); pos.append([x,t.width]); x+=t.width+gap
        ok = sum(1 for l in labels if l) >= 0.8*len(labels) and len(set(labels)) >= 0.8*len(labels)
        it = by[id_]; d=f"{pub}/eko/{id_}"; os.makedirs(d, exist_ok=True); st.save(f'{d}/strip.jpg', quality=86)
        it['strip']=dict(w=W,h=H,items=pos); it['labels']=[f'{nm} {l}' if (ok and l) else f'{nm} {k+1}' for k,l in enumerate(labels)]
        it['features'] = [f for f in it.get('features',[]) if 'modellen' not in f] + [f'{len(tiles)} modellen in deze collectie']
        print(id_, len(tiles), ok, labels[:6], W)
NAMES = ['Verona','Modena','Foggia','Livorno','Torino','Firenze','Messina','Trieste']
TAG = ['Tijdloos ontwerp','Schoonheid in eenvoud','In harmonie met de natuur','Eenvoudige vorm en elegantie','Contrasten voor durvers','Stijl in de details','Klassiek met een moderne touch','Kleur speelt de hoofdrol']
cat = [c for c in cat if not c['id'].startswith('eko-aio-')]
for k, n in enumerate(NAMES):
    id_ = f'eko-aio-{n.lower()}'; d=f'{pub}/eko/{id_}'; os.makedirs(d, exist_ok=True)
    o = dict(id=id_, brand='Eko-Okna', cat='buiten', group='All In One · designlijnen', name=f'All In One {n}', page=0, tagline=TAG[k], descPL='',
             descNL=f'{TAG[k]}. All In One is een designlijn waarin voordeur, ramen, garagedeur, rolluiken en hekwerk op elkaar zijn afgestemd: dezelfde kleur, dezelfde belijning en bijpassend beslag, in één keer besteld.',
             features=['voordeur, ramen en garagedeur in één ontwerp','bijpassende rolluiken, greep en beslag','kleuren en structuren op elkaar afgestemd','optioneel All In One Control: bediening via smart home'], tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}')
    for key, p, maxw in (('hero', 5+2*k, 1500), ('scene', 6+2*k, 1800)):
        ims, _, _ = images(aio, 'ai', p); big = max(ims, key=lambda i:i[2]*i[3]); im = crop(aio, 'ai', p, big) if key=='hero' else flat(big[4])
        if key=='hero': im = im.crop((0, 0, im.width, round(im.height*.9)))
        if im.width > maxw: im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
        im.save(f'{d}/{key}.jpg', quality=88); o[key]=[im.width, im.height]
    cat.append(o); print(id_, o['hero'], o['scene'])
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False); print(len(cat))
