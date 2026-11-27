"""Convert the catalogue photos to WebP and fold very wide variant strips into several rows.
Same pixels on screen, roughly half the bytes; wide strips also stop exceeding what phones can decode.
Run last, after the import / trim / optimize scripts: webp.py public/fabriek"""
import sys, json, os, glob
from PIL import Image
pub = sys.argv[1]; MAXW = 6000; Q = 80
c = json.load(open(f'{pub}/catalog.json')); before = after = 0; n = 0
def save(im, dst, src):
    global before, after, n
    im.convert('RGB').save(dst, 'WEBP', quality=Q, method=6)
    before += os.path.getsize(src); after += os.path.getsize(dst); os.remove(src); n += 1
for it in c:
    d = f"{pub}/../{it['dir']}"; f = f'{d}/strip.jpg'; s = it.get('strip')
    if not s or not os.path.exists(f): continue
    im = Image.open(f).convert('RGB')
    if s['w'] > MAXW:
        rows = [[]]; x = 0
        for k, (sx, w, *_) in enumerate(s['items']):
            if x and x + w > MAXW: rows.append([]); x = 0
            rows[-1].append((k, sx, w, x)); x += w + 4
        W = max(r[-1][3] + r[-1][2] for r in rows); H = s['h']
        out = Image.new('RGB', (W, H * len(rows)), 'white'); items = [None] * len(s['items'])
        for ri, r in enumerate(rows):
            for k, sx, w, nx in r:
                out.paste(im.crop((sx, 0, sx + w, H)), (nx, ri * H)); items[k] = [nx, w, ri]
        it['strip'] = dict(w=W, h=H, rows=len(rows), items=items); im = out
    save(im, f'{d}/strip.webp', f)
for f in glob.glob(f'{pub}/**/*.jpg', recursive=True):
    if '/packs/' in f: continue
    save(Image.open(f), f[:-4] + '.webp', f)
json.dump(c, open(f'{pub}/catalog.json', 'w'), ensure_ascii=False)
print(f'{n} files: {before/1e6:.1f} MB -> {after/1e6:.1f} MB')
