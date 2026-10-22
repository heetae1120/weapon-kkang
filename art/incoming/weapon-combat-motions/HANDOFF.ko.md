# 무기별 전투 모션 — Claude 인계

## 납품 범위

`art/incoming/weapon-combat-motions/<종류>-combat/<종류>-combat.glb`

7종: `sword`, `dagger`, `spear`, `axe`, `saber`, `shinai`, `scythe`.
각 파일에 대기 1개, 일반 공격 3개, 필살기 1개. 총 35클립.
모두 30fps, 미터, Y-up, +Z 정면, 수평 루트 이동 없음.
`mixamorig:` 접두사를 포함한 22개 Mixamo 뼈, 정점당 가중치 1개.
텍스처가 포함된 GLB이고 외부 파일 없이 열 수 있다.

미리보기용 오리지널 훈련 마네킹과 T4 무기가 포함되어 있다.
이 마네킹을 게임 캐릭터로 교체하는 작업이 아니라, 모션을 기존 캐릭터에 리타게팅한다.
`WK_TrainingMannequin`과 `DEMO_*_remove_when_retargeting` 메시를 실제 게임에는 중복 표시하지 않는다.
T포즈 바인드의 마네킹 높이는 1.7m, 손은 손가락 뼈 없는 닫힌 장갑 형태다.

## 클립 목록

| 종류 | 대기 | 일반 공격 (프레임) | 필살기 (프레임) |
|---|---|---|---|
| sword | sword_idle 91 | diagonal 37 / sweep 41 / thrust 35 | crescent_finisher 67 |
| dagger | dagger_idle 91 | diagonal 37 / sweep 41 / thrust 35 | flash_finisher 61 |
| spear | spear_idle 91 | rising 39 / sweep 41 / thrust 35 | flash_finisher 65 |
| axe | axe_idle 91 | diagonal 37 / sweep 41 / rising 43 | crescent_finisher 73 |
| saber | saber_idle 91 | diagonal 37 / sweep 41 / thrust 35 | crescent_finisher 67 |
| shinai | shinai_idle 91 | diagonal 37 / sweep 41 / thrust 35 | flash_finisher 61 |
| scythe | scythe_idle 91 | diagonal 37 / sweep 41 / rising 43 | crescent_finisher 73 |

공격 이름 앞에도 종류와 밑줄이 붙는다. 예: `axe_rising`.
프레임은 Blender에서 1부터 시작한다. GLB 시간은 0부터 시작하므로
`impact_seconds = (impact_frame - 1) / 30`을 사용한다.
91프레임 대기는 정확히 3초이고 첫/끝 자세가 같다.
공격의 첫/끝 자세는 해당 무기의 대기 첫 자세와 같다.
타격 프레임과 효과 이벤트는 각 `spec.json`을 기준으로 한다.

## 랜덤 공격 연결 요청

게임 코드는 이 PR에서 수정하지 않았다. Claude가 아래를 연결한다.

1. 무기별 `attack_pool`에서 공격 시작 시 한 번 선택하고, 선택한 클립을 끝까지 재생한다.
2. 기본 가중치는 일반 3종 각각 30, 필살기 10이다. 연속 중복을 막으면 실제 장기 출현 비율은 이 숫자와 다소 달라진다. 확률이 아니라 선택 가중치다.
3. `avoid_immediate_repeat`가 켜져 있으면 직전 클립을 후보에서 빼고 남은 가중치를 정규화한다.
4. 공격 중 매 프레임 재추첨하지 않는다. 대기/공격 경계는 약 0.08~0.12초 블렌딩을 시작값으로 권장한다.
5. 현재 게임의 공격 쿨다운을 유지하려면 클립 전체를 해당 시간에 맞춰 재생한다. 이때 타격 이벤트 시각도 같은 비율로 조절한다.
6. 여러 플레이어가 같은 전투를 볼 때 공격 ID/시작 시각은 게임의 기존 전투 동기화 경로를 통해 공유한다. 관전자마다 별도 랜덤 선택을 하지 않는다.
7. 참격파, 번개, 잔상, 히트스톱, 카메라 흔들림은 `events`의 프레임에 연결한다. 이 GLB에는 시각 효과 메시나 실제 대시 이동이 들어 있지 않다.
8. `flash_dash`는 연출 연결용 표식이다. 실제 캐릭터 이동/사거리/충돌 변경은 별도 게임 설계 판단이 필요하다. 기본은 기존 위치에서 동작만 재생한다.

## 현재 게임의 리타게팅 주의

현재 main의 `dev/ual2anim.py`는 바인드 기준 **월드 회전 델타** 형식으로 변환한다.
이 파일의 GLB 로컬 쿼터니언을 게임 뼈에 그대로 대입하지 않는다.
소스 바인드 월드 회전과 소스 애니메이션 월드 회전에서 델타를 구한 후,
기존 변환 파이프라인의 좌표계와 대상 캐릭터 바인드에 적용한다.
소스 이름의 `mixamorig:` 접두사는 게임의 접두사 없는 이름과 매핑한다.
이 문서는 변환 로직을 수정하지 않으며, 기존 변환 코드가 이 파일을 이미 지원한다고 보증하지 않는다.

창·도끼·죽도·낫은 양손 동작이고 검·단검·광선검은 오른손 동작이다.
오른손 손바닥 중심을 무기의 원점에 맞추며, 왼손의 자루 위치는 spec의
`left_distance_along_blade_m`에 기록되어 있다. 날 방향은 엄지 방향이다.
키가 작거나 팔 길이가 다른 게임 모델은 대상 모델에서 그립 보정/IK 베이크가 필요할 수 있다.
원본 리그에서는 두 팔의 도달 범위 안으로 무기를 함께 이동시켜 손이 자루에서 미끄러지지 않도록 베이크했다.
발은 고정되어 있고 골반은 상하로만 움직인다. 전진은 런타임에서 별도로 처리한다.

## 필살기 레퍼런스와 구현 수준

사용자가 요청한 특정 기술의 특징을 참고해 직접 키프레임을 제작했다.
원작 영상에서 모션을 추출한 파일이나, 특정 장면의 프레임 단위 복제본은 아니다.

- `crescent_finisher`: 블리치 월아천충의 위에서 크게 내려베고 참격을 방출하는 구성을 참고. 도끼·낫은 자루 길이에 맞춘 양손 변형.
- `shinai_flash_finisher`: 귀멸의 칼날 벽력일섬의 낮춘 준비 자세와 짧은 발도 타이밍을 참고. 칼집/전진 이동 없이 죽도 동작으로 변형.
- `dagger_flash_finisher`: 원피스 일도류 거합 사자손손의 준비와 빠른 횡베기 구성을 단검에 맞게 변형. 칼집은 포함하지 않음.
- `spear_flash_finisher`: 벽력일섬의 압축된 준비/발산 타이밍을 창 찌르기로 변형. 원작에 있는 창 기술을 복제했다는 뜻은 아님.

공식 참고 자료:
- [BLEACH 키워드](https://bleach-anime.com/keyword/)
- [ONE PIECE 조로 기술 소개](https://one-piece.com/news/o20201111_11715/index.html)
- [BANDAI SPIRITS 벽력일섬 포즈](https://www.bandaispirits.co.jp/products/search/detail.php?grp_id=5312&prd_id=13940)

## 확인 자료 / 재생성

각 폴더: GLB, 편집 가능한 Blender 파일, `spec.json`, 정면/3/4 512px PNG,
공격별 타격 포즈 PNG, 내보낸 GLB를 다시 불러와 만든 필살기 GIF.
상위 폴더: `contact-sheet.jpg`, `validation.json`, `reimport-validation.json`.
`build.py`는 제작 소스이며 재생성할 때 앞선 RPG 모델 PR의 `art/incoming/*-t4` GLB와
`art/incoming/rpg-assets-v2` 아틀라스가 필요하다. 납품 GLB의 재생에는 이 의존성이 없다.
`validate.py`는 GLB 실제 바이트를 검사하고 `qa_import.py`는 Blender 재수입 후 모든 프레임을 검사한다.

## 알려진 한계

- 손가락별 애니메이션은 없다. 손은 마네킹용 장갑 형태다.
- 효과/랜덤 선택/전투 판정/배포는 아직 게임에 연결하지 않았다.
- 대상 캐릭터 리타게팅과 게임 내 결과는 Claude가 연결 후 확인해야 한다.
- 새로운 막기·피격·승리 모션은 이번 35클립에 포함되지 않는다. 기존 게임 모션을 유지한다.
