# 무기 깡!

무기를 강화하고 다른 플레이어의 무기와 결투하는 웹게임. Cloudflare Pages(사이트) + Pages Functions(서버) + D1(저장소)로 돌아갑니다.

## 폴더 구성

| 경로 | 내용 |
| --- | --- |
| `public/index.html` | 게임 전체 (화면, 연출, 결투) |
| `functions/api/[[path]].js` | 서버: 가입, 저장, 상대 찾기, 결투 정산, 랭킹, 실시간 PvP(대기열·라운드 동기화) |
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

## 사용한 외부 에셋

- 대장장이 캐릭터: Adobe Mixamo "Peasant Man", 결투 캐릭터: Mixamo "Paladin", "Castle Guard", "Orc"(Mixamo 기본 몬스터), "Erika Archer", "Ninja", "Kachujin" + 검·방패 모션 (Mixamo 이용약관에 따라 게임 내 사용 가능)
- 결투·대장장이 몸동작: Quaternius "Universal Animation Library" 1·2 (CC0, `dev/ual2anim.py`로 변환)
- 벽돌·돌바닥·금속·가죽·나무 질감, 지하실 조명(HDRI): Poly Haven (CC0)

## Codex 납품 3D 에셋 (에셋 팩)

`art/incoming/`(PR 브랜치 `art/rpg-assets-v2`)의 GLB를 `dev/glb2wk.py`로 변환해 `public/assets/pack/`에 넣습니다.

```
python3 dev/glb2wk.py art/incoming public/assets/pack
```

GLB 39개가 같은 텍스처 4장을 각자 품고 있어 원본은 99MB입니다. 변환하면 지오메트리만 남기고
텍스처를 한 번만 공유해 약 4MB가 됩니다. 원본 GLB는 용량 때문에 main에 넣지 않고 PR 브랜치에 둡니다.

- 상자·구체는 애니메이션 프레임을 미리 구워 2D 캔버스에 올립니다.
- 무기는 머리말의 "모델" 버튼(휴대폰은 더보기 → 무기 모델)으로 기본/새 에셋을 전환합니다.
- 팩이 없거나 늦게 오면 기존 절차 생성 모델로 자동 복귀합니다.

## Codex 납품 전투 모션 (무기별 공격 모션)

`art/incoming/weapon-combat-motions/`(PR 브랜치 `art/weapon-combat-motions`)의 GLB 7개를
`dev/glb2wkanim.py`로 변환해 `public/assets/wm_<무기>_anim.json`에 넣습니다.

```
python3 dev/glb2wkanim.py art/incoming/weapon-combat-motions public/assets
```

무기 7종 × (대기 1 + 일반 공격 3 + 필살기 1) = 35클립, 30fps입니다.
`ual2anim.py`와 같은 **바인드 자세 기준 월드 회전 델타** 형식이라 체형이 다른 캐릭터에도 붙습니다.
GLB의 로컬 쿼터니언을 그대로 쓰지 않습니다. 기준 바인드는 skin의 `inverseBindMatrices`를
역행렬로 풀어 얻습니다(근사 없음). `mixamorig:` 접두사는 떼어 게임 뼈 이름에 맞춥니다.
미리보기용 마네킹·T4 무기 메시는 읽지 않고 애니메이션만 가져옵니다.
원본 GLB 24MB는 main에 넣지 않고 PR 브랜치에 둡니다(변환 결과는 1.2MB).

- 공격은 라운드마다 하나를 추첨합니다. 가중치는 spec.json의 `attack_pool`(일반 30, 필살기 10)이고
  직전 공격은 후보에서 뺍니다. 번호는 결투 시드·라운드·대전 내 고정 진영에서만 나오므로
  양쪽 화면에 같은 공격이 나옵니다(별도 네트워크 필드를 쓰지 않습니다).
- spec.json의 `impact_frame`이 기존 타격 시점(`CLASH.cut`)에 정확히 오도록 클립 시간을 맞춥니다.
  타임라인을 바꾸면 타격 프레임도 같은 비율로 따라갑니다. 데미지·사거리 수치는 손대지 않았습니다.
- 필살기 `events`의 `crescent_wave`는 전방 참격파, `flash_dash`는 번개·잔상으로 연결했습니다.
  실제 돌진 이동과 충돌 판정은 바꾸지 않았습니다.
- 막기·피격·승리 동작은 기존 UAL 모션을 그대로 씁니다.
- 모션 파일이 없거나 로딩이 실패하면 기존 UAL 모션으로 자동 복귀합니다.
