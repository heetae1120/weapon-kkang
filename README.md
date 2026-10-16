# 무기 깡!

무기를 강화하고 다른 플레이어의 무기와 결투하는 웹게임. Cloudflare Pages(사이트) + Pages Functions(서버) + D1(저장소)로 돌아갑니다.

## 폴더 구성

| 경로 | 내용 |
| --- | --- |
| `public/index.html` | 게임 전체 (화면, 연출, 결투) |
| `functions/api/[[path]].js` | 서버: 가입, 저장, 상대 찾기, 결투 정산, 랭킹 |
| `build.mjs` | 배포할 때마다 `public/version.json`을 새로 써서 접속자 화면을 자동 업데이트 |
| `dev/server.mjs` | 내 컴퓨터에서 테스트할 때만 쓰는 가짜 서버 (배포와 무관) |

## 처음 한 번만 하는 배포 설정

1. GitHub에 새 저장소(예: `weapon-kkang`)를 만들고 이 폴더의 파일을 전부 올립니다.
2. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 방금 만든 저장소 선택.
   - Build command: `node build.mjs`
   - Build output directory: `public`
3. **Storage & Databases → D1** → **Create database** → 이름 `weapon-kkang-db`.
4. Pages 프로젝트 → **Settings → Bindings** → **Add** → **D1 database** → Variable name `DB`, 데이터베이스 `weapon-kkang-db`.
5. **Deployments** 탭에서 최신 배포를 **Retry deployment** (바인딩은 다음 배포부터 적용됩니다).
6. `프로젝트이름.pages.dev`로 접속. 표는 첫 접속 때 서버가 자동으로 만듭니다.

## 업데이트

저장소에 새 파일이 올라가면 Cloudflare가 1분 안팎으로 자동 배포합니다. 게임을 켜 둔 사람은 결투·상자 개봉 중이 아닐 때 자동으로 새 버전으로 새로고침됩니다(최대 1분, 또는 앱으로 돌아올 때 바로).

## 내 컴퓨터에서 테스트

Node 22 이상: `npm run dev` → http://localhost:8788
