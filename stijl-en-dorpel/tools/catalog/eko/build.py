import sys,json,os,re,html,hashlib,shutil; sys.path.insert(0,"/tmp/claude-0/-home-user-partyacesories100/fd63a692-9339-5b73-8eb0-6991b2fc8d63/scratchpad/eko")
from eko import *
from PIL import Image
D=sys.argv[1]
tree=json.load(open('tree.json'))
MAP=[('/ramen/pvc-ramen','ramen','Ramen · kunststof'),('/ramen/aluminium-ramen','ramen','Ramen · aluminium'),('/ramen/houten-ramen','ramen','Ramen · hout'),('/ramen/stalen-ramen','ramen','Ramen · staal'),('/ramen/extras','ramen',"Ramen · extra's"),
 ('/deuren/buitendeuren/pvc-deuren','buiten','Buitendeuren · kunststof'),('/deuren/buitendeuren/aluminium-deuren','buiten','Buitendeuren · aluminium'),('/deuren/buitendeuren/houten-deuren','buiten','Buitendeuren · hout'),('/deuren/buitendeuren/stalen-deuren','buiten','Buitendeuren · staal'),
 ('/deuren/binnendeuren/stalen-deuren','binnen','Binnendeuren · staal'),('/deuren/extras','buiten',"Deuren · extra's"),
 ('/schuifsystemen/pvc-systemen','schuif','Schuifsystemen · kunststof'),('/schuifsystemen/aluminiumsystemen','schuif','Schuifsystemen · aluminium'),('/schuifsystemen/houtsystemen','schuif','Schuifsystemen · hout'),('/schuifsystemen/stalensystemen','schuif','Schuifsystemen · staal'),
 ('/rolluiken/shutters','zonwering','Shutters'),('/horren/horren','zonwering','Horren'),('/horren/muggengaas-voor-deuren','zonwering','Hordeuren'),('/horren/uitschuifbare-horren','zonwering','Schuifhorren'),
 ('/industriele-en-garagedeuren/garagedeuren/sectionale-garagedeuren/infiniti-thermo-garage-deuren','garage','Sectionale garagedeuren'),('/industriele-en-garagedeuren/garagedeuren/zwenkgaragedeuren/stalen-zwenkdeuren','garage','Openslaande garagedeuren'),
 ('/beglazing/beglazingseenheden','glas','Beglazing'),('/beglazing/soorten-glas','glas','Glassoorten'),('/beglazing/accessoires','glas','Glas · accessoires')]
def ip(u): return 'img/'+hashlib.md5(u.encode()).hexdigest()+os.path.splitext(u)[1]
out=[]; seen=set(); shutil.rmtree(f'{D}/eko',ignore_errors=True)
for path,cat,group in MAP:
    v=tree.get('/ekonl/producten'+path)
    if not v: print('missing',path); continue
    items=[]
    for p in v['products']:
        if p['url'] in seen: continue
        seen.add(p['url'])
        slug=re.sub(r'[^a-z0-9]+','-',p['url'].split('/')[-1].lower()).strip('-'); cid='eko-'+slug
        feats=list(p['desc']); tech=list(p['tech']); uw=None
        f=fpath(p['url'])
        if os.path.exists(f) and os.path.getsize(f)>2000:
            h=open(f,encoding='utf-8',errors='replace').read()
            m=re.search(r'<ul class="product-page-two-cols-right-list">(.*?)</ul>',h,flags=re.S)
            if m:
                fl=[clean(x) for x in re.findall(r'<li>(.*?)</li>',m.group(1),flags=re.S)]; fl=[x for x in fl if x]
                if fl: feats=fl
            nums=[(clean(a),clean(b)) for a,b in re.findall(r'<p class="big-number">(.*?)</p>\s*<p class="number-desc">(.*?)</p>',h,flags=re.S)]
            if nums: tech=[f"{a} {b.replace('*','').strip()}" for a,b in nums if a and b]
        nl=bool(re.search(r'(^|[- ])nl$',slug) or re.search(r'\bNL\b',p['name']))
        d=f'{D}/eko/{cid}'; os.makedirs(d,exist_ok=True); hero=None
        try:
            im=Image.open(ip(p['img']))
            if im.mode in ('RGBA','LA','P'):
                im=im.convert('RGBA'); bg=Image.new('RGBA',im.size,'white'); bg.alpha_composite(im); im=bg
            im=im.convert('RGB')
            if im.height>1100: im=im.resize((round(im.width*1100/im.height),1100),Image.LANCZOS)
            im.save(f'{d}/hero.jpg',quality=88,optimize=True); hero=[im.width,im.height]
        except Exception as e: print('img fail',p['name'],e)
        it=dict(id=cid,brand='Eko-Okna',cat=cat,group=group,name=p['name'],page=0,tagline='',descPL='',descNL=(' · '.join(feats[:4])[:1]).upper()+(' · '.join(feats[:4]))[1:] if feats else '',
                features=feats,tech=tech[:6],nl=nl,url='https://ekookna.nl'+p['url'],net=None,gross=None,flags={},constr=[],equip=[],equip2=[],frame=[],notes=[],opts=[],coats=[],widths=None,dir=f'fabriek/eko/{cid}')
        if hero: it['hero']=hero
        items.append(it)
    items.sort(key=lambda x:not x['nl']); out+=items
cat=[c for c in json.load(open(f'{D}/catalog.json')) if c['brand']!='Eko-Okna']
json.dump(out+cat,open(f'{D}/catalog.json','w'),ensure_ascii=False,separators=(',',':'))
from collections import Counter
print(len(out),Counter(c['cat'] for c in out)); print('NL-market:',[c['name'] for c in out if c['nl']])
print('no hero',[c['name'] for c in out if not c.get('hero')]); print(json.dumps(out[0],ensure_ascii=False)[:700])
print('sizes',sorted(c['hero'][1] for c in out if c.get('hero'))[::25])
