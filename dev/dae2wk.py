"""Mixamo Collada(.dae) -> 무기 깡! 캐릭터 포맷 (smith.json + smith.bin + 텍스처)
손가락 등 잔뼈는 가까운 주요 뼈로 합쳐서 뼈 수를 30개 이하로 줄인다(모바일 유니폼 한도).
"""
import sys, re, json, struct, os
import numpy as np
import xml.etree.ElementTree as ET

KEEP = ['Hips','Spine','Spine1','Spine2','Neck','Head',
        'LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand',
        'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase']

def strip(t): return t.split('}')[-1]
def floats(s): return np.array([float(x) for x in s.split()], np.float64)
def ints(s): return np.array([int(x) for x in s.split()], np.int64)

def main(dae, outdir, height=1.72, name='smith'):
    tree = ET.parse(dae); root = tree.getroot()
    for el in root.iter(): el.tag = strip(el.tag)
    ids = {el.get('id'): el for el in root.iter() if el.get('id')}
    def src(id_):
        s = ids[id_.lstrip('#')]
        fa = s.find('float_array'); na = s.find('Name_array')
        acc = s.find('technique_common/accessor'); stride = int(acc.get('stride', 1))
        if fa is not None: return floats(fa.text).reshape(-1, stride)
        return na.text.split()
    # 노드 트리
    vs = root.find('library_visual_scenes/visual_scene')
    nodes = {}  # sid/name -> (parent, matrix)
    order = []
    def walk(n, parent, pw):
        m = n.find('matrix')
        M = floats(m.text).reshape(4, 4) if m is not None else np.eye(4)
        for tr in n.findall('translate'):
            v = floats(tr.text); T = np.eye(4); T[:3, 3] = v; M = M @ T
        W = pw @ M
        name = n.get('sid') or n.get('name') or n.get('id')
        if n.get('type') == 'JOINT':
            nm = re.sub(r'^mixamorig\d*[:_]', '', name)
            nodes[nm] = dict(parent=parent, local=M, world=W, raw=name)
            order.append(nm); parent_next = nm
        else: parent_next = parent
        for c in n.findall('node'): walk(c, parent_next, W)
        n.set('_world', json.dumps(W.tolist()))
    for n in vs.findall('node'): walk(n, None, np.eye(4))
    # 유지 뼈 매핑
    def keep_of(nm):
        while nm is not None and nm not in KEEP: nm = nodes[nm]['parent']
        return nm or 'Hips'
    # 바인드 자세(INV_BIND 역행렬)로 뼈 월드 덮어쓰기 (애니메이션 포함 내보내기 대비)
    for ic in root.iter('instance_controller'):
        skin = ids[ic.get('url').lstrip('#')].find('skin')
        bsm0 = floats(skin.find('bind_shape_matrix').text).reshape(4, 4)
        jn = ib = None
        for inp in skin.find('joints').findall('input'):
            if inp.get('semantic') == 'JOINT': jn = src(inp.get('source'))
            if inp.get('semantic') == 'INV_BIND_MATRIX': ib = src(inp.get('source'))
        for k, j in enumerate(jn):
            nm = re.sub(r'^mixamorig\d*[:_]', '', j)
            if nm in nodes: nodes[nm]['world'] = np.linalg.inv(ib[k].reshape(4, 4))
        bones = [b for b in KEEP if b in nodes]
    bidx = {b: i for i, b in enumerate(bones)}
    # 컨트롤러별 메쉬
    out_meshes = []; allP = []; allN = []; allU = []; allJ = []; allW = []; allI = []
    textures = {}
    def material_tex(symbol_target):
        try:
            mat = ids[symbol_target.lstrip('#')]
            eff = ids[mat.find('instance_effect').get('url').lstrip('#')]
            tex = eff.find('.//diffuse/texture')
            if tex is None:
                col = eff.find('.//diffuse/color'); return None, [float(x) for x in col.text.split()][:3] if col is not None else [.7,.7,.7]
            samp = tex.get('texture')
            # sampler -> surface -> image
            prof = eff.find('profile_COMMON')
            img_id = None
            for np_ in prof.findall('newparam'):
                if np_.get('sid') == samp:
                    s2 = np_.find('sampler2D/source');
                    if s2 is not None:
                        for np2 in prof.findall('newparam'):
                            if np2.get('sid') == s2.text: img_id = np2.find('surface/init_from').text
                    else:
                        img_id = np_.find('sampler2D/instance_image').get('url').lstrip('#')
            if img_id is None: img_id = samp
            img = ids[img_id]; path = img.find('init_from').text
            path = path.replace('file:///', '').replace('file://', '')
            return os.path.basename(path), [1, 1, 1]
        except Exception as e:
            return None, [.7, .7, .7]
    for ic in root.iter('instance_controller'):
        ctrl = ids[ic.get('url').lstrip('#')]; skin = ctrl.find('skin')
        geo = ids[skin.get('source').lstrip('#')]
        bsm = floats(skin.find('bind_shape_matrix').text).reshape(4, 4)
        jsrc = None; ibsrc = None
        for inp in skin.find('joints').findall('input'):
            if inp.get('semantic') == 'JOINT': jsrc = src(inp.get('source'))
            if inp.get('semantic') == 'INV_BIND_MATRIX': ibsrc = src(inp.get('source'))
        jnames = [re.sub(r'^mixamorig\d*[:_]', '', j) for j in jsrc]
        vw = skin.find('vertex_weights'); wsrc = None; joff = woff = 0
        for inp in vw.findall('input'):
            if inp.get('semantic') == 'JOINT': joff = int(inp.get('offset'))
            if inp.get('semantic') == 'WEIGHT': wsrc = src(inp.get('source')).ravel(); woff = int(inp.get('offset'))
        vcount = ints(vw.find('vcount').text); v = ints(vw.find('v').text); stride = len(vw.findall('input'))
        nv = len(vcount); VJ = np.zeros((nv, 4), np.int64); VW = np.zeros((nv, 4))
        p = 0
        for i in range(nv):
            acc = {}
            for k in range(vcount[i]):
                j = v[p + joff]; w = wsrc[v[p + woff]]; p += stride
                kb = bidx[keep_of(jnames[j])] if jnames[j] in nodes else 0
                acc[kb] = acc.get(kb, 0) + w
            top = sorted(acc.items(), key=lambda x: -x[1])[:4]; s = sum(w for _, w in top) or 1
            for k, (b, w) in enumerate(top): VJ[i, k] = b; VW[i, k] = w / s
        mesh = geo.find('mesh')
        verts = mesh.find('vertices'); pos_src = None
        for inp in verts.findall('input'):
            if inp.get('semantic') == 'POSITION': pos_src = src(inp.get('source'))
        bmat = {}
        bm = ic.find('bind_material')
        if bm is not None:
            for im in bm.iter('instance_material'): bmat[im.get('symbol')] = im.get('target')
        for prim in list(mesh.findall('triangles')) + list(mesh.findall('polylist')):
            inputs = prim.findall('input'); st = max(int(i.get('offset')) for i in inputs) + 1
            P = ints(prim.find('p').text).reshape(-1, st)
            if prim.tag == 'polylist':
                vc = ints(prim.find('vcount').text); tris = []; o = 0
                for c in vc:
                    for k in range(1, c - 1): tris += [o, o + k, o + k + 1]
                    o += c
                P = P[tris]
            offs = {}; srcs = {}
            for i in inputs:
                sem = i.get('semantic')
                if sem in offs and sem == 'TEXCOORD': continue
                offs[sem] = int(i.get('offset')); srcs[sem] = i.get('source')
            vi = P[:, offs['VERTEX']]
            pos = pos_src[vi]
            pos = (bsm @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
            nrm = src(srcs['NORMAL'])[P[:, offs['NORMAL']]] if 'NORMAL' in offs else np.zeros_like(pos)
            nrm = (bsm[:3, :3] @ nrm.T).T
            uv = src(srcs['TEXCOORD'])[P[:, offs['TEXCOORD']]][:, :2] if 'TEXCOORD' in offs else np.zeros((len(pos), 2))
            tex, col = material_tex(bmat.get(prim.get('material'), '#none'))
            base = sum(len(x) for x in allP)
            allP.append(pos); allN.append(nrm); allU.append(uv); allJ.append(VJ[vi]); allW.append(VW[vi])
            out_meshes.append(dict(tex=tex, col=col, start=int(base), count=int(len(pos))))
    P = np.concatenate(allP); N = np.concatenate(allN); U = np.concatenate(allU); J = np.concatenate(allJ); W = np.concatenate(allW)
    # 크기 맞추기 (발바닥 0, 키 height)
    lo, hi = P.min(0), P.max(0); sc = height / (hi[1] - lo[1]); off = -lo[1]
    def S(M):  # 스케일 적용한 변환
        M = M.copy(); M[:3, 3] = (M[:3, 3] + np.array([0, off, 0]) * 0 ) ; return M
    P = (P - np.array([0, lo[1], 0])) * sc
    out_bones = []
    for b in bones:
        nd = nodes[b]; par = nd['parent']
        while par is not None and par not in KEEP: par = nodes[par]['parent']
        Wd = nd['world'].copy(); Wd[:3, 3] = (Wd[:3, 3] - np.array([0, lo[1], 0])) * sc
        out_bones.append(dict(name=b, parent=bidx[par] if par in bidx else -1, world=Wd.T.ravel().tolist()))
    # 로컬 = inv(부모월드) * 월드  (유지 뼈 기준으로 재계산)
    for ob in out_bones:
        Wd = np.array(ob['world']).reshape(4, 4).T
        if ob['parent'] >= 0:
            Pw = np.array(out_bones[ob['parent']]['world']).reshape(4, 4).T; L = np.linalg.inv(Pw) @ Wd
        else: L = Wd
        ob['local'] = L.T.ravel().tolist(); ob['invBind'] = np.linalg.inv(Wd).T.ravel().tolist()
    N = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    # 중복 정점 합치기 -> 인덱스 버퍼
    key = np.c_[np.round(P, 5), np.round(N, 3), np.round(U, 5), J, np.round(W, 4)]
    uniq, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.ravel()
    P, N, U, J, W = uniq[:, 0:3], uniq[:, 3:6], uniq[:, 6:8], uniq[:, 8:12].astype(np.int64), uniq[:, 12:16]
    IDX = inv.astype('<u4')
    os.makedirs(outdir, exist_ok=True)
    buf = b''.join([P.astype('<f4').tobytes(), N.astype('<f4').tobytes(), U.astype('<f4').tobytes(), J.astype('<u1').tobytes(), W.astype('<f4').tobytes(), IDX.tobytes()])
    open(os.path.join(outdir, name+'_bin.wasm'), 'wb').write(buf)
    json.dump(dict(sc=float(sc), loy=float(lo[1]), n=int(len(P)), ni=int(len(IDX)), bones=out_bones, meshes=out_meshes), open(os.path.join(outdir, name+'.json'), 'w'))
    print('verts', len(P), 'bones', len(bones), 'meshes', [(m['tex'], m['count']) for m in out_meshes])

if __name__ == '__main__': main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv)>3 else 1.72, sys.argv[4] if len(sys.argv)>4 else 'smith')
