"""Validate actual GLB payloads and make a single delivery contact sheet."""
from pathlib import Path
import json,struct,io,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(__file__).resolve().parent
TYPES={5126:('<f4',4),5125:('<u4',4),5123:('<u2',2),5121:('<u1',1)}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def parse(path):
    b=path.read_bytes();magic,version,n=struct.unpack_from('<4sII',b);assert (magic,version,n)==(b'glTF',2,len(b))
    ln,tag=struct.unpack_from('<II',b,12);assert tag==0x4e4f534a
    d=json.loads(b[20:20+ln]);off=20+ln;bl,bt=struct.unpack_from('<II',b,off);assert bt==0x004e4942
    raw=b[off+8:off+8+bl]
    def acc(ix):
        a=d['accessors'][ix];v=d['bufferViews'][a['bufferView']];dt,sz=TYPES[a['componentType']];num=WIDTH[a['type']]
        start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',sz*num)
        return np.ndarray((a['count'],num),dtype=dt,buffer=raw,offset=start,strides=(stride,sz)).copy()
    return d,raw,acc
def transform(n):
    if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
    x,y,z,w=n.get('rotation',[0,0,0,1]);r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
    m=np.eye(4);m[:3,:3]=r@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
report=[]
paths=sorted(ROOT.glob('*/spec.json'));assert len(paths)==39,len(paths)
for sp in paths:
    s=json.loads(sp.read_text(encoding='utf-8'));folder=sp.parent;name=s['asset'];d,raw,acc=parse(folder/(name+'.glb'))
    assert len(d['materials'])<=3 and len(d.get('skins',[]))==0,name
    for m in d['materials']:
        p=m['pbrMetallicRoughness'];assert 'baseColorTexture' in p and 'metallicRoughnessTexture' in p and 'normalTexture' in m,name
    sizes=[]
    for im in d['images']:
        assert 'uri' not in im and 'bufferView' in im,name
        v=d['bufferViews'][im['bufferView']];off=v.get('byteOffset',0);img=Image.open(io.BytesIO(raw[off:off+v['byteLength']]))
        assert max(img.size)<=1024;sizes.append(list(img.size))
    tris=0;verts=[]
    def walk(i,parent):
        nonlocal_placeholder=None
        node=d['nodes'][i];world=parent@transform(node)
        if 'mesh' in node:
            for p in d['meshes'][node['mesh']]['primitives']:
                pos=acc(p['attributes']['POSITION']);norm=acc(p['attributes']['NORMAL']);uv=acc(p['attributes']['TEXCOORD_0'])
                assert np.isfinite(pos).all() and np.isfinite(norm).all() and np.isfinite(uv).all()
                verts.append((world@np.c_[pos,np.ones(len(pos))].T).T[:,:3])
        for c in node.get('children',[]):walk(c,world)
    for m in d['meshes']:
        for p in m['primitives']:
            assert p.get('mode',4)==4
            idx=acc(p['indices']);tris+=len(idx)//3;assert idx.max()<len(acc(p['attributes']['POSITION']))
    for i in d['scenes'][d.get('scene',0)]['nodes']:walk(i,np.eye(4))
    points=np.concatenate(verts);low=points.min(0);high=points.max(0)
    assert tris==s['polygon_count'] and tris<=s['polygon_limit'],(name,tris)
    if s['type']=='weapon':assert abs(high[1]-low[1]-s['target_length'])<1e-4,(name,high-low)
    else:assert abs(low[1])<1e-4,(name,low)
    expected={a['name']:a for a in s['animations']};actual={a['name']:a for a in d.get('animations',[])}
    assert set(expected)==set(actual),(name,set(expected),set(actual))
    for aname,expect in expected.items():
        a=actual[aname]
        for channel in a['channels']:
            sampler=a['samplers'][channel['sampler']];ts=acc(sampler['input']).ravel();v=acc(sampler['output'])
            assert abs((ts[-1]-ts[0])-(expect['frames']-1)/30)<1e-4
            if expect['loop']:
                if channel['target']['path']=='rotation':assert abs(abs(np.dot(v[0],v[-1]))-1)<1e-4
                else:assert np.allclose(v[0],v[-1],atol=1e-5)
    for view in ['front','34']:
        im=Image.open(folder/f'preview_{view}.png');assert im.size==(512,512) and im.mode=='RGBA'
        alpha=im.getchannel('A');assert alpha.getextrema()==(0,255)
        bbox=alpha.getbbox();assert bbox and bbox[0]>0 and bbox[1]>0 and bbox[2]<512 and bbox[3]<512,(name,bbox)
    report.append({'asset':name,'triangles':tris,'materials':len(d['materials']),'image_sizes':sizes,'bounds_y_up_m':[low.tolist(),high.tolist()],'animation_names':list(actual),'bytes':(folder/(name+'.glb')).stat().st_size})
(OUT/'validation.json').write_text(json.dumps({'passed':len(report),'checks':['GLB structure and embedded textures','PBR texture bindings','triangle limits and indices','Y-up dimensions and origins','named animation durations and closed loop endpoints','512px RGBA previews with unclipped silhouette'],'assets':report},indent=2))
w,h=290,200;cols=5;rows=math.ceil(len(report)/cols)
sheet=Image.new('RGB',(cols*w,rows*h+60),'#151923');draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
draw.text((18,18),'WEAPON KKANG / PBR GLB DELIVERY / FRONT + 3-4',font=font,fill='#e8c990')
for i,a in enumerate(report):
    x=i%cols*w;y=60+i//cols*h
    draw.rounded_rectangle((x+3,y+3,x+w-3,y+h-3),radius=8,fill='#242b39')
    for j,v in enumerate(['front','34']):
        im=Image.open(ROOT/a['asset']/f'preview_{v}.png');im.thumbnail((142,165));sheet.paste(im,(x+j*145+(145-im.width)//2,y+4),im)
    draw.text((x+9,y+169),a['asset']+' / '+str(a['triangles'])+' tris',font=font,fill='#e4d5b5')
sheet.save(OUT/'delivery-contact-sheet.jpg',quality=93)
print('PASS',len(report),'assets; weapon maximum',max(a['triangles'] for a in report if '-t' in a['asset']),'triangles')
