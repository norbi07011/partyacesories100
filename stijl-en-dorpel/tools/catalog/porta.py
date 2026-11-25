import sys; sys.path.insert(0, "/tmp/claude-0/-home-user-partyacesories100/fd63a692-9339-5b73-8eb0-6991b2fc8d63/scratchpad/pipe")
import subprocess, re, os, json, sys, shutil, xml.etree.ElementTree as ET
from common import *
PDF='../porta/porta.pdf'; OUT='out/porta'; CACHE='cache/porta'
shutil.rmtree(OUT,ignore_errors=True)
def cat_of(p):
    if p<50: return 'binnen','Binnendeuren · decor'
    if p<78: return 'binnen','Binnendeuren · fineer'
    if p<84: return 'binnen','Villadora'
    if p<94: return 'schuif','Vouw- en schuifdeuren'
    if p<108: return 'entree','Woningtoegangsdeuren'
    if p<118: return 'buiten','Buitendeuren'
    if p<132: return 'technisch','Technische deuren'
    return 'kozijn','Kozijnen'
def images(p):
    d=f'{CACHE}/x{p}'; os.makedirs(d,exist_ok=True)
    subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q','-nodrm',PDF,f'{d}/t'],capture_output=True)
    try: root=ET.parse(f'{d}/t.xml').getroot()
    except Exception: return [],1
    pg=root.find('page'); PW=float(pg.get('width'))
    res=[]; seen=set()
    for im in pg.findall('image'):
        r=tuple(int(im.get(k)) for k in ('left','top','width','height'))
        key=tuple(round(v/4) for v in r)
        if key in seen: continue
        seen.add(key); res.append(r)
    shutil.rmtree(d,ignore_errors=True)
    return res,PW
PRICE=re.compile(r'od\s+(\d[\d ]*),-\s*\|\s*(\d[\d ]*,\d\d)')
HEAD=[(r'(?i)^konstrukcja','constr'),(r'(?i)^akcesoria w cenie','equip'),(r'(?i)^wyposażenie','equip'),(r'(?i)^ościeżnic[ea],','frame'),(r'(?i)^uwagi\b','notes'),(r'(?i)^dopłaty','opts'),(r'(?i)^opcje\b','opts')]
COAT=re.compile(r'^(Farba|Okleina|Lakier|Laminat|Stal|Blacha|Fornir|CPL|HPL)\b[^★*]*')
items=[]; dbg=[]
for p in range(9,158):
    words,W,H=tsv(PDF,p)
    if not words: continue
    top=sorted([w for w in words if w['y']<H*0.075],key=lambda w:w['x'])
    ttxt=' '.join(w['t'] for w in top if 14<=w['h']<=24)
    m=PRICE.search(ttxt)
    if not m and p!=112: continue
    net,gross=(3299,4057.77) if p==112 else (int(m.group(1).replace(' ','')),float(m.group(2).replace(' ','').replace(',','.')))
    tw=[w for w in top if w['h']>26 and w['x']<W*0.62]
    if p==112: tw=[dict(t='Eco NORD')]
    if not tw: continue
    name=re.sub(r'\s+',' ',' '.join(w['t'] for w in tw)).strip(' ,')
    name=re.sub(r'^(NOWOŚĆ|NOWE MODELE)\s*','',name)
    # tagline + description: left block
    reg=[w for w in words if w['x']<W*0.41 and H*0.10<w['y']<H*0.37]
    tag=' '.join(l['t'] for l in ylines(reg,hmin=18,tol=4))[:90]
    desc=' '.join(l['t'] for l in ylines(reg,hmin=7,hmax=17.9))
    desc=re.sub(r'(\w)-\s+(\w)',r'\1\2',desc).replace('\u00ad','')
    desc=re.sub(r'\s+(Porta|Natura|Nova)$','',desc.strip())
    if len(desc)<40: desc=''
    # images left page
    imgs,PW=images(p); k=PW/W
    page=render(PDF,p,CACHE); sc=page.width/PW
    def crop(r): 
        x,y,w,h=r; return page.crop((round(x*sc),round(y*sc),round((x+w)*sc),round((y+h)*sc)))
    big_imgs=[r for r in imgs if r[2]>60 and r[3]>100]
    scene=None; hero=None; vars_=[]
    land=[r for r in big_imgs if r[2]>r[3]*1.15 and r[2]>PW*0.3]
    if land: scene=max(land,key=lambda r:r[2]*r[3])
    port=[r for r in big_imgs if r is not scene and r[3]>=r[2]*0.95 and r[3]>118]
    if port:
        mx=max(port,key=lambda r:r[3])
        if mx[3]>330: hero=mx
    for r in port:
        if r is hero: continue
        if 118<r[3]<330: vars_.append(r)
    vars_.sort(key=lambda r:(round(r[1]/30),r[0]))
    def label(r):
        x,y,w,h=[v/k for v in r]
        ws=[q for q in words if y+h-2<=q['y']<=y+h+26 and x-4<=q['x']<=x+w-3]
        ws.sort(key=lambda q:(round(q['y']/3),q['x']))
        t=' '.join(q['t'] for q in ws).replace('*','').strip()
        return re.sub(r'\s+',' ',t)[:48]
    # right page
    w2,W2,H2=(words,W,H) if 120<=p<=131 else tsv(PDF,p+1)
    secs={}
    if w2:
        for hm,col in ((8.9,lambda w:w['x']<W2*0.5),(7.5,lambda w:w['x']>=W2*0.5)):
            s=sections(ylines([w for w in w2 if hm<=w['h']<=10.5 and w['y']>H2*0.5 and col(w)]),HEAD)
            for kk,v in s.items(): secs.setdefault(kk,[]).extend(v)
    coats=[]
    widths=None
    mw=re.search(r'(\d{2,3})\s*-\s*(\d{2,3})',' '.join(w['t'] for w in words if w['y']<H*0.11 and w['x']>W*0.6) or '')
    if mw: widths=[int(mw.group(1)),int(mw.group(2))]
    cat,grp=cat_of(p)
    cid=f'porta-{slug(name)}-{p}'
    d=f'{OUT}/{cid}'
    it=dict(id=cid,brand='Porta',cat=cat,group=grp,name=name.title() if name.isupper() else name,page=p,tagline=tag,descPL=desc,net=net,gross=gross,
            constr=secs.get('constr',[]),equip=secs.get('equip',[]),frame=secs.get('frame',[]),notes=secs.get('notes',[]),opts=secs.get('opts',[]),coats=coats,widths=widths,dir=f'fabriek/porta/{cid}')
    if scene: it['scene']=list(save(crop(scene),f'{d}/scene.jpg',760))
    if hero: it['hero']=list(save(crop(hero),f'{d}/hero.jpg',900))
    if not scene and not hero:
        cand=[r for r in big_imgs if r not in vars_ and r[2]*r[3]>PW*PW*0.05]
        if cand: scene=max(cand,key=lambda r:r[2]*r[3])
    if not vars_:
        vars_=loose_gallery(imgs,PW,PW*1.415,exclude=(scene,hero))
        if len(vars_)<2: vars_=[]
    vars_=vars_[:30]
    if vars_:
        it['strip']=strip([crop(r) for r in vars_],f'{d}/strip.jpg')
        it['labels']=[label(r) for r in vars_]
    if not (scene or hero or vars_): continue
    items.append(it); dbg.append(f"{p:3d} {it['name'][:34]:34s} net={net:5d} v={len(vars_):2d} hero={'y' if hero else '-'} scene={'y' if scene else '-'} c={len(it['constr'])} e={len(it['equip'])} o={len(it['opts'])} coats={len(coats)} | {tag[:30]}")
FIX={122:'Akustyczne 27 dB i 32 dB',123:'Akustyczne 42 dB',128:'Uniwersalne'}
seen={}
for it in items:
    if it['page'] in FIX: it['name']=FIX[it['page']]
    it['tagline']=re.sub(r'\s+\d+$','',it['tagline'])
    n=it['name']; seen[n]=seen.get(n,0)+1
    if it['cat']=='kozijn': it['name']='Kozijn '+n
    elif seen[n]>1: it['name']=f"{n} · serie {seen[n]}"
json.dump(items,open('out/porta.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(dbg)); print(len(items))
