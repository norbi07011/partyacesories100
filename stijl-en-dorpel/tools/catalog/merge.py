import json,re,os,shutil,sys
D=sys.argv[1]
inv=json.load(open('out/invado.json')); por=json.load(open('out/porta.json')); acc=json.load(open('out/acc.json'))
for it in inv:
    labs=it.get('labels') or []; out=[]
    for i,l in enumerate(labs):
        l=re.sub(r'\s+',' ',l).strip()
        ok=l.lower().startswith(it['name'].lower().replace("'", "’")[:4]) and len(l)<=len(it['name'])+10 and l.count(it['name'].split()[0])==1 and l!=it['name']
        out.append(l if ok else f"{it['name']} {i+1}")
    if labs: it['labels']=out
for it in por:
    it['labels']=[(l if len(l)>1 else f"model {i+1}") for i,l in enumerate(it.get('labels') or [])]; it['flags']={}; it['equip2']=[]
for c in acc:
    if c.get('labels'):
        out=[]
        for i,l in enumerate(c['labels']):
            l=re.sub(r'kolor zdjęcia:.*$','',l); l=re.split(r'[|•(]|\bzł\b',l)[0].strip(' ,:-–'); l=' '.join(l.split()[:5])
            out.append(l if len(l)>2 and not re.fullmatch(r'[\d\s/hH]+',l) else f"{i+1}")
        c['labels']=out
cat=inv+por+acc
keep={'kick','klamki','listwy','ob3','ors','prog','sara','tuleje','uszczelka','wentylacja','wkladka','zawiasy'}
for b in ('invado','porta'):
    os.makedirs(f'{D}/{b}',exist_ok=True)
    for n in os.listdir(f'{D}/{b}'):
        if n not in keep: shutil.rmtree(f'{D}/{b}/{n}')
    for n in os.listdir(f'out/{b}'): shutil.copytree(f'out/{b}/{n}',f'{D}/{b}/{n}')
json.dump(cat,open(f'{D}/catalog.json','w'),ensure_ascii=False,separators=(',',':'))
print('items',len(cat),'variants',sum(len(c.get('labels') or []) or 1 for c in cat),'no image:',[c['id'] for c in cat if not (c.get('strip') or c.get('hero') or c.get('scene'))])
print('invado variants',[(c['name'],len(c.get('labels') or [])) for c in inv][:42])
