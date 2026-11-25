import sys, re, json, os, subprocess, xml.etree.ElementTree as ET
from PIL import Image
pdf, work, pub = sys.argv[1:4]
_R = {}; _X = {}
def page(p):
    if p not in _X:
        d = f'{work}/mwd{p}'; os.makedirs(d, exist_ok=True)
        if not os.path.exists(f'{d}/p.xml'): subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',pdf,f'{d}/p'],capture_output=True)
        pg = ET.parse(f'{d}/p.xml').getroot().find('page'); bs=[]
        for i in pg.findall('image'):
            t,l,w,h = (int(float(i.get(k))) for k in ('top','left','width','height'))
            if w<0: l+=w; w=-w
            if h<0: t+=h; h=-h
            if (t,l,w,h) not in bs: bs.append((t,l,w,h))
        tx = [(int(t.get('top')),int(t.get('left')),int(t.get('width')),''.join(t.itertext()).strip()) for t in pg.findall('text')]
        _X[p] = (bs, tx)
    return _X[p]
def crop(p, b):
    if p not in _R:
        subprocess.run(['pdftoppm','-r','216','-f',str(p),'-l',str(p),'-png','-singlefile',pdf,f'{work}/mwr{p}'],capture_output=True)
        _R[p] = Image.open(f'{work}/mwr{p}.png').convert('RGB')
    im=_R[p]; t,l,w,h=b
    return im.crop((max(0,l*2), max(0,t*2), min(im.width,(l+w)*2), min(im.height,(t+h)*2)))
def raw(p):
    """largest embedded colour photo on the page (not the full-height side band)"""
    d = f'{work}/mwi{p}'; os.makedirs(d, exist_ok=True)
    if not os.listdir(d): subprocess.run(['pdfimages','-png','-f',str(p),'-l',str(p),pdf,f'{d}/i'],capture_output=True)
    best=None; fs=sorted(os.listdir(d))
    for k, f in enumerate(fs):
        im = Image.open(f'{d}/{f}')
        if im.mode not in ('RGB','CMYK','RGBA') or min(im.size) < 330 or im.height > 1250: continue
        im = im.convert('RGB')
        if k+1 < len(fs):
            m = Image.open(f'{d}/{fs[k+1]}')
            if m.mode in ('L','1') and m.size == im.size:
                bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=m.convert('L')); im = bg
        if not best or im.width*im.height > best.width*best.height: best = im
    return best
def sel(p, wr, hr):
    return sorted([b for b in page(p)[0] if wr[0]<=b[2]<=wr[1] and hr[0]<=b[3]<=hr[1]], key=lambda b:(round(b[0]/60), b[1]))
def below(p, b, pat=None):
    c=[t for t in page(p)[1] if -8 <= t[0]-(b[0]+b[3]) < 70 and abs((t[1]+t[2]/2)-(b[1]+b[2]/2)) < b[2]*.6 and t[3] and (not pat or re.search(pat,t[3]))]
    return min(c, key=lambda t:(t[0], abs((t[1]+t[2]/2)-(b[1]+b[2]/2))))[3] if c else ''
def text(p): return subprocess.run(['pdftotext','-f',str(p),'-l',str(p),'-layout',pdf,'-'],capture_output=True,text=True).stdout
cat = json.load(open(f'{pub}/catalog.json')); by = {c['id']:c for c in cat}
def D(o): d=f"{pub}/eko/{o['id']}"; os.makedirs(d, exist_ok=True); return d
def put(o, im, key, maxw=1800):
    if im.width>maxw: im=im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
    im.save(f'{D(o)}/{key}.jpg', quality=88); o[key]=[im.width, im.height]; o.pop('trimmed', None)
def strip(o, tiles, H, labels=None):
    tiles = [t.resize((max(1,round(t.width*H/t.height)), H), Image.LANCZOS) for t in tiles]
    gap=4; W=sum(t.width for t in tiles)+gap*(len(tiles)-1); st=Image.new('RGB',(W,H),'white'); x=0; pos=[]
    for t in tiles: st.paste(t,(x,0)); pos.append([x,t.width]); x+=t.width+gap
    st.save(f'{D(o)}/strip.jpg', quality=88); o['strip']=dict(w=W,h=H,items=pos)
    if labels and sum(1 for l in labels if l) >= .8*len(labels): o['labels']=[l or f'{k+1}' for k,l in enumerate(labels)]
    else: o.pop('labels', None)
def base(id_, name, c, group, desc, feat):
    o = by.get(id_) or dict(id=id_, brand='Eko-Okna', page=0, tagline='', descPL='', tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}')
    o.update(name=name, cat=c, group=group, descNL=desc, features=feat)
    if id_ not in by: cat.append(o); by[id_]=o
    return o
log=[]
# ── existing wooden systems: catalogue cross-section as cover, lifestyle photo, profile variants
SYS = [('eko-naturo-68',10,11,None),('eko-naturo-68-alu',22,23,27),('eko-naturo-80',28,29,None),('eko-naturo-80-alu',40,41,53),('eko-naturo-92',54,55,None),
       ('eko-esperia-life-74-alu-3d5',68,69,None),('eko-esperia-life-80',78,79,None),('eko-naturo-68-hst',92,None,103),('eko-naturo-80-hst',104,None,None),('eko-naturo-80-hst-alu',114,115,125)]
WOODS = 'houtsoorten: vuren, grenen, eiken, meranti; lariks op bestelling'
for id_, p, pv, ph in SYS:
    o = by.get(id_)
    if not o: log.append(('missing', id_)); continue
    im = raw(p)
    if im: put(o, im, 'hero', 1400)
    if ph: put(o, crop(ph, (0,0,892,1105)), 'scene')
    if pv:
        ts = sel(pv, (170,560), (150,480))
        if ts: strip(o, [crop(pv,b) for b in ts], 420)
    f = [x for x in o.get('features', []) if 'houtsoorten' not in x and 'afwerking:' not in x]
    o['features'] = f + [WOODS, 'afwerking: transparante lazuur, RAL-kleur, blanke lak of onbehandeld']
    log.append((id_, 'hero' in o, 'scene' in o, len(o.get('strip',{}).get('items',[]))))
# ── new and extended items
o = base('eko-houtprofielen','Houten profielen: Hollands, Belgisch en retro','ramen','Ramen · hout','Houten kozijnen zijn leverbaar met verschillende buitenprofielen: het Hollandse profiel met kenmerkende schuine neuslat, het Belgische profiel, naar buiten draaiend en met retro waterhol. Ook met aluminium bekleding aan de buitenzijde.',['Hollands profiel met of zonder onderdorpelneus','Belgisch profiel A en B','naar buiten draaiende uitvoering','profiel met retro druiplijst','aluminium buitenbekleding als optie'])
a, b = crop(8,(0,0,892,1105)), crop(9,(0,0,892,1105)); sp = Image.new('RGB',(a.width+b.width, a.height)); sp.paste(a,(0,0)); sp.paste(b,(a.width,0)); put(o, sp, 'scene', 2000); o['nl']=True
o = base('eko-gueule-de-loup','Gueule de Loup','ramen','Ramen · hout','Houten raamsysteem in klassiek-Franse stijl met de kenmerkende ronde middenstijl en een espagnoletsluiting. Bedoeld voor renovatie van historische en monumentale panden.',['inbouwdiepte 73 mm','Uw 1,5 W/m²K (bij Ug = 1,0)','glaspakket 24 mm','driedelig gelamineerd hout, vier laklagen','espagnolet en scharnieren in wit, zwart of oud goud', WOODS])
put(o, raw(88), 'hero', 1400); strip(o, [crop(89,x) for x in sel(89,(250,280),(250,280))], 480)
o = base('eko-modelramen','Modelramen: bogen, driehoeken en trapeziums','ramen','Ramen · hout','Houten ramen en deuren in afwijkende vormen: boog, driehoek, trapezium en rond. Gemaakt voor panden waar een rechthoekig kozijn niet past.',['boog-, driehoek-, trapezium- en rondramen','vast of draaiend, afhankelijk van vorm en maat','passend bij alle Naturo-systemen'])
put(o, crop(126, sel(126,(300,340),(560,620))[0]), 'scene')
o = by.get('eko-drzwi-drewniane')
if o: put(o, crop(127, sel(127,(700,800),(560,620))[0]), 'scene'); o['name']='Houten deuren'
o = base('eko-gefreesde-panelen','Gefreesde deurpanelen','buiten','Buitendeuren · hout','Houten voordeurpanelen waarvan het patroon in het hout wordt gefreesd. Massief houten kader met een geïsoleerde kern; leverbaar in elke houtsoort en kleur uit het programma.',['patronen A t/m U','massief houten kader, kern van geëxtrudeerd polystyreen','multiplex en fineer aan beide zijden','afwerking in lazuur of RAL', WOODS])
put(o, crop(129, sel(129,(780,830),(900,950))[0]), 'scene'); tl=[]; ll=[]
for p in (130,131,132,133,134):
    for x in sel(p,(380,420),(410,425)): tl.append(crop(p,x)); ll.append(below(p,x,r'^Panel'))
strip(o, tl, 520, ll); log.append(('panelen', len(tl), ll[:5]))
o = by.get('eko-panele-woodline')
if o:
    tl=[]; ll=[]
    for p in (139,140):
        for x in sel(p,(380,450),(440,450)): tl.append(crop(p,x)); ll.append(below(p,x,r'WoodLine'))
    strip(o, tl, 520, ll); put(o, crop(141,(0,0,892,1105)), 'scene'); log.append(('woodline', len(tl), ll[:4]))
o = by.get('eko-decoratief-glas')
if o:
    tl=[]; ll=[]
    for p in (149,150):
        for x in sel(p,(155,162),(155,162)): tl.append(crop(p,x)); ll.append(below(p,x))
    strip(o, tl, 320, ll); put(o, crop(151,(0,0,892,1105)), 'scene'); log.append(('glas', len(tl), ll[:4]))
o = by.get('eko-roedes')
if o: strip(o, [crop(152,x) for x in sel(152,(240,250),(260,268))], 420); put(o, crop(153,(0,0,892,1105)), 'scene')
o = base('eko-sierroosters-hout','Sierroosters voor deuren','buiten','Buitendeuren · hout','Smeedijzeren sierroosters voor klassieke houten voordeuren met glas. Staal, gepoedercoat in RAL-kleur; 17 patronen.',['staal, gegalvaniseerd en gepoedercoat','17 patronen (model 001–017)','maat tot 2000 × 1000 mm','handgemaakt; kleine maatafwijkingen horen erbij'])
put(o, crop(154,(300,80,725,655)), 'hero', 1500); put(o, crop(155,(0,0,892,1105)), 'scene')
o = by.get('eko-houten-buitenluiken')
if o:
    tl=[]; ll=[]
    for x in sel(156,(240,250),(245,255)): tl.append(crop(156,x)); ll.append(below(156,x))
    strip(o, tl, 420, ll); put(o, crop(157,(0,0,892,1105)), 'scene')
o = base('eko-retro-beslag','Retro beslag: raamkrukken en deurkrukken','beslag','Beslag · ramen','Retro-lijn met messing raam- en deurbeslag voor klassieke houten kozijnen: raamkrukken, deurkrukken op langschild, deurknoppen en trekkers.',['raamkrukken o.a. Varsovia, Colmo, Cracovia, Gedania, Wawel, Thorun','deurkrukken o.a. Pomerania, Resovia, Masovia, Gotham','afwerkingen: antiek patina, natuurmessing, gepolijst goud, mat brons, nikkel, zwart','ook espagnoletten en sierscharnieren'])
tl=[]; ll=[]
for p in (162,163,164):
    for x in sel(p,(95,170),(180,245)): tl.append(crop(p,x)); ll.append('')
strip(o, tl, 420); put(o, crop(165,(0,0,892,1105)), 'scene'); log.append(('retro', len(tl)))
o = base('eko-consoles','Consoles en sierlijsten','ramen','Ramen · hout','Gefreesde houten consoles voor onder de middenstijl of de waterslag van klassieke ramen en deuren. Ook naar eigen ontwerp of naar bestaand voorbeeld.',['modellen voor boven (G) en onder (D)','in elke houtsoort en kleur uit het programma','maatwerk naar tekening of bestaand voorbeeld'])
put(o, crop(166,(0,0,892,1105)), 'scene'); tl=[]
for p in (167,168): tl += [crop(p,x) for x in sel(p,(160,320),(160,390))]
strip(o, tl, 420); log.append(('consoles', len(tl)))
o = base('eko-houtkleuren','Houtkleuren: lazuur en dekkend','ramen','Ramen · kleuren en opties','Kleuren voor houten ramen en deuren: transparante lazuren die de nerf laten zien, op vuren, grenen, eiken en meranti, en dekkende RAL-kleuren.',['transparant: o.a. kiefer, teak, walnoot, mahonie, eiken, palissander','dekkend: elke RAL-kleur, standaard o.a. 9016, 9010, 9001, 8017, 7035','binnen en buiten een andere kleur mogelijk','de staaltjes zijn indicatief; hout verschilt per partij'])
strip(o, [crop(170,x) for x in sel(170,(230,238),(95,100))] + [crop(171,x) for x in sel(171,(145,150),(95,100))], 200)
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False)
for l in log: print(l)
print(len(cat))
