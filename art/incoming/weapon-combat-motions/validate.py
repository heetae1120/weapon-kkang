"""Validate exported bytes, not the authoring scene. Python 3 + numpy + Pillow."""
import json,struct,io
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent
def read(path):
    raw=path.read_bytes();magic,version,length=struct.unpack_from('<4sII',raw)
    assert magic==b'glTF' and version==2 and length==len(raw)
    n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:]
    def acc(i):
        a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
        assert 'byteStride' not in v
        return np.frombuffer(blob,dtype=dt,count=a['count']*size,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,size)
    return g,blob,acc
def main():
    result=[]
    for folder in sorted(ROOT.glob('*-combat')):
        spec=json.loads((folder/'spec.json').read_text(encoding='utf8'));g,blob,acc=read(folder/(folder.name+'.glb'))
        tris=sum(len(acc(p['indices']))//3 for m in g['meshes'] for p in m['primitives'])
        assert tris==spec['polygon_count'] and tris<30000
        assert len(g['materials'])<=3
        assert set(spec['bones'])=={g['nodes'][i]['name'] for i in g['skins'][0]['joints']}
        assert len(g['skins'][0]['joints'])==22
        for im in g['images']:
            assert 'uri' not in im;v=g['bufferViews'][im['bufferView']];png=blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
            assert max(Image.open(io.BytesIO(png)).size)<=1024
        for m in g['materials']:
            assert 'baseColorTexture' in m['pbrMetallicRoughness'] and 'metallicRoughnessTexture' in m['pbrMetallicRoughness'] and 'normalTexture' in m
        for mesh in g['meshes']:
            for prim in mesh['primitives']:
                weights=acc(prim['attributes']['WEIGHTS_0']);assert np.max(np.count_nonzero(weights,axis=1))<=4
                assert np.max(np.abs(weights.sum(axis=1)-1))<1e-5
        info={c['name']:c for c in spec['animations']};assert len(g['animations'])==5 and set(info)=={a['name'] for a in g['animations']}
        for a in g['animations']:
            c=info[a['name']]
            for ch in a['channels']:
                s=a['samplers'][ch['sampler']];times=acc(s['input']).ravel();values=acc(s['output'])
                assert np.isfinite(values).all()
                assert abs(times[-1]-(c['frames']-1)/30)<1e-5
                assert abs(times[0])<1e-5
                # Every attack returns to ready, and idle loops without a discontinuity.
                assert np.max(abs(values[-1]-values[0]))<1e-5
                if g['nodes'][ch['target']['node']]['name']=='mixamorig:Hips' and ch['target']['path']=='translation':
                    assert np.max(np.ptp(values[:,[0,2]],axis=0))<1e-5
            if not c['loop']:assert 1<c['impact_frame']<c['frames']
        for c in spec['qa']:assert c['max_reach_excess_m']<.00001 and c['analytic_grip_error_m']<.00001
        for image in ['preview_front.png','preview_34.png']:assert Image.open(folder/image).size==(512,512)
        result.append(dict(asset=folder.name,triangles=tris,clips=5,embedded_images=len(g['images']),bytes=(folder/(folder.name+'.glb')).stat().st_size,passed=True))
    assert len(result)==7
    (ROOT/'validation.json').write_text(json.dumps(result,indent=2))
    canvas=Image.new('RGB',(1536,7*288),'#152238');draw=ImageDraw.Draw(canvas)
    for row,folder in enumerate(sorted(ROOT.glob('*-combat'))):
        files=[folder/'preview_front.png',folder/'preview_34.png']+sorted(folder.glob('*_impact.png'))
        for col,f in enumerate(files):
            canvas.paste(Image.open(f).convert('RGB').resize((256,256)),(col*256,row*288))
            draw.text((col*256+5,row*288+259),f.stem if col>1 else folder.name+'/'+f.stem,fill='white')
    canvas.save(ROOT/'contact-sheet.jpg',quality=90)
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
