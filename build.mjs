// Cloudflare Pages 빌드 명령: node build.mjs
// 배포할 때마다 버전 번호를 새로 써서, 접속 중인 사람들의 화면이 자동으로 새 버전으로 바뀌게 합니다.
import { writeFileSync } from 'node:fs';
const v = process.env.CF_PAGES_COMMIT_SHA || String(Date.now());
writeFileSync(new URL('./public/version.json', import.meta.url), JSON.stringify({ v }) + '\n');
console.log('version', v);
