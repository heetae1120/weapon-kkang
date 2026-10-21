// 무기 깡! 서버 API — Cloudflare Pages Functions + D1 (바인딩 이름: DB)
// 모든 /api/* 요청을 이 파일 하나가 처리합니다.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players(
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    state TEXT NOT NULL DEFAULT '{}',
    weapon TEXT NOT NULL DEFAULT '{}',
    lv INTEGER NOT NULL DEFAULT 0,
    earn INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    best INTEGER NOT NULL DEFAULT 0,
    hid INTEGER NOT NULL DEFAULT 0,
    seen INTEGER NOT NULL DEFAULT 0,
    last_duel INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL,
    updated INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS players_lv ON players(lv)`,
  `CREATE INDEX IF NOT EXISTS players_earn ON players(earn)`,
  `CREATE TABLE IF NOT EXISTS duels(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    a TEXT NOT NULL,
    b TEXT NOT NULL,
    a_won INTEGER NOT NULL,
    gold INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS duels_b ON duels(b, at)`,
  // 실시간 PvP: 대기열과 진행 중인 대결
  `CREATE TABLE IF NOT EXISTS pvp_queue(pid TEXT PRIMARY KEY, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS pvp(
    id TEXT PRIMARY KEY, a TEXT NOT NULL, b TEXT NOT NULL, ainfo TEXT NOT NULL, binfo TEXT NOT NULL,
    seed INTEGER NOT NULL, qlv INTEGER NOT NULL, rnd INTEGER NOT NULL DEFAULT 1,
    sa INTEGER NOT NULL DEFAULT 0, sb INTEGER NOT NULL DEFAULT 0,
    ar INTEGER NOT NULL DEFAULT 0, br INTEGER NOT NULL DEFAULT 0, start INTEGER NOT NULL DEFAULT 0,
    ams INTEGER NOT NULL DEFAULT -2, bms INTEGER NOT NULL DEFAULT -2, ap INTEGER NOT NULL DEFAULT 0, bp INTEGER NOT NULL DEFAULT 0,
    aseen INTEGER NOT NULL, bseen INTEGER NOT NULL, hist TEXT NOT NULL DEFAULT '[]',
    done INTEGER NOT NULL DEFAULT 0, winner TEXT, gold INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS pvp_a ON pvp(a, done)`,
  `CREATE INDEX IF NOT EXISTS pvp_b ON pvp(b, done)`
];

// 나중에 추가한 열: 보유 중인 최고 무기(랭킹 기준)
const ADD_COLS = [
  `ALTER TABLE players ADD COLUMN top INTEGER NOT NULL DEFAULT -1`,
  `ALTER TABLE players ADD COLUMN toph INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN topw TEXT NOT NULL DEFAULT '{}'`
];
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  for (const q of ADD_COLS) { try { await db.prepare(q).run(); } catch (e) { /* 이미 있음 */ } }
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS players_top ON players(top, toph, earn)`).run(); } catch (e) {}
  // 예전 계정: 저장된 보관함에서 최고 무기를 계산해 채움 (한 번만)
  const { results } = await db.prepare(`SELECT id, state FROM players WHERE top<0 LIMIT 500`).all();
  if (results && results.length) {
    await db.batch(results.map(r => { const t = topOf((safeParse(r.state).inv) || []); return db.prepare(`UPDATE players SET top=?, toph=?, topw=? WHERE id=?`).bind(t.lv, t.h, JSON.stringify(t.w), r.id); }));
  }
  schemaReady = true;
}
const isHid = t => t === 'saber' || t === 'shinai' || t === 'scythe';
// 보유 무기 중 최고: 강화 단계 → 히든 우선
function topOf(inv) {
  let best = null;
  for (const w0 of inv || []) { const w = cleanWeapon(w0); if (!best || w.lv > best.lv || (w.lv === best.lv && isHid(w.type) && !isHid(best.type))) best = w; }
  best = best || { type: null, el: null, lv: 0 };
  return { lv: best.lv, h: isHid(best.type) ? 1 : 0, w: best };
}

const TYPES = ['sword', 'dagger', 'spear', 'axe', 'saber', 'shinai', 'scythe', null];
const ELS = ['fire', 'ice', 'thunder', 'dark', 'holy', null];
const purse = (lv, hidden) => Math.round(300 * Math.pow(1.33, lv) / 10) * 10 * (hidden ? 1.5 : 1);
const now = () => Date.now();
const DUEL_COOLDOWN = 2500;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
const fail = (status, error, message) => json({ error, message }, status);

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function newToken() {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return [...b].map(x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('').replace(/(.{6})(?!$)/g, '$1-');
}
const normToken = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{6})(?!$)/g, '$1-');

function cleanName(n) {
  const s = String(n || '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯]/g, '').trim();
  if (s.length < 2 || s.length > 12) return null;
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(s)) return null;
  return s;
}

function cleanWeapon(w) {
  if (!w || typeof w !== 'object') return { type: null, el: null, lv: 0 };
  const type = TYPES.includes(w.type) ? w.type : null;
  const hidden = type === 'saber' || type === 'shinai' || type === 'scythe';
  const el = !type || hidden ? null : (ELS.includes(w.el) && w.el ? w.el : 'fire');
  const lv = Math.max(0, Math.min(20, Math.floor(Number(w.lv) || 0)));
  return { type: type, el, lv: type || lv === 0 ? lv : 0 };
}

const CHAR_IDS = ['paladin', 'smith', 'guard', 'orc', 'erika', 'ninja', 'kachujin'];
const AURA_RE = /^(flame|frost|storm|shadow|holy|sakura|galaxy|rainbow):[1-4]$/;
const cleanAura = k => (typeof k === 'string' && AURA_RE.test(k) ? k : null);
function cleanAuras(a) {
  const o = {};
  if (a && typeof a === 'object') for (const [k, v] of Object.entries(a).slice(0, 40)) { if (AURA_RE.test(k)) { const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0))); if (n) o[k] = n; } }
  return o;
}
function cleanState(st) {
  if (!st || typeof st !== 'object') return null;
  const inv = Array.isArray(st.inv) ? st.inv.slice(0, 100).map(w => ({
    id: String(w && w.id || '').slice(0, 24) || Math.random().toString(36).slice(2, 10),
    ...cleanWeapon(w),
    fz: Math.max(0, Math.min(10, Math.floor(Number(w && w.fz) || 0)))
  })) : [];
  if (!inv.length) inv.push({ id: 'w0', type: null, el: null, lv: 0, fz: 0 });
  const cur = inv.some(w => w.id === st.cur) ? st.cur : inv[0].id;
  const log = Array.isArray(st.log) ? st.log.slice(0, 30).map(l => ({
    txt: String(l && l.txt || '').slice(0, 80), kind: String(l && l.kind || '').slice(0, 10), lab: String(l && l.lab || '').slice(0, 10)
  })) : [];
  const codex = st.codex && typeof st.codex === 'object' ? { type: String(st.codex.type || 'sword').slice(0, 10), el: String(st.codex.el || 'fire').slice(0, 10) } : { type: 'sword', el: 'fire' };
  return {
    inv, cur, log, codex,
    char: CHAR_IDS.includes(st.char) ? st.char : 'paladin',
    muted: !!st.muted,
    boxes: Math.max(0, Math.floor(Number(st.boxes) || 0)),
    hidCount: Math.max(0, Math.floor(Number(st.hidCount) || 0)),
    auras: cleanAuras(st.auras),
    aura: cleanAura(st.aura),
    auraBoxes: Math.max(0, Math.floor(Number(st.auraBoxes) || 0))
  };
}

async function auth(request, db) {
  const h = request.headers.get('authorization') || '';
  const tok = normToken(h.replace(/^Bearer\s+/i, ''));
  if (tok.length < 10) return null;
  return await db.prepare('SELECT * FROM players WHERE token_hash=?').bind(await sha256(tok)).first();
}

function publicProfile(p) {
  return { id: p.id, name: p.name, earn: p.earn, wins: p.wins, losses: p.losses, best: p.best, hid: p.hid };
}

async function meResponse(db, p, extra = {}) {
  let state = {};
  try { state = JSON.parse(p.state || '{}'); } catch (e) { state = {}; }
  const since = p.seen || 0;
  const { results } = await db.prepare(
    `SELECT d.at, d.a_won, d.gold, pa.name AS attacker FROM duels d LEFT JOIN players pa ON pa.id=d.a
     WHERE d.b=? AND d.at>? ORDER BY d.at DESC LIMIT 30`
  ).bind(p.id, since).all();
  await db.prepare('UPDATE players SET seen=? WHERE id=?').bind(now(), p.id).run();
  return json({ ...publicProfile(p), state, defenses: results || [], ...extra });
}

async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

export async function onRequest(ctx) {
  const { request, env, params } = ctx;
  const db = env.DB;
  if (!db) return fail(500, 'no_db', '서버에 데이터베이스(DB)가 연결되지 않았습니다.');
  await ensureSchema(db);
  const path = '/' + [].concat(params.path || []).join('/');
  const m = request.method;

  try {
    if (path === '/health') return json({ ok: true, time: now() });

    if (path === '/register' && m === 'POST') {
      const body = await readJson(request);
      const name = cleanName(body && body.name);
      if (!name) return fail(400, 'bad_name', '닉네임은 2~12자의 한글, 영문, 숫자로 정해 주세요.');
      const taken = await db.prepare('SELECT 1 FROM players WHERE name=?').bind(name).first();
      if (taken) return fail(409, 'name_taken', '이미 쓰는 닉네임이에요. 다른 이름을 골라 주세요.');
      const id = crypto.randomUUID();
      const token = newToken();
      const t = now();
      const state = cleanState(body && body.state) || cleanState({});
      const cur = state.inv.find(w => w.id === state.cur) || state.inv[0];
      const best = Math.max(0, ...state.inv.map(w => w.lv)), top = topOf(state.inv);
      await db.prepare(
        `INSERT INTO players(id,token_hash,name,state,weapon,lv,best,hid,seen,created,updated,top,toph,topw) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, await sha256(token), name, JSON.stringify(state), JSON.stringify({ ...cleanWeapon(cur), ch: state.char, au: state.aura }), cur.lv, best, state.hidCount, t, t, t, top.lv, top.h, JSON.stringify(top.w)).run();
      const p = await db.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
      return meResponse(db, p, { token });
    }

    if (path === '/login' && m === 'POST') {
      const body = await readJson(request);
      const tok = normToken(body && body.code);
      const p = tok.length >= 10 ? await db.prepare('SELECT * FROM players WHERE token_hash=?').bind(await sha256(tok)).first() : null;
      if (!p) return fail(404, 'bad_code', '이동 코드가 맞지 않아요. 다시 확인해 주세요.');
      return meResponse(db, p, { token: tok });
    }

    if (path === '/rank' && m === 'GET') {
      const me = await auth(request, db);
      const { results } = await db.prepare(
        `SELECT id,name,earn,wins,losses,best,lv,weapon,top,toph,topw FROM players ORDER BY top DESC, toph DESC, earn DESC, wins DESC LIMIT 50`
      ).all();
      let myRank = null;
      if (me) {
        const r = await db.prepare('SELECT COUNT(*) AS c FROM players WHERE top>? OR (top=? AND (toph>? OR (toph=? AND earn>?)))').bind(me.top, me.top, me.toph, me.toph, me.earn).first();
        myRank = (r ? r.c : 0) + 1;
      }
      const total = await db.prepare('SELECT COUNT(*) AS c FROM players').first();
      return json({
        players: (results || []).map(r => ({ ...publicProfile(r), lv: r.lv, weapon: safeParse(r.weapon), top: Math.max(0, r.top), topw: safeParse(r.topw), me: !!me && r.id === me.id })),
        myRank, total: total ? total.c : 0
      });
    }

    // 아래부터는 로그인 필요
    const me = await auth(request, db);
    if (!me) return fail(401, 'auth', '다시 접속해 주세요.');

    if (path === '/me' && m === 'GET') return meResponse(db, me);

    if (path.startsWith('/pvp/')) { const r = await pvpRoute(path, m, request, db, me); if (r) return r; }

    if (path === '/save' && m === 'PUT') {
      const body = await readJson(request);
      const state = cleanState(body && body.state);
      if (!state) return fail(400, 'bad_state', '저장할 내용이 올바르지 않습니다.');
      const cur = state.inv.find(w => w.id === state.cur) || state.inv[0];
      const best = Math.max(me.best, ...state.inv.map(w => w.lv));
      const raw = JSON.stringify(state);
      if (raw.length > 60000) return fail(413, 'too_big', '저장 데이터가 너무 큽니다.');
      const top = topOf(state.inv);
      await db.prepare(`UPDATE players SET state=?, weapon=?, lv=?, best=?, hid=?, updated=?, top=?, toph=?, topw=? WHERE id=?`)
        .bind(raw, JSON.stringify({ ...cleanWeapon(cur), ch: state.char, au: state.aura }), cur.lv, best, Math.max(me.hid, state.hidCount), now(), top.lv, top.h, JSON.stringify(top.w), me.id).run();
      return json({ ok: true, best });
    }

    if (path === '/rivals' && m === 'GET') {
      const lo = Math.max(0, me.lv - 3), hi = Math.min(20, me.lv + 5);
      const { results } = await db.prepare(
        `SELECT id,name,weapon,lv,earn,wins,losses FROM players
         WHERE id<>? AND lv BETWEEN ? AND ? AND updated>?
         ORDER BY RANDOM() LIMIT 6`
      ).bind(me.id, lo, hi, now() - 1000 * 60 * 60 * 24 * 30).all();
      return json({
        rivals: (results || []).map(r => {
          const w = safeParse(r.weapon);
          const hidden = w.type === 'saber' || w.type === 'shinai' || w.type === 'scythe';
          return { id: r.id, name: r.name, type: w.type || null, el: w.el || null, lv: r.lv, purse: purse(r.lv, hidden), earn: r.earn, wins: r.wins, losses: r.losses, ch: CHAR_IDS.includes(w.ch) ? w.ch : 'guard', au: cleanAura(w.au), real: true };
        })
      });
    }

    if (path === '/duel' && m === 'POST') {
      const body = await readJson(request);
      const won = !!(body && body.win);
      const t = now();
      if (t - me.last_duel < DUEL_COOLDOWN) return fail(429, 'too_fast', '결투 결과를 너무 빨리 보냈어요.');
      const oppId = String(body && body.opp || '');
      let gold, opp = null;
      if (oppId.startsWith('bot:')) {
        const lv = Math.max(0, Math.min(20, Math.floor(Number(body.oppLv) || 0)));
        gold = purse(lv, !!body.oppHidden);
      } else {
        opp = await db.prepare('SELECT id,name,lv,weapon FROM players WHERE id=?').bind(oppId).first();
        if (!opp || opp.id === me.id) return fail(404, 'no_opp', '상대를 찾을 수 없어요.');
        const w = safeParse(opp.weapon);
        gold = purse(opp.lv, w.type === 'saber' || w.type === 'shinai' || w.type === 'scythe');
      }
      const delta = won ? gold : -gold;
      const stmts = [
        db.prepare(`UPDATE players SET earn=earn+?, wins=wins+?, losses=losses+?, last_duel=? WHERE id=?`)
          .bind(delta, won ? 1 : 0, won ? 0 : 1, t, me.id)
      ];
      if (opp) {
        stmts.push(db.prepare(`UPDATE players SET earn=earn-?, wins=wins+?, losses=losses+? WHERE id=?`)
          .bind(delta, won ? 0 : 1, won ? 1 : 0, opp.id));
        stmts.push(db.prepare(`INSERT INTO duels(at,a,b,a_won,gold) VALUES(?,?,?,?,?)`).bind(t, me.id, opp.id, won ? 1 : 0, gold));
        stmts.push(db.prepare(`DELETE FROM duels WHERE at<?`).bind(t - 1000 * 60 * 60 * 24 * 14));
      }
      await db.batch(stmts);
      const p = await db.prepare('SELECT * FROM players WHERE id=?').bind(me.id).first();
      return json({ ok: true, gold, ...publicProfile(p) });
    }

    return fail(404, 'not_found', '없는 주소입니다.');
  } catch (e) {
    return fail(500, 'server', '서버 오류가 났어요. 잠시 후 다시 시도해 주세요.');
  }
}


/* ---------------- 실시간 PvP ----------------
   대기열에서 두 명을 짝지어 대결을 만들고, 두 클라이언트가 0.5초마다 /pvp/sync로 상태를 주고받는다.
   라운드마다 같은 시드로 같은 단어 순서를 만들고, 서버가 정한 시각에 동시에 시작한다. 먼저 끝낸 쪽(ms가 작은 쪽)이 공격. */
const PVP_START_DELAY = 1800, PVP_GONE = 15000, PVP_QUEUE_TTL = 12000, PVP_ROUND_MAX = 30000;
function pvpInfo(p) { const w = safeParse(p.weapon); return { id: p.id, name: p.name, type: w.type || null, el: w.el || null, lv: p.lv, ch: CHAR_IDS.includes(w.ch) ? w.ch : 'paladin', au: cleanAura(w.au), earn: p.earn, wins: p.wins, losses: p.losses }; }
function pvpView(m, me, t) {
  const side = m.a === me.id ? 'a' : 'b', o = side === 'a' ? 'b' : 'a';
  return {
    id: m.id, side, seed: m.seed, qlv: m.qlv, round: m.rnd, me: safeParse(m[side + 'info']), opp: safeParse(m[o + 'info']),
    my: m['s' + side], their: m['s' + o], hist: safeParse(m.hist).map(x => x === side ? 'p' : x === o ? 'o' : null),
    go: m.start ? m.start - t : null, oppProg: m[o + 'p'], submitted: m[side + 'ms'] !== -2, oppSubmitted: m[o + 'ms'] !== -2,
    done: !!m.done, win: m.done ? m.winner === side : null, gold: m.gold, now: t
  };
}
async function pvpResolve(db, m, t) {
  // 1) 라운드 시간 초과: 안 낸 쪽은 실패(-1)
  if (m.start && t > m.start + PVP_ROUND_MAX) {
    await db.prepare(`UPDATE pvp SET ams=CASE WHEN ams=-2 THEN -1 ELSE ams END, bms=CASE WHEN bms=-2 THEN -1 ELSE bms END WHERE id=? AND rnd=?`).bind(m.id, m.rnd).run();
  }
  // 2) 둘 다 냈으면 판정 (한 번만 적용되도록 rnd 조건)
  await db.prepare(`UPDATE pvp SET
      sa=sa+(CASE WHEN ams>=0 AND (bms<0 OR ams<bms) THEN 1 ELSE 0 END),
      sb=sb+(CASE WHEN bms>=0 AND (ams<0 OR bms<ams) THEN 1 ELSE 0 END),
      hist=json_insert(hist,'$[#]',CASE WHEN ams>=0 AND (bms<0 OR ams<bms) THEN 'a' WHEN bms>=0 AND (ams<0 OR bms<ams) THEN 'b' ELSE NULL END),
      rnd=rnd+1, ams=-2, bms=-2, ar=0, br=0, start=0, ap=0, bp=0
    WHERE id=? AND rnd=? AND ams<>-2 AND bms<>-2 AND done=0`).bind(m.id, m.rnd).run();
  // 3) 상대가 사라졌으면 남은 쪽 승리
  const gone = t - m.aseen > PVP_GONE ? 'b' : t - m.bseen > PVP_GONE ? 'a' : null;
  let fresh = await db.prepare('SELECT * FROM pvp WHERE id=?').bind(m.id).first();
  const w = fresh.sa >= 2 ? 'a' : fresh.sb >= 2 ? 'b' : gone;
  if (w && !fresh.done) await pvpSettle(db, fresh, w, t);
  return await db.prepare('SELECT * FROM pvp WHERE id=?').bind(m.id).first();
}
async function pvpSettle(db, m, w, t) {
  const l = w === 'a' ? 'b' : 'a', li = safeParse(m[l + 'info']);
  const gold = purse(li.lv || 0, isHid(li.type));
  const r = await db.prepare(`UPDATE pvp SET done=1, winner=?, gold=? WHERE id=? AND done=0`).bind(w, gold, m.id).run();
  if (!r.meta || r.meta.changes !== 1) return; // 이미 정산됨
  await db.batch([
    db.prepare(`UPDATE players SET earn=earn+?, wins=wins+1 WHERE id=?`).bind(gold, m[w]),
    db.prepare(`UPDATE players SET earn=earn-?, losses=losses+1 WHERE id=?`).bind(gold, m[l])
  ]);
}
async function pvpRoute(path, m, request, db, me) {
  const t = now();
  const active = await db.prepare(`SELECT * FROM pvp WHERE (a=? OR b=?) AND (done=0 OR created>?) ORDER BY created DESC LIMIT 1`).bind(me.id, me.id, t - 20000).first();
  if (path === '/pvp/join' && m === 'POST') {
    if (active && !active.done) return json({ match: pvpView(active, me, t) });
    await db.prepare(`DELETE FROM pvp_queue WHERE at<?`).bind(t - PVP_QUEUE_TTL).run();
    const other = await db.prepare(`SELECT q.pid FROM pvp_queue q JOIN players p ON p.id=q.pid WHERE q.pid<>? ORDER BY q.at LIMIT 1`).bind(me.id).first();
    if (other) {
      const del = await db.prepare(`DELETE FROM pvp_queue WHERE pid=?`).bind(other.pid).run();
      if (del.meta && del.meta.changes === 1) {
        const op = await db.prepare('SELECT * FROM players WHERE id=?').bind(other.pid).first();
        const A = pvpInfo(op), B = pvpInfo(me), id = crypto.randomUUID(), seed = Math.floor(Math.random() * 2147483647);
        await db.prepare(`DELETE FROM pvp_queue WHERE pid=?`).bind(me.id).run();
        await db.prepare(`INSERT INTO pvp(id,a,b,ainfo,binfo,seed,qlv,aseen,bseen,created) VALUES(?,?,?,?,?,?,?,?,?,?)`)
          .bind(id, op.id, me.id, JSON.stringify(A), JSON.stringify(B), seed, Math.round((A.lv + B.lv) / 2), t, t, t).run();
        const mm = await db.prepare('SELECT * FROM pvp WHERE id=?').bind(id).first();
        return json({ match: pvpView(mm, me, t) });
      }
    }
    await db.prepare(`INSERT INTO pvp_queue(pid,at) VALUES(?,?) ON CONFLICT(pid) DO UPDATE SET at=excluded.at`).bind(me.id, t).run();
    const c = await db.prepare(`SELECT COUNT(*) AS c FROM pvp_queue WHERE at>?`).bind(t - PVP_QUEUE_TTL).first();
    return json({ waiting: true, queue: c ? c.c : 1 });
  }
  if (path === '/pvp/leave' && m === 'POST') {
    await db.prepare(`DELETE FROM pvp_queue WHERE pid=?`).bind(me.id).run();
    if (active && !active.done) { const side = active.a === me.id ? 'a' : 'b'; await pvpSettle(db, active, side === 'a' ? 'b' : 'a', t); }
    return json({ ok: true });
  }
  if (path === '/pvp/sync' && m === 'POST') {
    const body = (await readJson(request)) || {};
    const mt = await db.prepare('SELECT * FROM pvp WHERE id=? AND (a=? OR b=?)').bind(String(body.m || ''), me.id, me.id).first();
    if (!mt) return json({ gone: true });
    if (mt.done) return json({ match: pvpView(mt, me, t) });
    const active = mt, side = active.a === me.id ? 'a' : 'b';
    const prog = Math.max(0, Math.min(20, Math.floor(Number(body.prog) || 0)));
    await db.prepare(`UPDATE pvp SET ${side}seen=?, ${side}p=CASE WHEN rnd=? THEN ? ELSE ${side}p END WHERE id=?`).bind(t, active.rnd, prog, active.id).run();
    if (body.ready && Number(body.round) === active.rnd && !active.done) {
      await db.prepare(`UPDATE pvp SET ${side}r=? WHERE id=? AND rnd=?`).bind(active.rnd, active.id, active.rnd).run();
      await db.prepare(`UPDATE pvp SET start=? WHERE id=? AND rnd=? AND ar=rnd AND br=rnd AND start=0`).bind(t + PVP_START_DELAY, active.id, active.rnd).run();
    }
    if (body.submit && Number(body.round) === active.rnd && !active.done) {
      const ms = Math.floor(Number(body.ms));
      const ok = Number.isFinite(ms) && ms >= 0 && ms < PVP_ROUND_MAX ? ms : -1;
      await db.prepare(`UPDATE pvp SET ${side}ms=? WHERE id=? AND rnd=? AND ${side}ms=-2 AND start>0`).bind(ok, active.id, active.rnd).run();
    }
    const cur = await db.prepare('SELECT * FROM pvp WHERE id=?').bind(active.id).first();
    const res = await pvpResolve(db, cur, t);
    return json({ match: pvpView(res, me, t) });
  }
  if (path === '/pvp/status' && m === 'GET') {
    await db.prepare(`DELETE FROM pvp_queue WHERE at<?`).bind(t - PVP_QUEUE_TTL).run();
    const q = await db.prepare(`SELECT COUNT(*) AS c FROM pvp_queue`).first();
    const live = await db.prepare(`SELECT COUNT(*) AS c FROM pvp WHERE done=0 AND created>?`).bind(t - 600000).first();
    return json({ queue: q ? q.c : 0, live: live ? live.c : 0, match: active && !active.done ? pvpView(active, me, t) : null });
  }
  return null;
}

function safeParse(s) { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } }
