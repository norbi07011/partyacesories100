import sys; sys.path.insert(0, sys.argv[1])
import subprocess, re, os, json, shutil, xml.etree.ElementTree as ET
from common import *
PAGES=[
 ('porta','../porta/porta.pdf',160,'beslag','Deurkrukken · serie Accent'),('porta','../porta/porta.pdf',161,'beslag','Deurkrukken · serie Office'),
 ('porta','../porta/porta.pdf',162,'beslag','Veiligheidsbeslag voor toegangsdeuren'),('porta','../porta/porta.pdf',163,'beslag','Cilinders & toebehoren buitendeuren'),
 ('porta','../porta/porta.pdf',164,'beslag','Lijsten & ventilatie'),('porta','../porta/porta.pdf',165,'beslag','Glassoorten'),
 ('porta','../porta/porta.pdf',166,'beslag','Scharnieren & sloten'),('porta','../porta/porta.pdf',167,'beslag','Extra toebehoren'),
 ('invado','../inv/invado.pdf',97,'kozijn','Verstelbaar kozijn voor stompe deuren'),('invado','../inv/invado.pdf',98,'kozijn','Stalen kozijnen'),
 ('invado','../inv/invado.pdf',102,'kozijn','Ombouw voor stalen kozijn'),('invado','../inv/invado.pdf',103,'beslag','Deurkrukken'),
 ('invado','../inv/invado.pdf',104,'beslag','Scharnieren, cilinders & toebehoren'),('invado','../inv/invado.pdf',105,'beslag','Toebehoren schuifsystemen'),
]
def images(pdf,p,tmp):
    d=f'{tmp}/x{p}'; os.makedirs(d,exist_ok=True)
    subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q','-nodrm',pdf,f'{d}/t'],capture_output=True)
    try: pg=ET.parse(f'{d}/t.xml').getroot().find('page')
    except Exception: return [],1
    PW=float(pg.get('width')); res=[]; seen=set()
    for im in pg.findall('image'):
        r=tuple(int(im.get(k)) for k in ('left','top','width','height'))
        key=tuple(round(v/5) for v in r)
        if key in seen: continue
        seen.add(key); res.append(r)
    shutil.rmtree(d,ignore_errors=True); return res,PW
items=[]
for brand,pdf,p,cat,name in PAGES:
    words,W,H=tsv(pdf,p); imgs,PW=images(pdf,p,f'cache/{brand}'); k=PW/W
    page=render(pdf,p,f'cache/{brand}'); sc=page.width/PW; PH=page.height/sc
    big=[r for r in imgs if r[2]>60 and r[3]>45 and r[2]*r[3]<PW*PH*0.45 and r[1]>PH*0.05]
    # drop images fully contained in a larger one
    keep=[]
    for r in sorted(big,key=lambda r:-r[2]*r[3]):
        if any(q[0]-3<=r[0] and q[1]-3<=r[1] and q[0]+q[2]+3>=r[0]+r[2] and q[1]+q[3]+3>=r[1]+r[3] for q in keep): continue
        keep.append(r)
    keep.sort(key=lambda r:(round(r[1]/60),r[0])); keep=keep[:14]
    def label(r):
        x,y,w,h=[v/k for v in r]
        ws=[q for q in words if x-3<=q['x']+q['w']/2<=x+w+3 and y+h*0.55<=q['y']<=y+h+20 and q['h']<13]
        ws.sort(key=lambda q:(round(q['y']/3),q['x']))
        t=re.sub(r'\s+',' ',' '.join(q['t'] for q in ws[:7])).strip(' •-')
        return t[:44]
    cid=f'{brand}-acc-{p}'; d=f'out/{brand}/{cid}'; shutil.rmtree(d,ignore_errors=True)
    lines_=[clean_item(l['t']) for l in ylines([w for w in words if 7<w['h']<12]) if re.match(r'^\s*[•\-–]\s*\S',l['t'])]
    it=dict(id=cid,brand=brand.capitalize(),cat=cat,group='Kozijnen' if cat=='kozijn' else 'Beslag & toebehoren',name=name,page=p,tagline='',descPL='',net=None,gross=None,flags={},
            constr=[],equip=[],equip2=[],frame=[],notes=[l for l in lines_ if len(l)>8][:14],opts=[],coats=[],widths=None,dir=f'fabriek/{brand}/{cid}')
    if keep:
        it['strip']=strip([page.crop((round(r[0]*sc),round(r[1]*sc),round((r[0]+r[2])*sc),round((r[1]+r[3])*sc))) for r in keep],f'{d}/strip.jpg',H=360)
        it['labels']=[label(r) or f'{i+1}' for i,r in enumerate(keep)]
    else:
        it['scene']=list(save(page.crop((0,int(page.height*0.06),page.width,int(page.height*0.6))),f'{d}/scene.jpg',760))
    items.append(it); print(p,name,len(keep),it.get('labels',[])[:4],len(it['notes']))
json.dump(items,open('out/acc.json','w'),ensure_ascii=False)
