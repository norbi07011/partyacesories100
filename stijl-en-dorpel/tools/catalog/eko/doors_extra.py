import sys, re, json, os, subprocess, xml.etree.ElementTree as ET
from PIL import Image, ImageFilter
pdf, work, pub = sys.argv[1], sys.argv[2], sys.argv[3]
def images(p):
    d = f'{work}/x{p}'; os.makedirs(d, exist_ok=True)
    if not os.path.exists(f'{d}/p.xml'): subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',pdf,f'{d}/p'],capture_output=True)
    pg = ET.parse(f'{d}/p.xml').getroot().find('page')
    ims = [(int(float(i.get('top'))),int(float(i.get('left'))),abs(int(float(i.get('width')))),abs(int(float(i.get('height')))),i.get('src')) for i in pg.findall('image')]
    tx = [(int(t.get('top')),int(t.get('left')),int(t.get('width')),int(t.get('height')),''.join(t.itertext()).strip()) for t in pg.findall('text')]
    return ims, tx
F = dict(flush=False)
SPEC = [
 dict(id='eko-deur-inlays', name='Inlays', cat='binnen', group='Binnendeuren · vlakke deuren', scene=None, pages=range(58,64), size=(60,140,150,260), lab=r'^[A-Z][A-Z ]+ ?\d+', H=540,
      desc='Vlakke deuren met decoratieve inlays: smalle sierstrips die vlak in het deuroppervlak zijn ingelegd. Leverbaar in tientallen patronen op de vlakke deurmodellen uit het programma.',
      feat=['inlay ligt vlak in het fineer- of CPL-oppervlak','keuze uit vele lijnpatronen','te combineren met opdek-, stompe en omkeerbare deuren']),
 dict(id='eko-deur-graf', name='Glazen deur Graf', cat='binnen', group='Binnendeuren · glas', scene=77, pages=[78,79], size=(40,110,90,240), lab=r'^GRAF', H=540,
      desc='Volglazen binnendeur van 8 mm gehard glas, met of zonder decor. Past in een vast of verstelbaar kozijn en is ook als schuifdeur leverbaar.',
      feat=['8 mm gehard veiligheidsglas (ESG), optioneel gelaagd VSG','helder, mat, grafiet of met print/zandstraaldecor','aluminium of zwart beslag','ook als wandschuifdeur leverbaar']),
 dict(id='eko-deur-herse-set', name='Herse Set 30/32 dB · Akustic 39 dB', cat='technisch', group='Technische deuren · akoestisch', scene=82, pages=[], size=None, lab=None, H=540,
      desc='Technische toegangsdeur voor appartementen en utiliteitsbouw, geleverd als set met kozijn en dorpel. Geluidwerend in 30, 32 of 39 dB.',
      feat=['geluidsisolatie Rw 30 / 32 dB, Akustic-uitvoering 39 dB','versterkt deurblad met volle vulling','3 scharnieren, meerpuntssluiting als optie','vast of verstelbaar opdekkozijn, valdorpel']),
 dict(id='eko-schuif-wand', name='Wandschuifsysteem', cat='schuif', group='Schuifsystemen · binnendeuren', scene=103, pages=[100,101,102], size=(300,450,180,260), lab=None, H=360,
      desc='Schuifsysteem vóór de wand voor binnendeuren: met kozijnafwerking, zonder afwerking, in loft-uitvoering met zichtbare rail of als Magic-systeem met onzichtbare geleiding.',
      feat=['uitvoeringen: Standard, Loft, Magic en voor glazen deuren','enkele of dubbele schuifdeur','soft-close als optie','ronde, ovale of rechthoekige komgrepen; haakslot met sleutel als optie']),
 dict(id='eko-schuif-in-de-wand', name='Schuifsysteem in de wand', cat='schuif', group='Schuifsystemen · binnendeuren', scene=104, pages=[], size=None, lab=None, H=540,
      desc='Schuifdeursysteem dat volledig in de wand verdwijnt. Aluminium cassette voor gipsplaat- of gemetselde wanden, voor enkele en dubbele deuren.',
      feat=['cassette voor wanddikte 100 of 125 mm','enkele of dubbele deur','soft-close en synchroonloop als optie','afwerking met kozijnlijsten of strak ingestuct']),
 dict(id='eko-deur-dubbel', name='Dubbele deuren', cat='binnen', group='Binnendeuren · dubbele deuren', scene=None, pages=[110], size=(110,180,170,210), lab=None, H=540,
      desc='Alle deurmodellen uit het programma zijn als dubbele deur leverbaar: symmetrisch, asymmetrisch of met een volledig vlakke aanslaglat.',
      feat=['opdek of stomp','symmetrische of asymmetrische vleugelverdeling','vast of verstelbaar kozijn voor dubbele deuren','totale breedte 120–200 cm']),
 dict(id='eko-deur-covert', name='Covert · verborgen deur', cat='binnen', group='Binnendeuren · verborgen deuren', scene=113, pages=[], size=None, lab=None, H=540,
      desc='Deur die vlak in de wand opgaat, zonder zichtbaar kozijn. Het aluminium kozijn wordt ingestuct; het deurblad kan worden meegeschilderd of behangen.',
      feat=['verdekt aluminium kozijn','naar binnen of naar buiten draaiend','deurblad in grondlaag (zelf afwerken), CPL of gelakt','verdekte scharnieren en magneetslot']),
 dict(id='eko-deurkozijnen', name='Deurkozijnen vast en verstelbaar', cat='kozijn', group='Kozijnen · binnendeuren', scene=None, pages=[116,125,126], size=(130,180,110,215), lab=None, H=360,
      desc='Vaste en verstelbare kozijnen voor alle binnendeuren uit het programma: opdek, stomp, omkeerbaar, voor dubbele deuren, glazen deuren en als tunnelkozijn.',
      feat=['vast kozijn of verstelbaar kozijn (instelbaar op wanddikte)','voor opdek-, stompe en omkeerbare deuren','hoekverbinding 45° of 90°','tunnelkozijn en kozijn voor glazen deuren leverbaar','in alle deurdecors en gelakt']),
 dict(id='eko-deurbeslag-infinity', name='Deurkrukken Infinity Line', cat='beslag', group='Beslag · deurkrukken', scene=112, pages=range(128,134), size=(120,260,60,130), lab='above', H=300,
      desc='Deurkrukken uit de Infinity Line voor vlakke deuren en stijldeuren. Leverbaar met rozetten voor sleutel, cilinder of wc-sluiting.',
      feat=['afwerkingen: zwart, chroom, mat chroom, goud, koper, titanium, patina','rozet rond of vierkant','uitvoering BB (sleutel), PZ (cilinder) of WC']),
 dict(id='eko-deurbeslag-metal-bud', name='Deurkrukken Metal-Bud', cat='beslag', group='Beslag · deurkrukken', scene=134, pages=range(135,138), size=(120,260,60,130), lab='above', H=300,
      desc='Deurkrukken van Metal-Bud voor vlakke deuren en stijldeuren, op rozet of op langschild.',
      feat=['afwerkingen: rvs, zwart, nikkel, chroom, patina, mat goud en houtdecor','op rozet of langschild','uitvoering BB (sleutel), PZ (cilinder) of WC']),
]
cat = json.load(open(f'{pub}/catalog.json')); ids = {s['id'] for s in SPEC}; cat = [c for c in cat if c['id'] not in ids]
for s in SPEC:
    d = f"{pub}/eko/{s['id']}"; os.makedirs(d, exist_ok=True)
    o = dict(id=s['id'], brand='Eko-Okna', cat=s['cat'], group=s['group'], name=s['name'], page=0, tagline='', descPL='', descNL=s['desc'], features=s['feat'], tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f"fabriek/eko/{s['id']}")
    if s['scene']:
        ims,_ = images(s['scene']); big = max(ims, key=lambda i:i[2]*i[3])
        im = Image.open(big[4]).convert('RGB')
        if im.width < 1400: im = im.resize((im.width*2, im.height*2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2,60,2))
        im.save(f'{d}/scene.jpg', quality=88); o['scene']=[im.width, im.height]
    tiles=[]; labels=[]
    for p in s['pages']:
        ims, tx = images(p); a,b,c,e = s['size']
        sel = sorted([i for i in ims if a<=i[2]<=b and c<=i[3]<=e], key=lambda i:(round(i[0]/30), i[1]))
        for i in sel:
            try: im = Image.open(i[4])
            except Exception: continue
            if im.mode in ('RGBA','LA','P'):
                im = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.split()[3]); im = bg
            im = im.convert('RGB'); H=s['H']
            im = im.resize((round(im.width*H/im.height), H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.5,80,2))
            lab=''
            if s['lab']=='above':
                c2 = [t for t in tx if -22 <= i[0]-t[0] <= 22 and abs(t[1]-i[1]) < 60 and re.search('[a-z]', t[4]) and len(t[4])<40]
                if c2: lab = min(c2, key=lambda t: abs(t[1]-i[1])+abs(t[0]-i[0]))[4]
            elif s['lab']:
                c2 = [t for t in tx if re.match(s['lab'], t[4]) and 0 <= t[0]-(i[0]+i[3]) < 30 and abs((t[1]+t[2]/2)-(i[1]+i[2]/2)) < 60]
                if c2: lab = min(c2, key=lambda t: abs((t[1]+t[2]/2)-(i[1]+i[2]/2)))[4].title()
            tiles.append(im); labels.append(lab)
    tiles, labels = tiles[:40], labels[:40]
    if tiles:
        gap=4; W=sum(t.width for t in tiles)+gap*(len(tiles)-1); st=Image.new('RGB',(W,s['H']),'white'); x=0; pos=[]
        for t in tiles: st.paste(t,(x,0)); pos.append([x,t.width]); x+=t.width+gap
        st.save(f'{d}/strip.jpg', quality=88); o['strip']=dict(w=W,h=s['H'],items=pos)
        if sum(1 for l in labels if l) >= len(labels)*0.8: o['labels']=[l or f'Model {k+1}' for k,l in enumerate(labels)]
    cat.append(o); print(s['id'], 'scene' in o, len(tiles), (o.get('labels') or [])[:6])
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False); print(len(cat))
