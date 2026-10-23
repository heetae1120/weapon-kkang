// 로컬 테스트용: Cloudflare Pages + D1을 Node 내장 SQLite로 흉내 냅니다. 배포에는 쓰이지 않습니다.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sql = new DatabaseSync(process.argv[3] || ':memory:');

class Stmt {
  constructor(q) { this.q = q; this.args = []; }
  bind(...a) { const s = new Stmt(this.q); s.args = a.map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v); return s; }
  _st() { return sql.prepare(this.q); }
  async first() { const r = this._st().get(...this.args); return r ? { ...r } : null; }
  async all() { return { results: this._st().all(...this.args).map(r => ({ ...r })) }; }
  async run() { const r = this._st().run(...this.args); return { meta: { changes: r.changes } }; }
}
const DB = {
  prepare: q => new Stmt(q),
  async batch(stmts) { sql.exec('BEGIN'); try { const out = []; for (const s of stmts) out.push(await s.run()); sql.exec('COMMIT'); return out; } catch (e) { sql.exec('ROLLBACK'); throw e; } }
};

const api = await import(pathToFileURL(join(root, 'functions/api/[[path]].js')).href);
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
    const r = await api.onRequest({ request, env: { DB }, params: { path: url.pathname.slice(5).split('/').filter(Boolean) } });
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  // URL 경로의 선행 /를 먼저 제거해야 Windows에서 join()이 드라이브 루트로 새지 않는다.
  let p = normalize(decodeURIComponent(url.pathname).replace(/^\/+/, '')).replace(/^(\.\.[/\\])+/, '');
  if (!p || p === '.') p = 'index.html';
  else if (p.endsWith('/') || p.endsWith('\\')) p += 'index.html';
  try { const f = await readFile(join(root, 'public', p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(f); }
  catch (e) { res.writeHead(404); res.end('not found'); }
}).listen(Number(process.argv[2] || 8788), () => console.log('dev on', process.argv[2] || 8788));
