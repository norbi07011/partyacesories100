"""Trim the white margins around the Eko-Okna cut-out photos so every product fills its frame equally.
Run after build.py / panels.py: trim.py public/fabriek"""
import sys, json, os
from PIL import Image, ImageChops
pub = sys.argv[1]
c = json.load(open(f'{pub}/catalog.json')); n = 0
for it in c:
    if it['brand'] != 'Eko-Okna' or not it.get('hero'): continue
    f = f"{pub}/../{it['dir']}/hero.jpg"
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB')
    if it['id'].startswith('eko-aio-') and not it.get('trimmed'): im = im.crop((0, 0, round(im.width * .96), im.height))
    diff = ImageChops.difference(im, Image.new('RGB', im.size, im.getpixel((2, 2)))).convert('L').point(lambda v: 255 if v > 14 else 0)
    box = diff.getbbox()
    if box:
        w, h = box[2] - box[0], box[3] - box[1]
        if w >= 60 and h >= 60 and w * h <= 0.92 * im.width * im.height:
            pad = round(max(w, h) * 0.03)
            im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
    im.save(f, quality=90); it['hero'] = [im.width, im.height]; it['trimmed'] = True; n += 1
json.dump(c, open(f'{pub}/catalog.json', 'w'), ensure_ascii=False); print('trimmed', n)
