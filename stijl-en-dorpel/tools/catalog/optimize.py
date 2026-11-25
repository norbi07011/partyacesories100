"""Keep the photo set light: room scenes are capped at 1400 px wide. usage: optimize.py public/fabriek"""
import sys, json, os
from PIL import Image
pub = sys.argv[1]; c = json.load(open(f'{pub}/catalog.json')); n = 0
for it in c:
    f = f"{pub}/../{it['dir']}/scene.jpg"
    if not it.get('scene') or not os.path.exists(f): continue
    im = Image.open(f)
    if im.width > 1400 or os.path.getsize(f) > 330_000:
        if im.width > 1400: im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
        im.convert('RGB').save(f, quality=80, optimize=True); it['scene'] = [im.width, im.height]; n += 1
json.dump(c, open(f'{pub}/catalog.json', 'w'), ensure_ascii=False); print('optimised', n)
