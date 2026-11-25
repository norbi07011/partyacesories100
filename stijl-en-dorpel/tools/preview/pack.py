"""Bundle the catalogue photos of a preview build into a few pack files (see src/packs.ts).
usage: pack.py <preview-dir>"""
import sys, os, json, glob, shutil
root = sys.argv[1]; fab = f'{root}/fabriek'
LIMIT = 1_400_000
order = []
for it in json.load(open(f'{fab}/catalog.json')):
    order += sorted(glob.glob(f"{root}/{it['dir']}/*.webp"))
seen = set(order)
order += [f for f in sorted(glob.glob(f'{fab}/**/*.webp', recursive=True)) if f not in seen and '/packs/' not in f]
shutil.rmtree(f'{fab}/packs', ignore_errors=True); os.makedirs(f'{fab}/packs')
index = {}; n = 0; buf = bytearray()
def flush():
    global n, buf
    if buf: open(f'{fab}/packs/p{n}.jpg', 'wb').write(buf); n += 1; buf = bytearray()
done = set()
for f in order:
    if f in done: continue
    done.add(f); data = open(f, 'rb').read()
    if buf and len(buf) + len(data) > LIMIT: flush()
    index[os.path.relpath(f, root)] = [n, len(buf), len(data)]; buf += data
flush()
json.dump(index, open(f'{fab}/packs/index.json', 'w'), separators=(',', ':'))
for d in os.listdir(fab):
    if d not in ('packs', 'catalog.json'): shutil.rmtree(f'{fab}/{d}')
print(len(index), 'photos in', n, 'packs')
