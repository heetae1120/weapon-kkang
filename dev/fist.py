"""캐릭터 손을 '쥔 손'으로 굽힌다 (손가락 뼈가 손 뼈에 합쳐져 있어 정점을 직접 굽힘).
손 뼈 좌표계: +Y 손가락 방향, +Z 손바닥 쪽 (Mixamo 공통).
결과: *_bin.wasm 정점/법선 수정 + json에 grip(손 뼈 기준 쥔 구멍 위치, 반지름, 엄지 쪽 부호) 기록.
한 번만 적용된다 (json에 grip이 있으면 건너뜀).  사용: python3 dev/fist.py public/assets paladin guard ...
"""
import sys, json, os
import numpy as np

KNUCKLE = .55   # 손 길이 중 손가락이 시작되는 비율
WRAP = 4.0      # 손가락 끝까지 감기는 각도(라디안)

def load(d, name):
    J = json.load(open(os.path.join(d, name + '.json')))
    buf = bytearray(open(os.path.join(d, name + '_bin.wasm'), 'rb').read())
    n = J['n']; o = 0; v = {}
    for k, cnt, dt in [('P', 3, np.float32), ('N', 3, np.float32), ('U', 2, np.float32), ('J', 4, np.uint8), ('W', 4, np.float32)]:
        sz = n * cnt * np.dtype(dt).itemsize
        v[k] = (o, np.frombuffer(bytes(buf[o:o + sz]), dt).reshape(n, cnt).copy()); o += sz
    return J, buf, v

def main(d, names):
    for name in names:
        J, buf, v = load(d, name)
        if 'grip' in J: print(name, '이미 적용됨'); continue
        P, N, Jt, Wt = v['P'][1].astype(np.float64), v['N'][1].astype(np.float64), v['J'][1], v['W'][1]
        bn = [b['name'] for b in J['bones']]; grip = {}
        for side in ('Right', 'Left'):
            hi = bn.index(side + 'Hand')
            inv = np.array(J['bones'][hi]['invBind'], np.float64).reshape(4, 4).T; bind = np.linalg.inv(inv)
            w = np.where(Jt == hi, Wt, 0).sum(1); idx = np.where(w > 0)[0]
            Q = (inv @ np.c_[P[idx], np.ones(len(idx))].T).T[:, :3]
            strong = w[idx] > .5
            ymax = np.percentile(Q[strong, 1], 98); k = KNUCKLE * ymax
            fin = strong & (Q[:, 1] > k)
            zc = float(np.median(Q[fin, 2])); xm = float(np.median(Q[fin, 0]))
            R = (ymax - k) / WRAP
            # 엄지 쪽: 손바닥 구역에서 손가락 폭 밖으로 더 튀어나온 x 방향
            th = 1 if side == 'Right' else -1  # 엄지 쪽 x 부호 (Mixamo 리그 공통)
            # 굽히기
            s = Q[:, 1] - k; m = s > 0
            zr = Q[:, 2] - zc; r = R - zr
            th_ = np.minimum(s / R, WRAP + .3); extra = np.maximum(0, s - R * (WRAP + .3))
            ny = k + r * np.sin(th_) + extra * np.cos(th_); nz = zc + R - r * np.cos(th_) + extra * np.sin(th_)
            Q2 = Q.copy(); Q2[m, 1] = ny[m]; Q2[m, 2] = nz[m]
            Pw = (bind @ np.c_[Q2, np.ones(len(idx))].T).T[:, :3]
            ww = w[idx][:, None]
            P[idx] = np.where(m[:, None], P[idx] + ww * (Pw - P[idx]), P[idx])
            # 법선: 손 좌표로 옮겨 X축 회전
            Nl = (inv[:3, :3] @ N[idx].T).T
            c, sn = np.cos(th_), np.sin(th_)
            Nr = Nl.copy(); Nr[:, 1] = Nl[:, 1] * c - Nl[:, 2] * sn; Nr[:, 2] = Nl[:, 1] * sn + Nl[:, 2] * c
            Nw = (bind[:3, :3] @ Nr.T).T; Nw /= np.linalg.norm(Nw, axis=1, keepdims=True) + 1e-12
            Nb = N[idx] + ww * (Nw - N[idx]); Nb /= np.linalg.norm(Nb, axis=1, keepdims=True) + 1e-12
            N[idx] = np.where(m[:, None], Nb, N[idx])
            grip[side[0]] = {'p': [round(xm, 4), round(k + R * .15, 4), round(zc + R, 4)], 'r': round(R, 4), 'th': th}
            print(name, side, 'k=%.3f R=%.3f zc=%.3f thumb=%+d' % (k, R, zc, th))
        o = v['P'][0]; buf[o:o + P.size * 4] = P.astype(np.float32).tobytes()
        o = v['N'][0]; buf[o:o + N.size * 4] = N.astype(np.float32).tobytes()
        J['grip'] = grip
        open(os.path.join(d, name + '_bin.wasm'), 'wb').write(buf)
        json.dump(J, open(os.path.join(d, name + '.json'), 'w'), separators=(',', ':'))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
