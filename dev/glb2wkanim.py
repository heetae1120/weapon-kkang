"""Codex 납품 무기 전투 모션 GLB(mixamo 리그) -> 무기 깡! 모션 파일.

ual2anim.py와 같은 방식: 뼈마다 '바인드(T자) 자세 기준 월드 회전 변화량'을 저장한다.
게임(045-duel.js worldPose)은 캐릭터 자신의 바인드 회전에 이 변화량을 곱해 자세를 만들기 때문에
체형이 다른 캐릭터에도 그대로 붙는다. GLB의 로컬 쿼터니언을 그대로 쓰지 않는다.

ual2anim.py와 다른 점은 기준 자세를 얻는 방법 하나뿐이다. UAL은 T자 클립에서 가장 팔이
수평인 프레임을 골랐지만, 이 납품물은 skin의 inverseBindMatrices에 T자 바인드가 들어 있어
그것을 그대로 역행렬로 풀어 쓴다(근사 없음).

미리보기용 메시(WK_TrainingMannequin, DEMO_*_remove_when_retargeting)는 읽지 않는다.
spec.json의 타격 프레임·이벤트·공격 추첨 가중치는 런타임 메타로 같이 담는다.

사용: python3 dev/glb2wkanim.py <납품폴더> <출력폴더>
  예: python3 dev/glb2wkanim.py art/incoming/weapon-combat-motions public/assets
"""
import sys, os, json, struct
import numpy as np

# mixamorig: 접두사를 떼면 게임 뼈 이름과 같다.
BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
         'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
         'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
         'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
         'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']
FPS = 30
WEAPONS = ['sword', 'dagger', 'spear', 'axe', 'saber', 'shinai', 'scythe']

# ---------- 쿼터니언 (x,y,z,w) ----------
def qmul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0); bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx,
                     aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz], -1)
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
        s = .5 / np.sqrt(t + 1)
        return np.array([(m[2, 1]-m[1, 2])*s, (m[0, 2]-m[2, 0])*s, (m[1, 0]-m[0, 1])*s, .25/s])
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
        s.J = json.loads(b[20:20+L]); o = 20 + L
        L2 = struct.unpack('<I', b[o:o+4])[0]; s.bin = b[o+8:o+8+L2]
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
        R = np.array([n.get('rotation', [0, 0, 0, 1]) for n in s.nodes], float)
        T = np.array([n.get('translation', [0, 0, 0]) for n in s.nodes], float)
        S = np.array([n.get('scale', [1, 1, 1]) for n in s.nodes], float)
        return R, T, S
    def bind(s):
        """skin의 inverseBindMatrices를 뒤집어 바인드(T자) 월드 회전·위치를 얻는다."""
        sk = s.J['skins'][0]
        M = s.acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)  # 열우선 -> 행렬
        R, T = {}, {}
        for j, m in zip(sk['joints'], M):
            B = np.linalg.inv(m); nm = s.nodes[j].get('name', '').split(':')[-1]
            R[nm] = qfrom_m(B[:3, :3]); T[nm] = B[:3, 3]
        return R, T
    def sample(s, name):
        a = s.anims[name]; R0, T0, S0 = s.rest(); tr = {}; tmax = 0
        for ch in a['channels']:
            sm = a['samplers'][ch['sampler']]
            t = s.acc(sm['input'])[:, 0]; v = s.acc(sm['output'])
            tr[(ch['target']['node'], ch['target']['path'])] = (t, v, sm.get('interpolation', 'LINEAR'))
            tmax = max(tmax, t[-1])
        ts = np.arange(0, tmax + 1e-6, 1 / FPS); F = len(ts); N = len(s.nodes)
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
        F, N = R.shape[:2]
        GR = np.zeros((F, N, 4)); GT = np.zeros((F, N, 3)); GS = np.ones((F, N, 3))
        order = []; seen = set()
        def visit(i):
            if i in seen: return
            if i in s.parent: visit(s.parent[i])
            seen.add(i); order.append(i)
        for i in range(N): visit(i)
        for i in order:
            if i in s.parent:
                p = s.parent[i]
                GR[:, i] = qmul(GR[:, p], R[:, i])
                GT[:, i] = GT[:, p] + qrot(GR[:, p], T[:, i] * GS[:, p])
                GS[:, i] = GS[:, p] * Sc[:, i]
            else:
                GR[:, i] = R[:, i]; GT[:, i] = T[:, i]; GS[:, i] = Sc[:, i]
        return GR, GT

def convert(folder, wtype, outdir):
    glb = os.path.join(folder, '%s-combat' % wtype, '%s-combat.glb' % wtype)
    spec = json.load(open(os.path.join(folder, '%s-combat' % wtype, 'spec.json')))
    g = GLB(glb)
    refR, refT = g.bind()
    miss = [b for b in BONES if b not in refR or ('mixamorig:' + b) not in g.byname]
    if miss: raise SystemExit('%s: 뼈 없음 %s' % (wtype, miss))
    # 바인드 자세에서 정면/왼쪽을 읽어 게임 좌표(+Z 정면, 캐릭터 왼쪽 +X)로 맞추는 회전 C
    fwd = refT['LeftToeBase'] - refT['LeftFoot']; fwd[1] = 0; fwd /= np.linalg.norm(fwd)
    left = refT['LeftArm'] - refT['RightArm']; left[1] = 0; left /= np.linalg.norm(left)
    up = np.cross(fwd, left); up /= np.linalg.norm(up)
    C = qfrom_m(np.stack([left, up, fwd], 1).T)
    hip_h = refT['Hips'][1]
    clips, meta_anims = {}, []
    for A in spec['animations']:
        name = A['name']
        R, T, S, F = g.sample(name)
        GR, GT = g.world(R, T, S)
        loop = bool(A.get('loop'))
        c = {'n': F, 'fps': FPS, 'loop': loop, 'd': {}, 'hips': []}
        for bn in BONES:
            ni = g.byname['mixamorig:' + bn]
            D = qmul(GR[:, ni], qinv(refR[bn][None]))        # 원본 월드에서의 변화량
            D = qmul(qmul(C[None], D), qinv(C)[None])         # 게임 좌표로
            for k in range(1, F):                             # 부호 뒤집힘 제거(보간용)
                if np.dot(D[k], D[k-1]) < 0: D[k] = -D[k]
            c['d'][bn] = [round(float(v), 4) for v in D.reshape(-1)]
        hp = GT[:, g.byname['mixamorig:Hips']] - refT['Hips'][None] * np.array([1, 0, 1])
        hp = qrot(np.tile(C, (F, 1)), hp) / hip_h             # 엉덩이 높이 = 1 단위
        c['hips'] = [round(float(v), 4) for v in hp.reshape(-1)]
        clips[name] = c
        m = {'clip': name, 'n': F, 'dur': round((F - 1) / FPS, 4), 'loop': loop}
        if A.get('impact_frame'):
            m['imp'] = round((A['impact_frame'] - 1) / FPS, 4)   # Blender 1-based -> 초
        ev = [e for e in A.get('events', []) if e.get('type') != 'impact']
        if ev:
            # 전투 판정은 그대로 두고, 연출 루트 이동량 같은 이벤트 메타데이터만 전달한다.
            m['fx'] = []
            for e in ev:
                fx = {'t': round((e['frame'] - 1) / FPS, 4), 'type': e['type']}
                if e.get('forward_m') is not None:
                    fx['forward_m'] = round(float(e['forward_m']), 3)
                if e.get('duration_frames') is not None:
                    fx['dur'] = round(float(e['duration_frames']) / FPS, 4)
                m['fx'].append(fx)
        meta_anims.append(m)
        print('  %-28s %3d프레임 %.2f초%s' % (name, F, (F - 1) / FPS, ' 타격 %.3fs' % m['imp'] if 'imp' in m else ''))
    pool = [{'clip': p['clip'], 'w': p['weight']} for p in spec['attack_pool']]
    idle = next(a['clip'] for a in meta_anims if a['loop'])
    meta = {'idle': idle, 'pool': pool, 'anims': meta_anims,
            'two': bool(spec.get('two_handed')),
            'leftM': spec['grip'].get('left_distance_along_blade_m'),
            'repeat': not spec.get('random_selection', {}).get('avoid_immediate_repeat', True)}
    out = os.path.join(outdir, 'wm_%s_anim.json' % wtype)
    json.dump({'v': 2, 'world': True, 'clips': clips, 'meta': meta}, open(out, 'w'), separators=(',', ':'))
    print('  -> %s (%.0fKB) C=%s' % (out, os.path.getsize(out) / 1024, np.round(C, 3)))
    return meta

def main(folder, outdir):
    os.makedirs(outdir, exist_ok=True)
    # 무기별 파일 하나씩만 쓴다. 런타임은 결투에 쓰는 무기 종류의 파일만 받아가므로 따로 목록 파일을 두지 않는다.
    for w in WEAPONS:
        print(w)
        convert(folder, w, outdir)
    print('무기 %d종 변환 완료' % len(WEAPONS))

if __name__ == '__main__':
    main(*sys.argv[1:])
