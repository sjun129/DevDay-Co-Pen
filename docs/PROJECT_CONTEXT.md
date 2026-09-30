# Co-Pen 프로젝트 컨텍스트

새 작업 창(Claude Code 세션, claude.ai 프로젝트 등)에서 이 프로젝트를 이어가기 위한 인수인계 문서다. 기준일은 2026-09-30이다. 함께 볼 자료:
- 조사 보고서: `reports/AI 협업 에디터 신뢰성 설계.md` (근거와 출처 링크 전체)
- 조사 노트: `research_notes/AI 협업 에디터 신뢰성 설계/` (주제별 원자료 6개)
- 초기 기획서: `AI_공동작업_에디터_초기기획서.docx` (레포 밖, 사용자 다운로드 폴더)

---

## 1. 프로젝트 한눈에

- **무엇**: AI가 채팅창 속 비서가 아니라 커서를 가진 참여자로 문서에 들어와 사람과 동시에 편집하는 실시간 협업 에디터.
- **누구**: 1차 타깃은 팀 과제를 함께 쓰는 한국 대학생. 4인 팀(에디터·프론트 / 동기화 서버·인프라 / 에이전트·LLM / 백엔드·PM).
- **어디에**: 동아대학교 교내 DevDay. 제출 마감은 10월 말 이전으로 가정(정확한 날짜 미확인).
- **일정**: 스프린트 1(9/28~10/4) 기술 검증 → 스프린트 2(10/5~10/11) → 스프린트 3(10/12~10/18) **기능 동결 10/18** → 4주차(10/19~10/25) 안정화·측정 → 발표 준비.
- **현재 방향**: "편집 도구에 LLM을 끼운 것"이 아니라 **"신뢰할 수 있는 AI 협업 에디터: AI는 참여자지만 결정과 책임은 사람에게"**. 기술적 핵심은 사람과 AI가 동시에 편집할 때의 정확성 보장이다(5장).

## 2. 현재 코드 상태

### 구조 (npm workspaces 모노레포, git 미초기화)

| 경로 | 내용 |
|---|---|
| `apps/web` | Next.js 16 App Router + TipTap 3 에디터, 참여자·AI 패널·서식 툴바·A4 페이지 |
| `apps/sync-server` | Hocuspocus 4 동기화 서버. 사람/에이전트 인증 구분, 스냅샷 저장(Supabase 또는 `.data/` 파일), 멘션 → 워커 HTTP 전달 |
| `apps/agent-worker` | 방별 헤드리스 Yjs 클라이언트. 계획(JSON) → 스트리밍 삽입, 앵커링, AI 전용 undo, 목업 LLM |
| `packages/shared` | 상수(`DOC_FIELD`, `AGENT_ORIGIN`, `AI_SUGGESTION_MARK`, `MENTION_PATTERN`, 색상), stateless·HTTP 프로토콜 타입 |
| `supabase/migrations` | `documents` 테이블(base64 Yjs 상태) |
| `.github/` | CI(타입체크·린트·웹 빌드), PR 템플릿(완료 기준), 유저 스토리 이슈 템플릿 |

### 실행

```bash
npm install
cp apps/sync-server/.env.example apps/sync-server/.env
cp apps/agent-worker/.env.example apps/agent-worker/.env
npm run dev   # sync :1234, agent :1235, web :3000
```

- `OPENAI_API_KEY`가 비어 있으면 워커가 **목업 스트림**으로 답한다.
- 모델은 OpenAI 호환 주소(`OPENAI_BASE_URL`)로 바꿔 쓴다. 워커는 Chat Completions로 호출한다. 2026-09-30 현재 개발용은 Gemini 무료 등급(`gemini-flash-lite-latest`)으로 실제 응답까지 브라우저에서 확인했다. `gemini-3.8-flash`는 같은 날 503(과부하)이 잦았다. Qwen은 키가 생기면 주소·키·모델명 세 줄만 바꾸면 되나 미검증.
- Supabase 값이 비어 있으면 `apps/sync-server/.data/`에 파일로 저장한다.
- Claude 데스크톱 브라우저 미리보기용 설정: `.claude/launch.json` (`sync`, `agent`, `web`).
- 검증 명령: `npm run typecheck`, `npm run lint -w @co-pen/web`, `npm run build`.

### 기능 현황

| 기능 | 상태 | 비고 |
|---|---|---|
| F1 실시간 동시 편집 / F2 커서·프레즌스 / F3 링크 입장 | ✅ 브라우저 2개로 확인 | |
| F4 AI 참여 | ✅ | 첫 사람 입장 시 워커 자동 입장, 마지막 사람 퇴장 시 퇴장 |
| F5 @멘션 / F6 스트리밍(50ms 묶음, 줄바꿈 → 새 문단) / F7 앵커링 | ✅ | 멘션은 문단 첫머리 `@AI` 또는 `@초안` + 문단 끝에서 Enter |
| 요청 시점 동기화(state vector) | ✅ 3/3 재현 테스트 통과 | 멘션 직후 빈 줄과 AI 문단의 순서가 무작위가 되던 경쟁 조건 수정 |
| F8 제안 모드 | ✅ 기본 | 제안별 수락·거절, 문단 전체가 제안이면 거절 시 문단째 삭제 |
| F9 AI 편집만 되돌리기 | ✅ 기본 | 가장 최근 AI 작업 1개 단위 |
| F10 저장·복원 | ✅ 파일 / ⬜ Supabase 미검증 | |
| A4 페이지 나눔 | ✅ | `tiptap-pagination-plus`(decoration 방식, 문서 구조 불변). 폭 858px 미만은 연속 보기 |
| 서식 툴바 | ✅ | 글꼴 4종, 크기 9~32pt(본문 11pt), 문단 줄간격 100~250%(기본 160%), 정렬 4종. 다른 참여자에게 동기화 확인 |
| 라이트 테마 디자인 | ✅ | Pretendard, 보라→인디고 그라데이션, 모바일 375px 확인 |
| F11~F14, 다중 에이전트, 신뢰 기능 | ⬜ | 8장 로드맵 |

### 알려진 한계·미확인

- OpenAI 본가 호출 경로는 타입체크만 통과(키 없음). Supabase 저장 경로 미검증. Docker 이미지는 데몬이 꺼져 있어 빌드 못 함(동일 단계를 임시 폴더에서 재현해 기동까지만 확인).
- 마지막 사람이 나가면 워커 세션이 종료되어 AI undo 기록이 사라진다. 워커는 단일 인스턴스 전제.
- `@AI …` 멘션 문단은 문서에 그대로 남는다.
- AI 되돌리기 직후 사용자 입력이 기존 문단 끝에 붙은 현상을 한 번 관찰했으나 자동화 조작 탓인지 미확인.

## 3. 버전별 함정 (학습 데이터와 다른 부분)

- **Next.js 16**: `apps/web/AGENTS.md` 지시대로 코드 작성 전 `node_modules/next/dist/docs/`를 확인. 동적 라우트 `params`는 Promise(`PageProps<'/d/[docId]'>` 전역 타입, `next typegen` 필요). 워크스페이스 패키지는 자동 트랜스파일.
- **TypeScript는 `~5.9.3` 고정**(npm 최신 7.x는 Next와 호환 불확실).
- **TipTap 3**: `CollaborationCursor` → `@tiptap/extension-collaboration-caret`. `StarterKit.configure({ undoRedo: false })`. Placeholder는 `@tiptap/extensions`. `@tiptap/extension-text-style`의 `LineHeight`는 글자(span) 단위라 문단 줄간격은 커스텀 `BlockLineHeight`(`apps/web/lib/editor/line-height.ts`) 사용. 마운트 전 `editor.view` 접근 시 예외 → `editor.isInitialized` 확인.
- **y-tiptap 커서 규약**: awareness `cursor = { anchor, head }`(RelativePosition JSON), `user.color`는 6자리 hex.
- **Hocuspocus 4**: `new Server({...}).listen()`, 훅 `onAuthenticate / connected / onDisconnect / onStateless`, `document.broadcastStateless()`, 클라이언트 `provider.sendStateless()`.
- **AI SDK 7**: `generateObject` deprecated → `generateText({ output: Output.object({ schema }) })`, 결과는 `result.output`. `system` 대신 `instructions`.
- **lucide-react 1.x** 아이콘 이름: `TextAlignStart/Center/End/Justify`, `LoaderCircle`, `WandSparkles`.
- **환경**: Windows, pnpm 없음(npm workspaces). Git Bash와 PowerShell 모두 사용 가능.

## 4. 이미 내린 설계 결정

- **메시지 흐름**: 브라우저 → stateless(`agent:mention`, `agent:undo`) → 동기화 서버 → HTTP(`/join /leave /jobs /undo`, 공유 시크릿 헤더) → 워커. 워커 → stateless `agent:status` → 서버 브로드캐스트.
- **요청 시점 동기화**: 브라우저는 Enter 처리 뒤 `Y.encodeStateVector`(base64)를 멘션에 실어 보내고, 워커는 그만큼 따라잡은 뒤(최대 3초) 위치를 정한다.
- **앵커링**: 계획용 LLM 호출 전에 모든 블록 뒤에 `RelativePosition(assoc −1)`을 건다. 스트리밍은 AI 전용 문단 끝에만 쌓는다.
- **제안 모드**: 워커가 Yjs 텍스트 속성 `{ aiSuggestion: { jobId } }`로 넣으면 같은 이름의 TipTap Mark로 표시된다.
- **AI undo**: 워커의 `Y.UndoManager`가 `AGENT_ORIGIN`만 추적. 작업 시작마다 `stopCapturing()`.
- **페이지**: 화면 표시만 나누므로 Yjs·워커와 무관.

## 5. 전략 방향: 검증 가능한 신뢰

조사 결론(보고서 요약): **제안 수락·거절, AI 커서, 다중 에이전트 자체는 차별점이 아니다**(Word Copilot 변경 추적 2026-04, Google Docs Gemini 비공개 제안 2026-03, Tiptap AI Toolkit, Liveblocks AI 프레즌스). Co-Pen의 차별점은 **테스트로 참·거짓을 가릴 수 있는 네 가지 보장**이다.

1. **위험 비례 검증**: 팀 문서에서 근거를 찾지 못한 수치·날짜·고유명사와 모든 인용에만 유형별 확인을 요구한다(Tier 0/1/2). "모두 수락"은 Tier 2를 건너뛴다. 설명 카드는 "왜"가 아니라 **원문 대조**를 맨 위에 둔다.
2. **수락 기록 = 출처 기록**: 스팬 단위 메타데이터(`agent_id, role, model, prompt_id, op_type, accepted_by, accepted_at, edited_ratio`) + 해시 체인 append-only 감사 로그 + **"AI 사용 내역서"** 내보내기 + 첫 사용 고지·AI 문단 배지.
3. **결정론적 인젝션 방어**: L1 신뢰 채널 분리(멘션만 지시, 문서는 데이터) · L3 계획 검증(`targetIndex` 허용 집합, 행동 `insert_after|rewrite`만, 사람 원문 지시 전달) · L4 출력 정화(URL·이미지·HTML 제거, plain text). 보조로 L2 스포트라이팅, L5 탐지 칩.
4. **동시 편집 정확성**: semantic rebase(사람이 AI가 고치는 문단을 수정하면 3-way로 흡수) + **토큰 단위 보존 검사**와 reconcile-text 대체 경로 + 작업별 `UndoManager`(작업마다 고유 origin).

### 근거로 자주 쓸 수치 (출처는 보고서)

- 틀린 조언을 받은 사람은 틀린 결정 확률 26% 증가 (Goddard 2012, RR 1.26)
- 반복 경고를 한 번 무시하면 이후 87.9% 다시 무시 (Ancker 2017) → 획일적 확인 금지
- 저신뢰 스팬 강조로 LLM 오류 과제 정확도 26% → 53–58% (Spatharioti 2023)
- 인지 강제 기능: 과의존 0.64 → 0.48, 대신 사용자 선호 하락 (Buçinca 2021)
- 스포트라이팅: 정적 공격 성공률 50%↑ → 2%↓ (Hines 2024). 적응형 공격엔 대부분 방어가 90%↑로 무너짐 (Nasr·Carlini 2025)
- 가장 가까운 선행 시스템: Lehmann·Shauchenka·Buschek (CHI 2026, Yjs 기반 공유 AI 에이전트, 출력은 댓글·제안만, 팀은 에이전트를 "공유 도구"로 인식)
- LLM 3-way 산문 병합(동시 사람/AI 편집) 피어리뷰 연구는 찾지 못함 → Co-Pen이 주장할 연구 공백

### 규제·프레임워크 요점

- **인공지능기본법**: 2026-01-22 시행, 계도기간 최소 1년. 제31조 ① 생성형 AI 사전 고지 ② 결과물 표시. 서비스 안은 유연한 표시(배지), 밖으로 내보내는 결과물은 엄격한 표시(메타데이터+안내 등).
- **EU AI Act 제50조**: 2026-08-02 적용. Co-Pen에 적용될 가능성 낮음. 50(4) "사람 검토·편집 통제" 예외가 수락 흐름과 겹침 → 수락 기록의 근거.
- **교육부 「대학 AI 활용 윤리 가이드라인」 초안(2026-02-27)**: 과목별 금지·제한·허용, 선택적 "AI 활용 보고서". 최종본 미확인.
- **동아대 공식 가이드라인은 찾지 못함.** 확인 전에는 "동아대 규정" 언급 금지(동서대 규정과 혼동 사례 있음).
- **매핑에 쓸 프레임워크**: NIST AI 600-1 조치 ID(MS-2.7-007 인젝션 레드팀, MS-2.5-003 출처 검증, MP-3.4-001 출처 이해, MANAGE 4.1 override 등), OECD 1.4(무효화·수리·폐기 가능)·1.5(추적성), 인공지능 윤리기준 10대 요건, TTA 개발안내서 요구사항 04/10/11/13/15.
- **고위험 여부**: 채점·기여도 평가·AI 작성 탐지를 넣지 않는 한 EU 부속서 III 교육 고위험 용도에 해당하지 않을 가능성이 높다. 이런 기능은 넣지 않는다.

### 표현 가이드 (발표·README·UI 문구)

| 쓰지 말 것 | 대신 쓸 것 |
|---|---|
| 준수, 인증, 고위험 요건 충족 | 대비 설계, 참고·정렬, 자체 평가 |
| 최초의 AI 협업 에디터 / AI 커서 최초 | 인프라에 있던 기능을 대학생 팀 과제 흐름의 완성된 UX로 |
| AI 팀원 | 책임이 기록되고 되돌릴 수 있는 참여자 |
| 프롬프트 인젝션을 막았다 | 구조적으로 불가능하게 만든 것 + 정적 세트 ASR + 적응형 ASR |
| AI 작성 탐지, 워터마크 | 탐지가 아니라 과정 기록 |
| 신뢰 점수 하나 | 표본 크기·신뢰구간·측정하지 않은 것을 함께 보여주는 소수 지표 |

## 6. 미결정 사항 (새 창에서 먼저 확인)

1. 역할 에이전트 구성: 초안 작성자 + 문체 교정자 두 개로 시작(추천). 팩트체커는 후순위.
2. `@AI`의 의미: 초안 작성자로 연결(추천) vs 오케스트레이터.
3. 교정 방식: 원문 취소선 + 아래에 수정본 스트리밍(추천) vs 글자 단위 변경 추적.
4. 에이전트 간 조율: 워커 내부 락 또는 awareness claim(추천) vs CRDT 블랙보드(확장 계획 슬라이드로).
5. 감사 로그 저장소: Supabase append-only(추천, 팀이 프로젝트 생성 필요).

## 7. 기술 설계 초안 (다중 에이전트)

- 세션 키를 방 → `(room, agentId)`로 바꾸고, 에이전트마다 provider·awareness·UndoManager·작업 큐를 따로 둔다. 다른 에이전트끼리는 병렬.
- 역할 목록(id, 이름, 색, 호출어, 지시문)은 `packages/shared`에 둔다.
- 프로토콜: `agent:mention`·`AgentJobRequest`에 `agentId`, `agent:undo`에 `agentId?`, `agent:status`에 `agentId`·`activity` 추가.
- 교정 제안: 원문에 `aiDeletion` 마크, 아래 새 문단에 `aiSuggestion`. 수락 = 원문 삭제 + 표시 제거, 거절 = 수정본 삭제 + 원문 표시 제거. 마크 속성은 `{ jobId, agentId }`.
- AI 패널을 "AI 팀" 카드(에이전트별 상태·활동·개별 되돌리기)로.

## 8. 우선순위 로드맵 (동결 10/18까지)

| 우선 | 기간 | 항목 |
|---|---|---|
| P0 | 10/1–10/7 | 결정론적 인젝션 방어 L1·L3·L4 |
| P0 | 10/1–10/9 | 계층형 검증 플래그 + 원문 대조형 설명 카드 |
| P0 | 10/3–10/10 | 출처 메타데이터 + 해시 체인 감사 로그 + AI 사용 내역서 + 온보딩 고지 |
| P0 | 10/5–10/13 | 다중 에이전트(초안+교정) + semantic rebase 보존 검사 + 작업별 undo |
| P0 | 10/10–10/16 | 측정: 인젝션 세트(공격 40–60, 정상 ~20) 절제 표, 동시 편집 30–50건 4개 기준선 비교, 오류 주입 훈련 |
| P1 | 10/8–10/15 | 책임성 배지("✔ 누가 확인"), 미검증 카운트, 내보내기 전 체크리스트, L2·L5, 사람 커서 회피(F11) |
| P1 | 10/14–10/17 | 적응형 레드팀(팀원별 1–2시간), 5–8명 파일럿, 로그 계측 |
| P2 | 동결 후 | C2PA 텍스트 매니페스트, 오케스트레이터, 블랙보드 조율, SynthID |

발표 흐름: 문제 제기(팀플) → AI 도입 시 신뢰 문제 세 가지(자동화 편향·책임 전가·통제 상실) → 라이브 데모(심사위원 QR 입장, 다중 AI, 충돌 흡수, 검증 플래그, 내역서) → 신뢰성 세 축과 기능 대응표 → 측정 수치(한계 포함) → 확장 계획.

---

## 9. 추천 페르소나

새 창의 기본 페르소나는 **①**이다. 작업 성격이 바뀌면 "지금부터 ③ 관점으로 봐줘"처럼 전환한다.

| # | 페르소나 | 언제 | 관점과 기준 |
|---|---|---|---|
| ① | **리드 엔지니어 (실시간 협업·CRDT)** | 기본. 구현·디버깅 | Yjs/Hocuspocus/TipTap 내부 동작 기준으로 판단. 모든 변경은 두 브라우저로 확인하고 서버 쪽 문서 상태와 대조. 3장 버전 함정을 먼저 확인. 경쟁 조건은 재현 → 원인 → 수정 → 반복 테스트 순서 |
| ② | **신뢰성 설계 검토자 (Trustworthy AI)** | 기능 설계·PR 검토 | 네 가지 보장(5장)과 원칙 체크: 제안 전용인가, 되돌릴 수 있는가, 누가 수락했는지 남는가, 위험 사실이 멈추는가, 인젝션 채널이 열리는가. NIST 600-1·OECD·기본법 제31조·TTA 매핑 |
| ③ | **HCI·과의존 UX 설계자** | 제안·검증·설명 UI | 획일적 확인 금지, 위험 비례 마찰, 출처 대조 우선, 1인칭·항목 한정 불확실성 문구, 숫자 신뢰도 배지 금지, 책임성 신호. 수락 시간·출처 열람률로 도장 찍기 측정 |
| ④ | **레드팀 보안 엔지니어** | 에이전트 입력·출력 경로 | OWASP LLM01/LLM06, 에이전트 Top 10 ASI01/ASI09. 결정론적 계층 우선, 분류기는 권고용. 공격 8범주, 프로그램 판정, Wilson 95% 구간, 절제 표, 적응형 라운드 |
| ⑤ | **평가·측정 담당 (TEVV)** | 벤치마크·발표 수치 | NIST MEASURE 원칙: 중요한 위험부터 지표, 실사용 유사 조건, 일화 일반화 금지, 구성 타당도와 측정하지 않은 것 명시. 목표치는 "팀 기준"이라고 표기 |
| ⑥ | **심사위원 시뮬레이터·발표 코치** | 발표 자료·리허설 | "구글독스에 AI 붙인 거 아냐?", "인젝션 막았다는 근거?", "동아대 규정 확인했나?" 같은 날카로운 질문. 5장 표현 가이드 위반 지적. 3분 데모 동선과 실패 대비(시연 영상 백업, 로컬 서버) |

## 10. 추천 스킬

### 이미 설치된 스킬 활용

| 스킬 | 쓰임 |
|---|---|
| `code-review` | PR 전 버그 검토. 동시성·Yjs 트랜잭션 경로는 high 이상 |
| `security-review` | 워커 입력·출력 경로, 공유 시크릿, 출력 정화 변경 시 |
| `simplify` | 기능 동결 직전 정리 |
| `run` | 세 서비스를 띄우고 실제 동작 확인 |
| `anthropic-skills:deep-research` | 추가 조사(예: 동아대 가이드라인, 법령 원문 확인) |
| `dataviz` | 측정 결과 차트(ASR 절제 표, 보존률 비교) |
| `anthropic-skills:pptx` 또는 슬라이드 아티팩트 | 발표 자료 |
| `anthropic-skills:skill-creator` | 아래 프로젝트 스킬 개선·평가 |
| `ponytail` (제3자 플러그인, [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), MIT) | 필요한 코드만 쓰게 하는 최소주의 규칙. 기능 동결 전 과잉 구현 방지용. 검증·오류 처리·보안·접근성은 최소화 대상에서 제외된다. SKILL.md만 복사하면 작동하지 않고 SessionStart 훅이 있는 플러그인으로 설치해야 한다(Node 필요). 사용자가 직접 설치: `/plugin marketplace add DietrichGebert/ponytail` → `/plugin install ponytail@ponytail` |

### 프로젝트 스킬 (`.claude/skills/`에 만들어 둠)

| 스킬 | 하는 일 |
|---|---|
| `trust-review` | 변경·기능을 네 가지 보장과 원칙 체크리스트로 검토하고 표로 보고 |
| `injection-eval` | 인젝션 테스트 세트 설계·실행, 범주별 ASR과 Wilson 구간, 절제 표 |
| `concurrency-bench` | 헤드리스 Yjs 봇으로 동시 편집 시나리오를 돌려 사람 수정 보존률·지연·undo 정확성 측정 |
| `claim-check` | 발표·README·UI 문구에서 과장 표현과 미확인 사실을 찾아 대체 표현 제안 |

## 11. 작업 원칙 (이 프로젝트에서 합의된 것)

- UI 변경은 브라우저에서 직접 확인한 뒤 완료로 본다. 동시 편집은 두 클라이언트 + 서버 문서 상태까지 대조한다.
- 브라우저 자동화 테스트는 좌표 클릭보다 요소 참조·DOM 포커스 확인을 우선한다(창 크기 변화로 좌표가 틀어진 사례 있음).
- 확인되지 않은 사실은 "미확인" 또는 "보도 기준"으로 표기한다.
- 커밋은 사용자가 요청할 때만 한다.
