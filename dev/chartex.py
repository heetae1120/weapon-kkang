"""캐릭터 텍스처(diffuse/normal/specular)를 웹용 jpg로 바꾸고 메쉬별로 json에 연결.
dae2wk.py 직후 실행(메쉬 tex에 원본 diffuse 파일명이 들어있어야 함)."""
import sys, json, glob, os, re
from PIL import Image, ImageOps
texdir, outdir, name = sys.argv[1], sys.argv[2], sys.argv[3]
files = sorted(os.listdir(texdir))
low = {f.lower(): f for f in files}
def kind(f, k): return k in f.lower()
def partner(dfile, k):
    stem = re.sub(r'diffuse.*$', '', dfile.lower())
    c = [f for f in files if f.lower().startswith(stem) and kind(f, k)]
    if c: return c[0]
    isk = lambda f: kind(f, k) or (k == 'normal' and re.search(r'nm\.', f.lower()))
    tok = dfile.lower().split('_')[0]
    c = [f for f in files if isk(f) and f.lower().split('_')[0] == tok] or [f for f in files if isk(f)]
    return c[0] if len(c) == 1 else (c[0] if c and k == 'normal' else None)
j = json.load(open(f'{outdir}/{name}.json'))
done = {}
def conv(src, kind_, tag):
    if src is None: return None
    if src in done: return done[src]
    out = f'{name}_{tag}.jpg'
    im = Image.open(os.path.join(texdir, src))
    if kind_ == 'd':
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (60, 50, 45, 255)); bg.alpha_composite(im); im = bg
        im.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(f'{outdir}/{out}', quality=86, optimize=True)
    elif kind_ == 'n':
        im.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(f'{outdir}/{out}', quality=90, optimize=True)
    else:
        g = im.convert('L').resize((512, 512), Image.LANCZOS)
        if 'gloss' not in src.lower(): g = ImageOps.invert(g)
        g = ImageOps.invert(g) if 'gloss' in src.lower() else g
        g.save(f'{outdir}/{out}', quality=85)
    done[src] = out; return out
diffs = [f for f in files if kind(f, 'diffuse')]
idx = {}
for m in j['meshes']:
    src = m.get('tex')
    if src and src.lower() in low: src = low[src.lower()]
    elif diffs: src = diffs[0]
    else: src = None
    if src and src not in idx: idx[src] = len(idx)
    i = idx.get(src, 0); suf = '' if i == 0 else str(i)
    if src and 'eyelash' in src.lower():
        m.update(skip=True)
    m['tex'] = conv(src, 'd', 'd' + suf)
    m['nor'] = conv(partner(src, 'normal'), 'n', 'n' + suf) if src else None
    sp = partner(src, 'specular') or partner(src, 'gloss') if src else None
    m['rgh'] = conv(sp, 'r', 'r' + suf)
    m['rou'] = .6; m['met'] = .25
j['meshes'] = [m for m in j['meshes'] if not m.get('skip')]
json.dump(j, open(f'{outdir}/{name}.json', 'w'))
print('ok', name, [(m['tex'], m['nor'], m['rgh'], m.get('skip')) for m in j['meshes']])
