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
  `CREATE INDEX IF NOT EXISTS duels_b ON duels(b, at)`
];

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  schemaReady = true;
}

const TYPES = ['sword', 'dagger', 'spear', 'axe', 'saber', 'shinai', null];
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
  const hidden = type === 'saber' || type === 'shinai';
  const el = !type || hidden ? null : (ELS.includes(w.el) && w.el ? w.el : 'fire');
  const lv = Math.max(0, Math.min(20, Math.floor(Number(w.lv) || 0)));
  return { type: type, el, lv: type || lv === 0 ? lv : 0 };
}

function cleanState(st) {
  if (!st || typeof st !== 'object') return null;
  const inv = Array.isArray(st.inv) ? st.inv.slice(0, 30).map(w => ({
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
    muted: !!st.muted,
    boxes: Math.max(0, Math.floor(Number(st.boxes) || 0)),
    hidCount: Math.max(0, Math.floor(Number(st.hidCount) || 0))
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
      const best = Math.max(0, ...state.inv.map(w => w.lv));
      await db.prepare(
        `INSERT INTO players(id,token_hash,name,state,weapon,lv,best,hid,seen,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, await sha256(token), name, JSON.stringify(state), JSON.stringify(cleanWeapon(cur)), cur.lv, best, state.hidCount, t, t, t).run();
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
        `SELECT id,name,earn,wins,losses,best,lv,weapon FROM players ORDER BY earn DESC, wins DESC LIMIT 50`
      ).all();
      let myRank = null;
      if (me) {
        const r = await db.prepare('SELECT COUNT(*) AS c FROM players WHERE earn>?').bind(me.earn).first();
        myRank = (r ? r.c : 0) + 1;
      }
      const total = await db.prepare('SELECT COUNT(*) AS c FROM players').first();
      return json({
        players: (results || []).map(r => ({ ...publicProfile(r), lv: r.lv, weapon: safeParse(r.weapon), me: !!me && r.id === me.id })),
        myRank, total: total ? total.c : 0
      });
    }

    // 아래부터는 로그인 필요
    const me = await auth(request, db);
    if (!me) return fail(401, 'auth', '다시 접속해 주세요.');

    if (path === '/me' && m === 'GET') return meResponse(db, me);

    if (path === '/save' && m === 'PUT') {
      const body = await readJson(request);
      const state = cleanState(body && body.state);
      if (!state) return fail(400, 'bad_state', '저장할 내용이 올바르지 않습니다.');
      const cur = state.inv.find(w => w.id === state.cur) || state.inv[0];
      const best = Math.max(me.best, ...state.inv.map(w => w.lv));
      const raw = JSON.stringify(state);
      if (raw.length > 60000) return fail(413, 'too_big', '저장 데이터가 너무 큽니다.');
      await db.prepare(`UPDATE players SET state=?, weapon=?, lv=?, best=?, hid=?, updated=? WHERE id=?`)
        .bind(raw, JSON.stringify(cleanWeapon(cur)), cur.lv, best, Math.max(me.hid, state.hidCount), now(), me.id).run();
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
          const hidden = w.type === 'saber' || w.type === 'shinai';
          return { id: r.id, name: r.name, type: w.type || null, el: w.el || null, lv: r.lv, purse: purse(r.lv, hidden), earn: r.earn, wins: r.wins, losses: r.losses, real: true };
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
        gold = purse(opp.lv, w.type === 'saber' || w.type === 'shinai');
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

function safeParse(s) { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } }
