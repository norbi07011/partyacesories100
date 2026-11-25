import sys; sys.path.insert(0, sys.argv[4])
from c3lib import *
pdf, work, pub = sys.argv[1:4]
cat = json.load(open(f'{pub}/catalog.json')); by = {c['id']:c for c in cat}
def base(id_, name, c, group, desc, feat):
    o = by.get(id_) or dict(id=id_, brand='Eko-Okna', page=0, tagline='', descPL='', tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}')
    o.update(name=name, cat=c, group=group, descNL=desc, features=feat)
    if id_ not in by: cat.append(o); by[id_]=o
    return o
K = 4
def grid(p, cw, ch, dy):
    d=f'{work}/gx{p}'; os.makedirs(d, exist_ok=True)
    if not os.path.exists(f'{d}/p.xml'): subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',pdf,f'{d}/p'],capture_output=True)
    xml=open(f'{d}/p.xml').read(); pw=int(re.search(r'<page[^>]*width="(\d+)"',xml).group(1))
    if not os.path.exists(f'{d}/r.png'): subprocess.run(['pdftoppm','-scale-to-x',str(pw*K),'-scale-to-y','-1','-f',str(p),'-l',str(p),'-png','-singlefile',pdf,f'{d}/r'],capture_output=True)
    im=Image.open(f'{d}/r.png').convert('RGB'); out=[]
    labs=[(int(m.group(1)),int(m.group(2)),m.group(3).strip()) for m in re.finditer(r'<text top="(\d+)" left="(\d+)"[^>]*>(?:<[^>]+>)*\s*(\d{3}[A-Za-z0-9]*)\s*<', xml)]
    labs=[l for l in labs if l[0] < 1000]
    for t,l,name in sorted(labs, key=lambda x:(round(x[0]/20), x[1])):
        c = im.crop(((l-5)*K, (t+dy)*K, (l-5+cw)*K, (t+dy+ch)*K))
        if c.getextrema() == ((255,255),)*3: continue
        out.append((name, c))
    return out
allp=[]
for p in range(114,127): g=grid(p, 62, 124, 17); allp += g; print(p, len(g), [n for n,_ in g[:3]])
DESC='EkoGreen-reliëfpanelen voor kunststof voordeuren: klassieke Italiaanse ontwerpen met diep reliëf, een kern van XPS-isolatie en een Hydro Exterior HDF-plaat. Leverbaar met glas, als dicht paneel of met sierlijsten.'
FEAT=['paneeldikte 24–48 mm, kern van XPS','reliëf aan één of twee zijden','varianten met glas (V-nummers) en links/rechts (Sx/Dx)','afwerking: folie in houtdecor of effen kleur','bijpassende zijpanelen en bovenlichten']
n=110; chunks=[allp[i:i+n] for i in range(0,len(allp),n)]
for k, ch in enumerate(chunks):
    id_ = 'eko-ekogreen-reliefpanelen' if k==0 else f'eko-ekogreen-reliefpanelen-{k+1}'
    o = base(id_, f'EkoGreen reliëfpanelen {ch[0][0]}–{ch[-1][0]}', 'buiten', 'Buitendeuren · EkoGreen', DESC, FEAT + [f'{len(ch)} ontwerpen in dit deel, {len(allp)} in totaal'])
    strip(pub, o, [c for _,c in ch], 420, [f'EkoGreen {nm}' for nm,_ in ch], q=80); print(id_, len(ch), o['strip']['w'])
ext = grid(129, 36, 110, 15)
if ext:
    o = base('eko-ekogreen-zijpanelen','EkoGreen zijpanelen en bovenlichten','buiten','Buitendeuren · EkoGreen','Bijpassende reliëfpanelen voor zijlichten en bovenlichten naast de EkoGreen-voordeur, in dezelfde belijning en afwerking.',['aan één of twee zijden van de deur','met glas of dicht','zelfde decors als de deurpanelen', f'{len(ext)} ontwerpen'])
    strip(pub, o, [c for _,c in ext], 420, [f'EkoGreen {nm}' for nm,_ in ext], q=80); print('zij', len(ext))
sh = imgs(pdf, work, 'h', 131, wr=(190,330), hr=(395,420))
o = base('eko-ekogreen-scuretti','EkoGreen binnenluiken Scuretti','zonwering','Shutters','Scuretti: binnenluiken in Italiaanse stijl die tegen het raam scharnieren. Ze regelen licht en inkijk en geven een klassiek kozijn zijn karakter. Bijpassende onderpanelen (sottotraversi) voor deuren.',['paneeldikte 18 mm, Hydro Exterior HDF','reliëf of frezing aan beide zijden','modellen Stella, Milano, Roma, Luna, Clara, Acquamarina, Violet','vormen: recht, boog, trapezium, harmonica','beslag in oud goud, glanzend goud of zilver'])
names=['Stella','Milano','Roma','Luna','Clara','Acquamarina','Violet']
strip(pub, o, sh, 440, names if len(sh)==7 else None)
big = imgs(pdf, work, 'h', 129, wr=(900,1100), hr=(380,450))
if big: put(pub, o, big[0], 'scene')
print('scuretti', len(sh), 'scene' in o)
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False); print(len(cat))
