import sys; sys.path.insert(0, sys.argv[1])
import subprocess, re, os, json, shutil
from common import *
PDF='../inv/invado.pdf'; OUT='out/invado'; CACHE='cache/invado'
shutil.rmtree(OUT,ignore_errors=True)
MOD=[('Corato',12),('Artano',14),('Aversa',14),('Mirror',16),('Lago',18),('Pasaro',20),('Vinadio',22),('Fossano',24),('Imperia',26),('Destino Unico',28),('Livata',30),('Versano',32),('Nogaro',34),('Tamparo',36),('Linea Forte',38),('Capena Inserto',40),('Martina',42),('Domino',44),('Bianco',46),('Larina',48),("D'Artagnan",50)]
FLAT=[('Salerno',54),('Norma Decor',56),('Torino',58),('Merano',60),('Lido',62),('Dolce',64),('Strada',66),('Sagittarius',68),('Gemini',70),('Virgo',72),('Parma',74),('Orso',76),('Libra',78),('Taurus',78)]
OTHER=[('Amber',80,'binnen','Glazen deuren'),('Vouwdeuren',82,'schuif','Vouw- en schuifdeuren'),('Schuifsysteem in de wand',84,'schuif','Vouw- en schuifdeuren'),('Schuifsysteem voor de wand',86,'schuif','Vouw- en schuifdeuren'),('Egida',88,'entree','Woningtoegangsdeuren'),('Ignis',90,'technisch','Technische deuren'),('Guardia',92,'technisch','Technische deuren')]
ALL=[(n,p,'binnen','Binnendeuren · modulair') for n,p in MOD]+[(n,p,'binnen','Binnendeuren · vlak') for n,p in FLAT]+OTHER
COL={'B134':'lindo (biały)','B136':'buk','B224':'dąb','B339':'orzech','B402':'coimbra','B406':'heban','B706':'dąb jesienny','B288':'kasztan','B373':'wiąz','B541':'dąb szlachetny','B597':'orzech klasyczny','B598':'dąb popielaty','B637':'antracyt','B639':'dąb europejski','B656':'dąb włoski','B657':'dąb severo','B462':'cedr forte','B587':'dąb naturo','B596':'dąb śnieżny','B638':'dąb retro','B705':'dąb wiosenny','B707':'dąb zimowy','B708':'modrzew syberyjski','B473':'orzech duro','B474':'dąb eterno','B476':'dąb szary','B542':'coimbra ciemna','B543':'kasztan jasny','B490':'biały','B726':'czarny'}
HEAD=[(r'^KONSTRUKCJA','constr'),(r'^WYPOSAŻENIE STANDARDOWE SKRZYDEŁ BEZPRZYLG','equip2'),(r'^WYPOSAŻENIE STANDARDOWE','equip'),(r'^OPCJE DODATKOWE','opts'),(r'^SZKŁO','glass'),(r'^OŚCIEŻNIC','frame'),(r'^UWAG','notes'),(r'^DODATKOWE INFORMACJE','x'),(r'^KOLORYSTYKA','x')]
def segs(mask,minlen,gap):
    out=[];start=None;last=None
    for i,v in enumerate(mask):
        if v:
            if start is None: start=i
            last=i
        elif start is not None and i-last>gap:
            if last-start>=minlen: out.append((start,last+1))
            start=None
    if start is not None and last-start>=minlen: out.append((start,last+1))
    return out
def doors(p):
    im=render(PDF,p,CACHE); W,H=im.size; y0=int(H*0.045)
    band=im.crop((0,y0,W,int(H*0.47))); a=np.asarray(band).astype(int)
    bg=a[6:30, W//2-12:W//2+12].reshape(-1,3).mean(0)
    d=(np.abs(a-bg).sum(2)>60); res=[]
    for (r0,r1) in segs(d.mean(1)>0.22, 228, 7):
        for (c0,c1) in segs(d[r0:r1].mean(0)>0.6, 100, 4):
            res.append((c0,r0+y0,c1,r1+y0))
    return im,res
def norm(s): return re.sub(r'[^a-z]','',s.lower().replace('’','').replace("'",''))
cache={}; items=[]; dbg=[]; byp={}
for n,p,_,_ in ALL: byp.setdefault(p,[]).append(n)
for name,p,cat,grp in ALL:
    w1,W,H=tsv(PDF,p); t1=' '.join(w['t'] for w in w1)
    pairs=re.findall(r'(\d[\d ]*,\d\d)\s*/\s*(\d[\d ]*,\d\d)',t1)
    idx=byp[p].index(name); sel=pairs[idx::len(byp[p])] if len(byp[p])>1 else pairs
    nets=[float(a.replace(' ','').replace(',','.')) for a,b in sel]; gr=[float(b.replace(' ','').replace(',','.')) for a,b in sel]
    net=min(nets) if nets else None; gross=min(gr) if gr else None
    up=t1.upper()
    flags=dict(flush='BEZPRZYLGOWE' in up, double='PODWÓJNE' in up, sliding='PRZESUWNYM' in up, vent='WENTYLACJĄ' in up or 'WENTYLACJI' in up)
    if p+1 not in cache:
        im,ds=doors(p+1); w2,W2,H2=tsv(PDF,p+1); sc=im.width/W2
        rot=[w for w in w2 if w['h']>w['w']*1.25 and w['y']<H2*0.47 and re.search(r'[A-Za-z0-9]',w['t'])]
        groups=[]
        for w in sorted(rot,key=lambda w:w['x']):
            for g in groups:
                if abs(g[0]['x']-w['x'])<3 and abs(g[0]['y']-w['y'])<H2*0.2: g.append(w); break
            else: groups.append([w])
        labs=[(g[0]['x']*sc,min(q['y'] for q in g)*sc,max(q['y']+q['h'] for q in g)*sc,' '.join(q['t'] for q in sorted(g,key=lambda q:-q['y']))) for g in groups]
        dl=[]
        for (c0,r0,c1,r1) in ds:
            best=None
            for (lx,ly0,ly1,t) in labs:
                if c0-40*sc<=lx<=c0+4*sc and ly1>r0 and ly0<r1:
                    if best is None or lx>best[0]: best=(lx,t)
            dl.append(best[1] if best else '')
        ls=ylines([w for w in w2 if w['x']>W2*0.44 and w['y']>H2*0.36 and not (len(w['t'])==1 and w['t'].isdigit() and w['x']>W2*0.8)])
        codes=[c for c in dict.fromkeys(re.findall(r'B\d{3}',' '.join(w['t'] for w in w2))) if c in COL]
        t2=' '.join(w['t'] for w in w2)
        cache[p+1]=(im,ds,dl,sections(ls,HEAD),codes,t2)
    im,ds,dl,secs,codes,t2=cache[p+1]
    pick=[i for i,l in enumerate(dl) if norm(l).startswith(norm(name)[:5])] if len(byp[p])>1 else list(range(len(ds)))
    if len(byp[p])>1 and not pick:
        half=len(ds)//2; pick=list(range(half)) if idx==0 else list(range(half,len(ds)))
    cid='invado-'+slug(name); d=f'{OUT}/{cid}'
    mw=re.search(r'pojedyncze:\s*[„"]?(\d+)[”"]?\s*-\s*[„"]?(\d+)',t2)
    it=dict(id=cid,brand='Invado',cat=cat,group=grp,name=name,page=p,tagline='',descPL='',net=net,gross=gross,flags=flags,
            constr=secs.get('constr',[]),equip=secs.get('equip',[]),equip2=secs.get('equip2',[]),frame=secs.get('frame',[]),notes=secs.get('notes',[]),opts=secs.get('opts',[]),
            coats=[COL[c] for c in codes],widths=[int(mw.group(1)),int(mw.group(2))] if mw else None,dir=f'fabriek/invado/{cid}')
    op=render(PDF,p,CACHE)
    it['scene']=list(save(enhance(op.crop((0,int(op.height*0.16),op.width,int(op.height*0.862)))),f'{d}/scene.jpg',1400))
    pick=pick[:30]
    if not pick:
        for q in (p+1,p):
            imgs,PW,PH=pdf_images(PDF,q,CACHE); g=loose_gallery(imgs,PW,PH,limit=12)
            if len(g)>=2:
                pg=render(PDF,q,CACHE); s2=pg.width/PW
                it['strip']=strip([enhance(raw_image(PDF,q,r,pg,s2),2) for r in g],f'{d}/strip.jpg',H=420)
                it['labels']=[f'{name} {k+1}' for k in range(len(g))]; break
    if pick:
        it['strip']=strip([enhance(im.crop((ds[i][0]+3,ds[i][1]+3,ds[i][2]-3,ds[i][3]-3))) for i in pick],f'{d}/strip.jpg')
        it['labels']=[dl[i] for i in pick]
    items.append(it)
    dbg.append(f"{p:3d} {name:26s} net={net} v={len(pick):2d} c={len(it['constr'])} e={len(it['equip'])} e2={len(it['equip2'])} o={len(it['opts'])} col={len(codes)} w={it['widths']} {flags} | {(it.get('labels') or [''])[:3]}")
json.dump(items,open('out/invado.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(dbg)); print(len(items))
