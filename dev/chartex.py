"""캐릭터 텍스처(diffuse/normal/specular)를 웹용 jpg로 바꾸고 json에 연결"""
import sys, json, glob, os
from PIL import Image, ImageOps
texdir, outdir, name = sys.argv[1], sys.argv[2], sys.argv[3]
find = lambda k: (glob.glob(os.path.join(texdir, f'*{k}*')) or [None])[0]
d, n, s = find('diffuse'), find('normal'), find('specular')
if d: Image.open(d).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(f'{outdir}/{name}_d.jpg', quality=86, optimize=True)
if n: Image.open(n).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(f'{outdir}/{name}_n.jpg', quality=90, optimize=True)
if s: ImageOps.invert(Image.open(s).convert('L').resize((512, 512), Image.LANCZOS)).save(f'{outdir}/{name}_r.jpg', quality=85)
j = json.load(open(f'{outdir}/{name}.json'))
for m in j['meshes']: m.update(tex=f'{name}_d.jpg' if d else None, nor=f'{name}_n.jpg' if n else None, rgh=f'{name}_r.jpg' if s else None, rou=.6, met=.3)
json.dump(j, open(f'{outdir}/{name}.json', 'w'))
print('ok', name, bool(d), bool(n), bool(s))
