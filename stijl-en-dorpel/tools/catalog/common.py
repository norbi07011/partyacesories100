import subprocess, re, os, json
from PIL import Image, ImageFilter
SHARP=ImageFilter.UnsharpMask(radius=1.6,percent=110,threshold=2)
def enhance(im,factor=1):
    if factor!=1: im=im.resize((max(1,round(im.width*factor)),max(1,round(im.height*factor))),Image.LANCZOS)
    return im.filter(SHARP)
import numpy as np
DPI=200
def render(pdf, p, cache):
    f=f'{cache}/p-{p:03d}.png'
    if not os.path.exists(f):
        os.makedirs(cache,exist_ok=True)
        subprocess.run(['pdftoppm','-f',str(p),'-l',str(p),'-r',str(DPI),'-png','-singlefile',pdf,f[:-4]],check=True)
    return Image.open(f).convert('RGB')
def tsv(pdf,p):
    out=subprocess.run(['pdftotext','-tsv','-f',str(p),'-l',str(p),pdf,'-'],capture_output=True,text=True).stdout
    words=[]; W=H=None
    for ln in out.splitlines()[1:]:
        c=ln.split('\t')
        if len(c)<12: continue
        lvl=int(c[0])
        if lvl==1: W=float(c[8]); H=float(c[9])
        if lvl==5 and c[11].strip():
            words.append(dict(b=int(c[2]),par=int(c[3]),ln=int(c[4]),x=float(c[6]),y=float(c[7]),w=float(c[8]),h=float(c[9]),t=c[11]))
    return words,W,H
def lines(words):
    d={}
    for w in words: d.setdefault((w['b'],w['par'],w['ln']),[]).append(w)
    out=[]
    for k,ws in d.items():
        ws.sort(key=lambda w:w['x'])
        out.append(dict(key=k,t=' '.join(w['t'] for w in ws),x=min(w['x'] for w in ws),y=min(w['y'] for w in ws),h=max(w['h'] for w in ws),x2=max(w['x']+w['w'] for w in ws)))
    out.sort(key=lambda l:(round(l['y']),l['x']))
    return out
PRICE_TAIL=re.compile(r'[\s.…]*(\(?\d[\d ]*([,.]\d+)?\s*[|/]\s*-?\s*\d[\d ]*[,.]\d\d\)?(\s*\([^)]*\))?|bez\s*dopłat|\(str\.\s*\d+\)|str\.\s*\d+|tabela opcji dodatkowych.*)\s*$',re.I)
def clean_item(t):
    t=re.sub(r'^[\d]\s+(?=•)','',t.strip())
    t=re.sub(r'^[•\-–·]\s*','',t).strip()
    for _ in range(3): t=PRICE_TAIL.sub('',t).strip()
    return t.strip(' .;-–')
def sections(lns, headers):
    """lns sorted top-to-bottom within one column. headers: list of (regex, key)."""
    cur=None; res={}
    for l in lns:
        t=l['t'].strip()
        hit=None
        for rx,key in headers:
            if re.match(rx,t): hit=key; break
        if hit is not None: cur=hit; res.setdefault(cur,[]); continue
        if cur is None: continue
        starts=bool(re.match(r'^(\d\s+)?[•\-–·]\s*\S',t))
        c=clean_item(t.replace('\u00ad ','').replace('\u00ad',''))
        if not c or re.fullmatch(r'[\d\s,.|/\-]+',c): continue
        if starts or not res[cur]: res[cur].append(c)
        else: res[cur][-1]=(res[cur][-1]+' '+c).strip()
    return {k:[x for x in v if len(x)>3] for k,v in res.items()}
def slug(s):
    tr=str.maketrans('ąćęłńóśźżĄĆĘŁŃÓŚŹŻ’\'','acelnoszzACELNOSZZ  ')
    return re.sub(r'[^a-z0-9]+','-',s.translate(tr).lower()).strip('-')
def save(im,path,maxh,q=82):
    os.makedirs(os.path.dirname(path),exist_ok=True)
    if im.height>maxh: im=im.resize((max(1,round(im.width*maxh/im.height)),maxh),Image.LANCZOS)
    im.save(path,quality=88,optimize=True); return im.size
def strip(ims,path,H=None):
    H=H or min(660,max(i.height for i in ims))
    """variants side by side; returns list of [x,w] and total size"""
    rs=[(i if i.height==H else i.resize((max(1,round(i.width*H/i.height)),H),Image.LANCZOS)) for i in ims]
    W=sum(r.width for r in rs)+4*(len(rs)-1)
    s=Image.new('RGB',(W,H),'white'); x=0; pos=[]
    for r in rs: s.paste(r,(x,0)); pos.append([x,r.width]); x+=r.width+4
    os.makedirs(os.path.dirname(path),exist_ok=True)
    s.save(path,quality=88,optimize=True); return dict(w=W,h=H,items=pos)

def ylines(words,hmin=0,hmax=999,tol=2.6):
    ws=sorted([w for w in words if hmin<=w['h']<=hmax],key=lambda w:(w['y'],w['x']))
    groups=[]
    for w in ws:
        if groups and abs(groups[-1][0]['y']-w['y'])<=tol: groups[-1].append(w)
        else: groups.append([w])
    out=[]
    for g in groups:
        g.sort(key=lambda w:w['x'])
        out.append(dict(t=' '.join(w['t'] for w in g),x=g[0]['x'],y=g[0]['y'],h=max(w['h'] for w in g),x2=g[-1]['x']+g[-1]['w']))
    return out

import xml.etree.ElementTree as _ET, shutil as _sh
def pdf_images(pdf,p,tmp):
    d=f'{tmp}/x{p}'; os.makedirs(d,exist_ok=True)
    subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q','-nodrm',pdf,f'{d}/t'],capture_output=True)
    try: pg=_ET.parse(f'{d}/t.xml').getroot().find('page')
    except Exception: return [],1,1
    PW=float(pg.get('width')); PH=float(pg.get('height')); res=[]; seen={}
    for im in pg.findall('image'):
        r=tuple(int(im.get(k)) for k in ('left','top','width','height')); src=im.get('src')
        key=tuple(round(v/5) for v in r)
        if key in seen:
            if src.endswith('.png'): RAW[seen[key]]=src   # masked version wins
            continue
        seen[key]=(pdf,p)+r; RAW[(pdf,p)+r]=src; res.append(r)
    return res,PW,PH
RAW={}
def raw_image(pdf,p,r,page,sc):
    """The embedded image at its native pixels (no page overlays), on white; falls back to a page crop."""
    src=RAW.get((pdf,p)+tuple(r))
    try:
        im=Image.open(src)
        if im.mode in ('RGBA','LA','P'):
            im=im.convert('RGBA'); bg=Image.new('RGBA',im.size,'white'); bg.alpha_composite(im); im=bg
        im=im.convert('RGB')
        if im.width<20 or im.height<20: raise ValueError
        a=np.asarray(im).astype(int).sum(2)
        if (a<40).mean()>0.12: raise ValueError   # unmasked cut-out on black: use the rendered page instead
        rows=(a<60).mean(1)>0.5
        b=im.height
        while b>im.height*0.9 and rows[b-1]: b-=1
        return im.crop((0,0,im.width,b))
    except Exception:
        x,y,w,h=r; return page.crop((round(x*sc),round(y*sc),round((x+w)*sc),round((y+h)*sc)))
def loose_gallery(imgs,PW,PH,exclude=(),limit=24):
    big=[r for r in imgs if r not in exclude and r[2]>55 and r[3]>70 and r[2]*r[3]<PW*PH*0.4 and r[1]>PH*0.07]
    keep=[]
    for r in sorted(big,key=lambda r:-r[2]*r[3]):
        if any(q[0]-3<=r[0] and q[1]-3<=r[1] and q[0]+q[2]+3>=r[0]+r[2] and q[1]+q[3]+3>=r[1]+r[3] for q in keep): continue
        keep.append(r)
    keep.sort(key=lambda r:(round(r[1]/60),r[0])); return keep[:limit]
