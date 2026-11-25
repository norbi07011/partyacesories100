import sys, re, json, os, subprocess, glob, xml.etree.ElementTree as ET
from PIL import Image, ImageFilter
pdf, work, out = sys.argv[1], sys.argv[2], sys.argv[3]
def txt(p):
    return subprocess.run(['pdftotext','-f',str(p),'-l',str(p),'-layout',pdf,'-'],capture_output=True,text=True).stdout.split('\n')
SPREADS = [(p,'Binnendeuren · stijldeuren') for p in range(8,41,2)] + [(p,'Binnendeuren · gelakt') for p in range(44,57,2)] + [(p,'Binnendeuren · vlakke deuren') for p in range(64,75,2)]
HEAD = {'CONSTRUCTION':'constr','FINISH':'finish','HARDWARE':'hard','GLAZING':'glaz'}
def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
def sections(lines):
    bcol = None
    for l in lines:
        m = re.search(r'•', l)
        if m: bcol = m.start(); break
    res = {v:[] for v in HEAD.values()}; cur=None
    if bcol is None: return res
    for l in lines:
        s = l.strip()
        if re.match(r'^(GREKO|PREMIUM|CPL|PAINTED|EXTRA CHARGE|LACQUERED\s*$|UV )', s) and l[:bcol-4].strip()==s.split('   ')[0]:
            if s.startswith(('EXTRA','GREKO','PREMIUM','CPL','PAINTED')): break
        seg = l[max(0,bcol-3):]
        first = re.split(r'\s{6,}', seg.strip())[0] if seg.strip() else ''
        if first in HEAD: cur = HEAD[first]; continue
        if cur is None or not first: continue
        if first.startswith('•'): res[cur].append(first[1:].strip())
        elif res[cur] and len(seg)-len(seg.lstrip()) < 16 and not re.fullmatch(r'\d+|STILE|LACQUERED|MODULAR|PLATE', first):
            res[cur][-1] += ' ' + first
    for k in res: res[k] = [re.sub(r'-\s+(?=[a-z])','',re.sub(r'\s+',' ',b)) for b in res[k]]
    return res
def images(p):
    d = f'{work}/x{p}'; os.makedirs(d, exist_ok=True)
    subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',pdf,f'{d}/p'],capture_output=True)
    root = ET.parse(f'{d}/p.xml').getroot(); pg = root.find('page')
    ims = [(int(float(i.get('top'))),int(float(i.get('left'))),int(float(i.get('width'))),int(float(i.get('height'))),i.get('src')) for i in pg.findall('image')]
    tx = [(int(t.get('top')),int(t.get('left')),int(t.get('width')),int(t.get('height')),''.join(t.itertext()).strip()) for t in pg.findall('text')]
    return ims, tx
items=[]
for p, group in SPREADS:
    a, b = txt(p), txt(p+1)
    head = [l.strip() for l in a if l.strip()]
    title, sub = head[0], head[1]
    names = [n.strip() for n in title.split('/')]
    id_ = 'eko-deur-' + slug(title) + ('-vlak' if group.endswith('vlakke deuren') else '')
    sec = sections(b)
    widths = [int(x) for x in re.findall(r'\b(60|70|80|90|100)\b', ' '.join(l for l in a if re.fullmatch(r'[\s\d\*]+', l) and l.strip()))]
    allb = ' '.join(b)
    fin = [g for g in ('GREKO','PREMIUM','CPL') if re.search(r'^\s*'+g+r'\s*$', '\n'.join(b), re.M)]
    if 'White titanium UV' in allb or 'PAINTED' in allb: fin.append('UV-lak')
    coats = []
    for l in b:
        for m in re.findall(r'([a-z][a-z\- ]*?(?:greko|premium|ST CPL))', l):
            m = m.strip()
            if 2 < len(m) < 30 and m not in coats and not m.startswith(('covered','veneer','with','or ','and ')): coats.append(m)
    d = f'{out}/{id_}'; os.makedirs(d, exist_ok=True)
    it = dict(id=id_, brand='Eko-Okna', cat='binnen', group=group, name=' / '.join(n.title() for n in names), page=p, sub=sub, sec=sec, fin=fin, coats=coats, widths=[min(widths),max(widths)] if widths else None, dir=f'fabriek/eko/{id_}')
    # scene
    ims, _ = images(p)
    big = max(ims, key=lambda i: i[2]*i[3]) if ims else None
    if big and big[2]*big[3] > 100000:
        im = Image.open(big[4]).convert('RGB')
        if im.width < 1400:
            im = im.resize((im.width*2, im.height*2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))
        im.save(f'{d}/scene.jpg', quality=88); it['scene']=[im.width, im.height]
    # models
    ims, tx = images(p+1)
    doors = [i for i in ims if 150 < i[3] < 320 and 0.36 < i[2]/i[3] < 0.62]
    doors.sort(key=lambda i:(round(i[0]/40), i[1]))
    pat = re.compile(r'^(' + '|'.join(re.escape(n) for n in names) + r'|[A-Z][A-Z ]{2,})\s?\d+\s*$')
    labs = [t for t in tx if pat.match(t[4])]
    tiles=[]; labels=[]
    for dr in doors:
        try: im = Image.open(dr[4]).convert('RGB')
        except Exception: continue
        cx, cy = dr[1]+dr[2]/2, dr[0]+dr[3]/2
        near = min(labs, key=lambda t: abs(t[1]+t[2]/2-cx)+abs(t[0]+t[3]/2-cy), default=None)
        lab = near[4].strip().title() if near and abs(near[1]+near[2]/2-cx)+abs(near[0]+near[3]/2-cy) < 260 else ''
        if near: labs = [t for t in labs if t is not near] if lab else labs
        H = 540; im = im.resize((round(im.width*H/im.height), H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.5, 80, 2))
        tiles.append(im); labels.append(lab)
    if tiles:
        gap=4; W = sum(t.width for t in tiles)+gap*(len(tiles)-1)
        st = Image.new('RGB',(W,540),'white'); x=0; pos=[]
        for t in tiles: st.paste(t,(x,0)); pos.append([x,t.width]); x+=t.width+gap
        st.save(f'{d}/strip.jpg', quality=90)
        it['strip']=dict(w=W,h=540,items=pos); it['labels']=[l or f'Model {i+1}' for i,l in enumerate(labels)]
    items.append(it)
    print(p, id_, it['name'], 'scene' in it, len(tiles), it.get('labels'), fin, len(coats), it['widths'], {k:len(v) for k,v in sec.items()})
json.dump(items, open(f'{work}/doors.json','w'), ensure_ascii=False, indent=1)
u={}
for it in items:
    for k,v in it['sec'].items():
        for x in v: u[x]=u.get(x,0)+1
print(len(u)); 
for k,v in sorted(u.items(), key=lambda kv:-kv[1]): print(v, k)
