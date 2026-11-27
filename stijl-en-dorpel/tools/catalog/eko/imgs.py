import sys,json,os,subprocess,hashlib
from concurrent.futures import ThreadPoolExecutor
tree=json.load(open('tree.json')); os.makedirs('img',exist_ok=True)
urls=list(dict.fromkeys(p['img'] for v in tree.values() for p in v['products'] if p.get('img')))
def ip(u): return 'img/'+hashlib.md5(u.encode()).hexdigest()+os.path.splitext(u)[1]
def get(u):
    f=ip(u)
    for _ in range(2):
        if os.path.exists(f) and os.path.getsize(f)>1500: return 1
        subprocess.run(['curl','-sS','-m','60','-A','Mozilla/5.0','-o',f,'https://ekookna.nl'+u],capture_output=True)
    return int(os.path.exists(f) and os.path.getsize(f)>1500)
with ThreadPoolExecutor(8) as ex: r=list(ex.map(get,urls))
print('images',sum(r),'of',len(urls))
