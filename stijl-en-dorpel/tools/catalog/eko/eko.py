import subprocess,re,os,json,hashlib,html,sys
from concurrent.futures import ThreadPoolExecutor
BASE='https://ekookna.nl'; os.makedirs('pages',exist_ok=True)
def fpath(p): return 'pages/'+hashlib.md5(p.encode()).hexdigest()+'.html'
def fetch(p):
    f=fpath(p)
    for _ in range(3):
        if os.path.exists(f) and os.path.getsize(f)>2000: break
        subprocess.run(['curl','-sSL','-m','25','-A','Mozilla/5.0','-o',f,BASE+p],capture_output=True)
    return open(f,encoding='utf-8',errors='replace').read() if os.path.exists(f) else ''
def many(ps):
    with ThreadPoolExecutor(5) as ex: return dict(zip(ps,ex.map(fetch,ps)))
def clean(t): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',t))).strip()
def listing(h):
    out=[]
    m=re.search(r'<ul class="products-list">(.*?)</ul>\s*(?:</form>|<div class="products-compare)',h,flags=re.S) or re.search(r'<ul class="products-list">(.*)',h,flags=re.S)
    if not m: return out
    for li in re.split(r'<li class="wow fadeIn">',m.group(1))[1:]:
        a=re.search(r'<a title="([^"]*)" href="([^"]+)"',li); img=re.search(r'<img src="([^"]+)"',li)
        if not a: continue
        tech=[clean(x) for x in re.findall(r'<ul class="products-tech-details">(.*?)</ul>',li,flags=re.S)]
        techs=[f"{clean(b)} {clean(s)}" for b,s in re.findall(r'<b>(.*?)</b><span>(.*?)</span>',li,flags=re.S)]
        desc=[clean(x) for x in re.findall(r'<p>(.*?)</p>',(re.search(r'<ul class="products-desc">(.*?)</ul>',li,flags=re.S) or [None,''])[1],flags=re.S)]
        out.append(dict(name=html.unescape(a.group(1)),url=a.group(2),img=img.group(1) if img else None,tech=techs,desc=[d for d in desc if d]))
    return out
def subcats(h,p):
    r=[(u,html.unescape(t)) for u,t in dict.fromkeys(re.findall(r'<div class="pic"><a href="('+re.escape(p)+r'/[^"]+)" title="([^"]*)"',h))]
    if r: return r
    body=h[h.find('products-listing'):] if 'products-listing' in h else h
    body=body[:body.find('<footer')] if '<footer' in body else body
    return [(u,'') for u in dict.fromkeys(re.findall(r'href="('+re.escape(p)+r'/[^"#?]+)"',body))]
if __name__=='__main__':
    TOP=['ramen','deuren','schuifsystemen','rolluiken','horren','industriele-en-garagedeuren','beglazing']
    tree={}; todo=['/ekonl/producten/'+t for t in TOP]; done=set()
    while todo:
        pages=many([p for p in todo if p not in done]); nxt=[]
        for p,h in pages.items():
            done.add(p)
            title=clean((re.search(r'<h1[^>]*>(.*?)</h1>',h,flags=re.S) or [0,''])[1]); intro=clean((re.search(r'<div class="products-intro-text">(.*?)</div>',h,flags=re.S) or [0,''])[1])
            subs=subcats(h,p); prods=listing(h)
            tree[p]=dict(title=title,intro=intro,subs=[u for u,_ in subs],products=prods,ok=len(h)>2000)
            nxt+= [u for u,_ in subs if u not in done]
        todo=nxt
    json.dump(tree,open('tree.json','w'),ensure_ascii=False,indent=1)
    for p,v in tree.items(): print(f"{'OK ' if v['ok'] else 'ERR'} {p[16:]:70s} subs={len(v['subs']):2d} products={len(v['products']):3d}  {v['title']}")
    print('total products',sum(len(v['products']) for v in tree.values()))
