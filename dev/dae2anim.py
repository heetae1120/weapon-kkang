"""Mixamo 애니메이션 .dae(스킨 없음) 여러 개 -> anims.json
각 뼈의 로컬 회전(쿼터니언)과 Hips 이동을 프레임별로 저장한다."""
import sys, re, json, zipfile, io
import numpy as np
import xml.etree.ElementTree as ET
KEEP = ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand',
        'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase']
def q_from_m(m):
    m = m[:3, :3] / np.linalg.norm(m[:3, :3], axis=0)
    t = m[0,0]+m[1,1]+m[2,2]
    if t > 0:
        s = .5/np.sqrt(t+1); w=.25/s; x=(m[2,1]-m[1,2])*s; y=(m[0,2]-m[2,0])*s; z=(m[1,0]-m[0,1])*s
    elif m[0,0]>m[1,1] and m[0,0]>m[2,2]:
        s=2*np.sqrt(1+m[0,0]-m[1,1]-m[2,2]); w=(m[2,1]-m[1,2])/s; x=.25*s; y=(m[0,1]+m[1,0])/s; z=(m[0,2]+m[2,0])/s
    elif m[1,1]>m[2,2]:
        s=2*np.sqrt(1+m[1,1]-m[0,0]-m[2,2]); w=(m[0,2]-m[2,0])/s; x=(m[0,1]+m[1,0])/s; y=.25*s; z=(m[1,2]+m[2,1])/s
    else:
        s=2*np.sqrt(1+m[2,2]-m[0,0]-m[1,1]); w=(m[1,0]-m[0,1])/s; x=(m[0,2]+m[2,0])/s; y=(m[1,2]+m[2,1])/s; z=.25*s
    return [x,y,z,w]
def read_dae(data):
    root = ET.fromstring(data)
    for el in root.iter(): el.tag = el.tag.split('}')[-1]
    ids = {el.get('id'): el for el in root.iter() if el.get('id')}
    out = {}; n = 0
    for an in root.iter('animation'):
        ch = an.find('channel')
        if ch is None: continue
        tgt = ch.get('target'); bone = re.sub(r'^mixamorig\d*[:_]', '', tgt.split('/')[0])
        smp = ids[ch.get('source').lstrip('#')]
        outp = None; inp_ = None
        for i in smp.findall('input'):
            s = ids[i.get('source').lstrip('#')].find('float_array')
            if i.get('semantic') == 'OUTPUT': outp = np.array([float(v) for v in s.text.split()]).reshape(-1, 4, 4)
            if i.get('semantic') == 'INPUT': inp_ = np.array([float(v) for v in s.text.split()])
        if outp is None: continue
        out[bone] = (inp_, outp); n = max(n, len(outp))
    return out, n
def main(outpath, height_cm_ref, *items):
    # items: name=path_to_zip_or_dae
    clips = {}
    for it in items:
        name, path = it.split('=', 1)
        if path.endswith('.zip'):
            z = zipfile.ZipFile(path); dn = [f for f in z.namelist() if f.endswith('.dae')][0]; data = z.read(dn)
        else: data = open(path, 'rb').read()
        tracks, n = read_dae(data)
        c = {'n': n, 'fps': 30, 'q': {}, 'hips': []}
        for b in KEEP:
            if b not in tracks: continue
            _, M = tracks[b]
            qs = [q_from_m(m) for m in M]
            # 부호 연속성
            for k in range(1, len(qs)):
                if np.dot(qs[k], qs[k-1]) < 0: qs[k] = [-v for v in qs[k]]
            c['q'][b] = [round(v, 4) for q in qs for v in q]
            if b == 'Hips': c['hips'] = [round(float(v), 3) for m in M for v in m[:3, 3]]
        clips[name] = c
        print(name, n, len(c['q']))
    json.dump({'clips': clips}, open(outpath, 'w'), separators=(',', ':'))
if __name__ == '__main__': main(sys.argv[1], 0, *sys.argv[2:])
