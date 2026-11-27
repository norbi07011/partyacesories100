import os, re, json, subprocess
from PIL import Image
def imgs(pdf, work, tag, p, wr=(360,660), hr=(540,660)):
    """embedded colour photos of a page in content order, with their soft masks applied"""
    d = f'{work}/{tag}i{p}'; os.makedirs(d, exist_ok=True)
    if not os.listdir(d): subprocess.run(['pdfimages','-png','-f',str(p),'-l',str(p),pdf,f'{d}/i'],capture_output=True)
    fs = sorted(os.listdir(d)); out=[]
    for k, f in enumerate(fs):
        im = Image.open(f'{d}/{f}')
        if im.mode in ('L','1','P') and im.mode != 'P': continue
        if not (wr[0] <= im.width <= wr[1] and hr[0] <= im.height <= hr[1]): continue
        im = im.convert('RGB')
        if k+1 < len(fs):
            m = Image.open(f'{d}/{fs[k+1]}')
            if m.mode in ('L','1') and m.size == im.size:
                bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=m.convert('L')); im = bg
        out.append(im)
    return out
def text(pdf, p): return subprocess.run(['pdftotext','-f',str(p),'-l',str(p),'-layout',pdf,'-'],capture_output=True,text=True).stdout
def strip(pub, o, tiles, H, labels=None, q=84):
    tiles = [t.resize((max(1,round(t.width*H/t.height)), H), Image.LANCZOS) for t in tiles]
    gap=4; W=sum(t.width for t in tiles)+gap*(len(tiles)-1); st=Image.new('RGB',(W,H),'white'); x=0; pos=[]
    for t in tiles: st.paste(t,(x,0)); pos.append([x,t.width]); x+=t.width+gap
    d=f"{pub}/eko/{o['id']}"; os.makedirs(d, exist_ok=True); st.save(f'{d}/strip.jpg', quality=q); o['strip']=dict(w=W,h=H,items=pos)
    if labels and len(labels)==len(tiles) and all(labels): o['labels']=labels
    else: o.pop('labels', None)
def put(pub, o, im, key, maxw=1800):
    if im.width>maxw: im=im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
    d=f"{pub}/eko/{o['id']}"; os.makedirs(d, exist_ok=True); im.save(f'{d}/{key}.jpg', quality=86); o[key]=[im.width, im.height]; o.pop('trimmed', None)
def series(pdf, work, tag, pages, title_re, fmt, **kw):
    """pages that show one or two named designs each -> (tiles, labels)"""
    T=[]; L=[]; bad=[]
    for p in pages:
        head = ' '.join(text(pdf, p).split('\n')[:4])
        names = [fmt(m) for m in re.finditer(title_re, head)]
        seen=[]; [seen.append(n) for n in names if n not in seen]; names=seen[:2]
        ims = imgs(pdf, work, tag, p, **kw)
        d=f'{work}/{tag}x{p}'; os.makedirs(d, exist_ok=True)
        if not os.path.exists(f'{d}/p.xml'): subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',pdf,f'{d}/p'],capture_output=True)
        lefts=[int(float(m.group(2))) for m in re.finditer(r'<image top="(-?\d+)" left="(-?\d+)" width="(-?\d+)" height="(-?\d+)"', open(f'{d}/p.xml').read()) if abs(int(m.group(3)))>300 and abs(int(m.group(4)))>440]
        if len(lefts)==len(ims): ims=[im for _,_,im in sorted(zip(lefts, range(len(ims)), ims))]
        else: bad.append((p,'order',len(lefts),len(ims)))
        if len(ims) > len(names): ims = ims[:len(names)] if names else ims
        if len(ims) != len(names): bad.append((p, len(ims), names))
        for k, im in enumerate(ims): T.append(im); L.append(names[k] if k < len(names) else '')
    return T, L, bad
def tiles(pdf, work, tag, p, wr, hr):
    """photos of a page in reading order (row by row, left to right)"""
    ims = imgs(pdf, work, tag, p, wr=wr, hr=hr)
    d=f'{work}/{tag}x{p}'; os.makedirs(d, exist_ok=True)
    if not os.path.exists(f'{d}/p.xml'): subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',pdf,f'{d}/p'],capture_output=True)
    xml = open(f'{d}/p.xml').read()
    pw = int(re.search(r'<page[^>]*width="(\d+)"', xml).group(1)); pts = float(subprocess.run(['pdfinfo','-f',str(p),'-l',str(p),pdf],capture_output=True,text=True).stdout.split('size:')[1].split()[0])
    box = [(int(float(m.group(1))), int(float(m.group(2))), abs(int(float(m.group(3)))), abs(int(float(m.group(4))))) for m in re.finditer(r'<image top="(-?[\d.]+)" left="(-?[\d.]+)" width="(-?[\d.]+)" height="(-?[\d.]+)"', xml)]
    # an embedded image of N px is drawn at roughly N * 72/dpi points; keep boxes whose aspect matches a kept photo
    cand = [b for b in box if b[2] > 40 and b[3] > 40]
    used=[]; pos=[]
    for im in ims:
        ar = im.width/im.height
        best = None
        for k,b in enumerate(cand):
            if k in used: continue
            if abs(b[2]/b[3]-ar) < 0.06 and b[2] > pw*0.08: best = k; break
        if best is None: return ims
        used.append(best); pos.append(cand[best])
    order = sorted(range(len(ims)), key=lambda i:(round(pos[i][0]/(pos[i][3]*0.6)), pos[i][1]))
    return [ims[i] for i in order]
