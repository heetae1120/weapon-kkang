"""Codex(Astra) 납품 GLB -> 무기 깡! 엔진 메쉬 포맷.

39개 GLB가 똑같은 텍스처 4장을 각자 품고 있어 99MB가 된다. 텍스처는 한 번만 빼서 공유하고,
GLB에서는 지오메트리만 가져온다(노드 변환은 정점에 구워 넣고, 애니메이션 피벗만 따로 둔다).

출력: public/assets/pack/<이름>.json + <이름>_m.wasm, 공유 텍스처 pack/tex_*.jpg
사용: python3 dev/glb2wk.py art/incoming public/assets/pack
"""
import json, struct, sys, os, io
import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def qm(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return [aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz]
def qmat(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]], float)

class GLB:
    def __init__(s, path):
        b = open(path, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]
        s.J = json.loads(b[20:20+L]); o = 20+L; L2 = struct.unpack('<I', b[o:o+4])[0]; s.bin = b[o+8:o+8+L2]
        s.par = {}
        for i, n in enumerate(s.J['nodes']):
            for c in n.get('children', []): s.par[c] = i
    def acc(s, i):
        a = s.J['accessors'][i]; n = NC[a['type']]; dt = CT[a['componentType']]
        if 'bufferView' not in a: return np.zeros((a['count'], n), np.float64)
        bv = s.J['bufferViews'][a['bufferView']]; off = bv.get('byteOffset', 0)+a.get('byteOffset', 0)
        stride = bv.get('byteStride')
        if stride and stride != n*np.dtype(dt).itemsize:
            raw = np.frombuffer(s.bin, np.uint8, a['count']*stride, off).reshape(a['count'], stride)
            arr = np.zeros((a['count'], n), dt)
            for k in range(a['count']): arr[k] = np.frombuffer(raw[k, :n*np.dtype(dt).itemsize].tobytes(), dt)
        else:
            arr = np.frombuffer(s.bin, dt, a['count']*n, off).reshape(a['count'], n)
        return arr.astype(np.float64)
    def img(s, i):
        im = s.J['images'][i]; bv = s.J['bufferViews'][im['bufferView']]
        o = bv.get('byteOffset', 0); return s.bin[o:o+bv['byteLength']]
    def world(s, i):
        """노드의 월드 변환 (피벗 노드는 제외하고 계산할 수 있게 stop 지원)"""
        M = np.eye(4)
        chain = []
        k = i
        while k is not None:
            chain.append(k); k = s.par.get(k)
        for k in reversed(chain):
            n = s.J['nodes'][k]; L = np.eye(4)
            if 'matrix' in n: L = np.array(n['matrix'], float).reshape(4, 4).T
            else:
                R = qmat(n.get('rotation', [0, 0, 0, 1])); S = np.diag(n.get('scale', [1, 1, 1]))
                L[:3, :3] = R@S; L[:3, 3] = n.get('translation', [0, 0, 0])
            M = M@L
        return M

def collect(g, nodes, rel=None):
    """노드들의 메쉬를 월드(또는 rel 기준)로 구워 하나의 지오메트리로"""
    P, N, U, I = [], [], [], []
    base = 0
    inv = np.linalg.inv(rel) if rel is not None else None
    for ni in nodes:
        n = g.J['nodes'][ni]
        if 'mesh' not in n: continue
        M = g.world(ni)
        if inv is not None: M = inv@M
        nm = np.linalg.inv(M[:3, :3]).T
        for pr in g.J['meshes'][n['mesh']]['primitives']:
            at = pr['attributes']
            p = g.acc(at['POSITION']); nr = g.acc(at['NORMAL']) if 'NORMAL' in at else np.zeros_like(p)
            u = g.acc(at['TEXCOORD_0']) if 'TEXCOORD_0' in at else np.zeros((len(p), 2))
            u = u.copy(); u[:, 1] = 1.0 - u[:, 1]  # glTF는 UV 원점이 좌상단, 엔진 텍스처는 FLIP_Y로 올라가므로 V를 뒤집는다
            idx = g.acc(pr['indices']).astype(np.int64).ravel()
            p = (M[:3, :3]@p.T).T + M[:3, 3]
            nr = (nm@nr.T).T
            ln = np.linalg.norm(nr, axis=1, keepdims=True); nr = nr/np.where(ln < 1e-9, 1, ln)
            P.append(p); N.append(nr); U.append(u); I.append(idx+base); base += len(p)
    if not P: return None
    return (np.concatenate(P), np.concatenate(N), np.concatenate(U), np.concatenate(I))

def sample_rot(g, anim, node):
    for ch in anim['channels']:
        if ch['target']['node'] == node and ch['target']['path'] == 'rotation':
            sm = anim['samplers'][ch['sampler']]
            t = g.acc(sm['input'])[:, 0]; v = g.acc(sm['output'])
            if sm.get('interpolation') == 'CUBICSPLINE': v = v[1::3]
            return t, v
    return None, None

def convert(src, out, name):
    g = GLB(os.path.join(src, name, name+'.glb'))
    J = g.J
    # 애니메이션 피벗 찾기
    pivots = {}
    for a in J.get('animations', []):
        for ch in a['channels']:
            pivots.setdefault(ch['target']['node'], a)
    groups = []  # (nodes, pivotTRS, animTrack)
    pivot_sub = set()
    for pi, anim in pivots.items():
        sub = []
        stack = [pi]
        while stack:
            k = stack.pop(); sub.append(k); stack += J['nodes'][k].get('children', [])
        pivot_sub |= set(sub)
        t, v = sample_rot(g, anim, pi)
        pw = g.world(pi)
        groups.append((sub, pw, {'name': anim['name'], 'fps': 30,
                                 'q': [[round(float(x), 5) for x in r] for r in v] if v is not None else [],
                                 'loop': 'idle' in anim['name']}))
    static = [i for i in range(len(J['nodes'])) if i not in pivot_sub and 'mesh' in J['nodes'][i]]
    parts, P, N, U, I = [], [], [], [], []
    vbase = ibase = 0
    def add(geo, pivot, anim):
        nonlocal vbase, ibase
        p, n, u, i = geo
        P.append(p); N.append(n); U.append(u); I.append(i+vbase)
        parts.append({'start': ibase, 'count': len(i),
                      'pivot': [round(float(x), 5) for x in pivot[:3, 3]] if pivot is not None else None,
                      'anim': anim})
        vbase += len(p); ibase += len(i)
    gs = collect(g, static)
    if gs: add(gs, None, None)
    for sub, pw, anim in groups:
        geo = collect(g, sub, rel=pw)
        if geo: add(geo, pw, anim)
    P = np.concatenate(P); N = np.concatenate(N); U = np.concatenate(U); I = np.concatenate(I)
    mat = J['materials'][0] if J.get('materials') else {}
    pbr = mat.get('pbrMetallicRoughness', {})
    meta = {'n': int(len(P)), 'ni': int(len(I)), 'parts': parts,
            'mat': {'col': pbr.get('baseColorFactor', [1, 1, 1, 1])[:3],
                    'met': pbr.get('metallicFactor', 1), 'rou': pbr.get('roughnessFactor', 1),
                    'emi': mat.get('emissiveFactor', [0, 0, 0])},
            'bounds': [[round(float(x), 4) for x in P.min(0)], [round(float(x), 4) for x in P.max(0)]]}
    os.makedirs(out, exist_ok=True)
    buf = (P.astype(np.float32).tobytes() + N.astype(np.float32).tobytes()
           + U.astype(np.float32).tobytes() + I.astype(np.uint32).tobytes())
    open(os.path.join(out, name+'_m.wasm'), 'wb').write(buf)
    json.dump(meta, open(os.path.join(out, name+'.json'), 'w'), separators=(',', ':'))
    return meta, g

def main(src, out):
    names = sorted(d for d in os.listdir(src) if os.path.isdir(os.path.join(src, d))
                   and os.path.exists(os.path.join(src, d, d+'.glb')))
    os.makedirs(out, exist_ok=True)
    tex_done = False
    tot = 0
    for nm in names:
        meta, g = convert(src, out, nm)
        tot += os.path.getsize(os.path.join(out, nm+'_m.wasm'))
        print('%-16s tri=%5d parts=%d anim=%s' % (nm, meta['ni']//3, len(meta['parts']),
              ','.join(p['anim']['name'] for p in meta['parts'] if p['anim']) or '-'))
        if not tex_done:
            from PIL import Image
            for i, im in enumerate(g.J.get('images', [])):
                tn = im.get('name', 'tex%d' % i)
                img = Image.open(io.BytesIO(g.img(i)))
                if tn == 'basecolor':
                    img.convert('RGB').save(os.path.join(out, 'tex_basecolor.jpg'), quality=88, optimize=True)
                elif tn == 'normal':
                    img.convert('RGB').save(os.path.join(out, 'tex_normal.jpg'), quality=92, optimize=True)
                elif tn == 'orm':
                    img.convert('RGB').save(os.path.join(out, 'tex_orm.jpg'), quality=88, optimize=True)
                elif tn == 'emissive':
                    img.convert('RGB').save(os.path.join(out, 'tex_emissive.jpg'), quality=88, optimize=True)
            tex_done = True
    print('geometry total %.2f MB' % (tot/1048576))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
