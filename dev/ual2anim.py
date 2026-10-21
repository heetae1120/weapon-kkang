"""Quaternius Universal Animation Library(CC0, UE 마네킹 리그) GLB -> 무기 깡! 모션 파일.
캐릭터마다 뼈 방향이 조금씩 달라도 맞게 붙도록, 각 뼈의 '월드 회전 변화량'(T자 자세 기준)을 저장한다.
게임에서는 캐릭터의 T자 자세(바인드)에 이 변화량을 곱해 자세를 만든다.

사용: python3 dev/ual2anim.py out.json UAL1.glb UAL2.glb 이름=클립[@시작초:끝초][*속도] ...
"""
import sys, json, struct
import numpy as np

MAP = {'pelvis': 'Hips', 'spine_01': 'Spine', 'spine_02': 'Spine1', 'spine_03': 'Spine2', 'neck_01': 'Neck', 'Head': 'Head',
       'clavicle_l': 'LeftShoulder', 'upperarm_l': 'LeftArm', 'lowerarm_l': 'LeftForeArm', 'hand_l': 'LeftHand',
       'clavicle_r': 'RightShoulder', 'upperarm_r': 'RightArm', 'lowerarm_r': 'RightForeArm', 'hand_r': 'RightHand',
       'thigh_l': 'LeftUpLeg', 'calf_l': 'LeftLeg', 'foot_l': 'LeftFoot', 'ball_l': 'LeftToeBase',
       'thigh_r': 'RightUpLeg', 'calf_r': 'RightLeg', 'foot_r': 'RightFoot', 'ball_r': 'RightToeBase'}
FPS = 30

# ---------- 쿼터니언 (x,y,z,w) ----------
def qmul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0); bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz], -1)
def qinv(a): return a * np.array([-1, -1, -1, 1.])
def qrot(q, v):
    u = q[..., :3]; w = q[..., 3:4]
    return v + 2 * np.cross(u, np.cross(u, v) + w * v)
def qslerp(a, b, t):
    d = np.sum(a * b, -1, keepdims=True); b = np.where(d < 0, -b, b); d = np.abs(d)
    th = np.arccos(np.clip(d, -1, 1)); s = np.sin(th)
    lin = a + (b - a) * t
    out = np.where(s > 1e-6, (np.sin((1 - t) * th) * a + np.sin(t * th) * b) / np.where(s > 1e-6, s, 1), lin)
    return out / np.linalg.norm(out, axis=-1, keepdims=True)
def qfrom_m(m):
    m = m / np.linalg.norm(m, axis=0)
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = .5 / np.sqrt(t + 1); return np.array([(m[2, 1]-m[1, 2])*s, (m[0, 2]-m[2, 0])*s, (m[1, 0]-m[0, 1])*s, .25/s])
    i = int(np.argmax([m[0, 0], m[1, 1], m[2, 2]])); j, k = (i+1) % 3, (i+2) % 3
    s = 2 * np.sqrt(1 + m[i, i] - m[j, j] - m[k, k]); q = np.zeros(4)
    q[i] = .25 * s; q[j] = (m[j, i] + m[i, j]) / s; q[k] = (m[k, i] + m[i, k]) / s; q[3] = (m[k, j] - m[j, k]) / s
    return q

# ---------- GLB ----------
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
class GLB:
    def __init__(s, path):
        b = open(path, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]
        s.J = json.loads(b[20:20+L]); o = 20 + L; L2 = struct.unpack('<I', b[o:o+4])[0]; s.bin = b[o+8:o+8+L2]
        s.nodes = s.J['nodes']; s.parent = {}
        for i, n in enumerate(s.nodes):
            for c in n.get('children', []): s.parent[c] = i
        s.byname = {n.get('name'): i for i, n in enumerate(s.nodes)}
        s.anims = {a['name']: a for a in s.J['animations']}
    def acc(s, i):
        a = s.J['accessors'][i]; bv = s.J['bufferViews'][a['bufferView']]; n = NC[a['type']]
        dt = CT[a['componentType']]; off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        arr = np.frombuffer(s.bin, dt, a['count'] * n, off).reshape(a['count'], n).astype(np.float64)
        if a.get('normalized'): arr /= np.iinfo(dt).max
        return arr
    def rest(s):
        R = np.array([s.nodes[i].get('rotation', [0, 0, 0, 1]) for i in range(len(s.nodes))], float)
        T = np.array([s.nodes[i].get('translation', [0, 0, 0]) for i in range(len(s.nodes))], float)
        S = np.array([s.nodes[i].get('scale', [1, 1, 1]) for i in range(len(s.nodes))], float)
        return R, T, S
    def sample(s, name, t0=None, t1=None):
        a = s.anims[name]; R0, T0, S0 = s.rest(); tr = {}
        tmax = 0
        for ch in a['channels']:
            sm = a['samplers'][ch['sampler']]; t = s.acc(sm['input'])[:, 0]; v = s.acc(sm['output'])
            tr[(ch['target']['node'], ch['target']['path'])] = (t, v, sm.get('interpolation', 'LINEAR')); tmax = max(tmax, t[-1])
        t0 = 0 if t0 is None else t0; t1 = tmax if t1 is None else min(t1, tmax)
        ts = np.arange(t0, t1 + 1e-6, 1 / FPS); F = len(ts); N = len(s.nodes)
        R = np.tile(R0, (F, 1, 1)); T = np.tile(T0, (F, 1, 1)); Sc = np.tile(S0, (F, 1, 1))
        for (ni, path), (t, v, ip) in tr.items():
            if ip == 'CUBICSPLINE': v = v[1::3]
            k = np.clip(np.searchsorted(t, ts) - 1, 0, len(t) - 1); k2 = np.minimum(k + 1, len(t) - 1)
            f = np.where(k2 > k, (ts - t[k]) / np.maximum(t[k2] - t[k], 1e-9), 0)[:, None]
            if ip == 'STEP': f = f * 0
            if path == 'rotation': R[:, ni] = qslerp(v[k], v[k2], f)
            elif path == 'translation': T[:, ni] = v[k] + (v[k2] - v[k]) * f
            elif path == 'scale': Sc[:, ni] = v[k] + (v[k2] - v[k]) * f
        return R, T, Sc, F
    def world(s, R, T, Sc):
        F, N = R.shape[:2]; GR = np.zeros((F, N, 4)); GT = np.zeros((F, N, 3)); GS = np.ones((F, N, 3))
        order = []; seen = set()
        def visit(i):
            if i in seen: return
            if i in s.parent: visit(s.parent[i])
            seen.add(i); order.append(i)
        for i in range(N): visit(i)
        for i in order:
            if i in s.parent:
                p = s.parent[i]
                GR[:, i] = qmul(GR[:, p], R[:, i]); GT[:, i] = GT[:, p] + qrot(GR[:, p], T[:, i] * GS[:, p]); GS[:, i] = GS[:, p] * Sc[:, i]
            else:
                GR[:, i] = R[:, i]; GT[:, i] = T[:, i]; GS[:, i] = Sc[:, i]
        return GR, GT

def main(out, *args):
    glbs = [GLB(a) for a in args if a.endswith('.glb')]; items = [a for a in args if not a.endswith('.glb')]
    G0 = glbs[0]
    # 기준 T자 자세: A_TPose의 'T' 쪽 끝 프레임 (양팔이 가장 수평인 프레임을 고름)
    R, T, S, F = G0.sample('A_TPose'); GR, GT = G0.world(R, T, S)
    ua, la = G0.byname['upperarm_l'], G0.byname['lowerarm_l']
    armdir = GT[:, la] - GT[:, ua]; flat = np.abs(armdir[:, 1]) / np.linalg.norm(armdir, axis=1)
    fT = int(np.argmin(flat)); print('T자 프레임', fT, '/', F, '팔 기울기 %.3f' % flat[fT])
    refR = {MAP[n]: GR[fT, G0.byname[n]] for n in MAP}; refT = {MAP[n]: GT[fT, G0.byname[n]] for n in MAP}
    # 정면 방향(발끝 쪽)과 좌우 확인 → 게임 좌표(+Z 정면, 캐릭터 왼쪽 = +X)로 맞추는 회전 C
    fwd = refT['LeftToeBase'] - refT['LeftFoot']; fwd[1] = 0; fwd /= np.linalg.norm(fwd)
    left = refT['LeftArm'] - refT['RightArm']; left[1] = 0; left /= np.linalg.norm(left)
    up = np.cross(fwd, left)  # 오른손 좌표면 +Y
    M = np.stack([left, np.cross(fwd, left) / np.linalg.norm(np.cross(fwd, left)), fwd], 1)  # 열: 원본에서의 X,Y,Z
    C = qfrom_m(M.T)  # 원본 → 게임
    print('정면', np.round(fwd, 3), '왼쪽', np.round(left, 3), 'up', np.round(up, 3), 'C', np.round(C, 3))
    hip_h = refT['Hips'][1]
    clips = {}
    for it in items:
        name, spec = it.split('=', 1); rate = 1.0; t0 = t1 = None; loop = False
        if spec.endswith('~'): loop = True; spec = spec[:-1]
        if '*' in spec: spec, r = spec.split('*'); rate = float(r)
        if '@' in spec: spec, rg = spec.split('@'); a, b = rg.split(':'); t0 = float(a) if a else None; t1 = float(b) if b else None
        g = next(x for x in glbs if spec in x.anims)
        R, T, S, F = g.sample(spec, t0, t1)
        if rate != 1.0:  # 재생 속도 바꿔 다시 샘플
            idx = np.arange(0, F - 1 + 1e-6, rate); i0 = np.floor(idx).astype(int); i1 = np.minimum(i0 + 1, F - 1); f = (idx - i0)[:, None, None]
            R = qslerp(R[i0], R[i1], f); T = T[i0] + (T[i1] - T[i0]) * f; S = S[i0] + (S[i1] - S[i0]) * f; F = len(idx)
        GR, GT = g.world(R, T, S)
        c = {'n': F, 'fps': FPS, 'loop': loop, 'd': {}, 'hips': []}
        for src, dst in MAP.items():
            ni = g.byname[src]
            D = qmul(GR[:, ni], qinv(refR[dst][None]))       # 원본 월드에서의 변화량
            D = qmul(qmul(C[None], D), qinv(C)[None])           # 게임 좌표로
            for k in range(1, F):
                if np.dot(D[k], D[k-1]) < 0: D[k] = -D[k]
            c['d'][dst] = [round(float(v), 4) for v in D.reshape(-1)]
        hp = GT[:, g.byname['pelvis']] - refT['Hips'][None] * np.array([1, 0, 1])  # 수평은 기준 대비, 높이는 절대
        hp = qrot(np.tile(C, (F, 1)), hp) / hip_h  # 엉덩이 높이 = 1 단위
        c['hips'] = [round(float(v), 4) for v in hp.reshape(-1)]
        clips[name] = c; print('%-10s %-24s %3d프레임 %.2f초' % (name, spec, F, F / FPS))
    json.dump({'v': 2, 'world': True, 'clips': clips}, open(out, 'w'), separators=(',', ':'))

if __name__ == '__main__':
    main(*sys.argv[1:])
