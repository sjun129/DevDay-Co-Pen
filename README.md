# Co-Pen

AI가 채팅창 속 비서가 아니라 **커서를 가진 팀원**으로 문서에 들어와 사람과 동시에 편집하는 실시간 협업 에디터.
동아대학교 DevDay 출품작 (기획: `AI_공동작업_에디터_초기기획서.docx`).

## 구조

```
브라우저 (Next.js + TipTap + Yjs) ──ws──┐
브라우저 ...                      ──ws──┤
                                        ├─ apps/sync-server (Hocuspocus) ── Supabase / 로컬 파일 (스냅샷)
apps/agent-worker (헤드리스 Yjs) ──ws──┘        │
        │                                       │ HTTP (/join /leave /jobs /undo)
        └─ LLM (Vercel AI SDK + OpenAI) ◀───────┘
```

서버 입장에서 AI 에이전트는 사람 브라우저와 똑같은 Yjs 클라이언트다. 토큰으로 사람/에이전트만 구분한다.

| 경로 | 내용 | 담당 (R&R) |
| --- | --- | --- |
| `apps/web` | Next.js 16 App Router, TipTap 3 에디터, 커서·참여자·제안 UI | 에디터·프론트 |
| `apps/sync-server` | Hocuspocus 4 서버, 스냅샷 저장, 멘션 → 워커 전달 | 동기화 서버·인프라 |
| `apps/agent-worker` | 방별 에이전트 세션, 계획·스트리밍 삽입·앵커링·AI undo | 에이전트·LLM |
| `packages/shared` | 상수, stateless 메시지·HTTP 프로토콜 타입 | 공동 |
| `supabase/migrations` | `documents` 테이블 | 백엔드·PM |

## 빠른 시작

Node 22 이상이 필요하다.

```bash
npm install
```

```bash
cp apps/sync-server/.env.example apps/sync-server/.env
```

```bash
cp apps/agent-worker/.env.example apps/agent-worker/.env
```

```bash
npm run dev
```

http://localhost:3000 → **새 문서 만들기** → 닉네임 입력. 링크를 다른 브라우저에 열면 동시 편집이 된다.

- `OPENAI_API_KEY`를 비워 두면 워커가 **목업 스트림**으로 답한다. 키 없이 전체 흐름을 개발·시연할 수 있다.
- Supabase 설정을 비워 두면 `apps/sync-server/.data/`에 파일로 저장한다.
- 서비스별로 따로 띄우려면 `npm run dev:sync`, `npm run dev:agent`, `npm run dev:web`.

## 사용 흐름

1. 문단 첫머리에 `@AI 3장 결론 써줘`처럼 쓰고 **Enter** (`@초안`도 인식).
2. AI 커서가 이동하며 결론을 스트리밍으로 쓴다. 그 사이 다른 사람이 위쪽을 고쳐도 제자리에 들어간다.
3. AI 글은 보라색 점선(제안)으로 표시된다. 오른쪽 패널에서 제안별로 **수락 / 거절**.
4. **AI 편집 되돌리기**는 가장 최근 AI 작업 하나를 취소한다. 사람 편집은 남는다.

## 기능 현황

| ID | 기능 | 상태 | 위치 |
| --- | --- | --- | --- |
| F1 | 실시간 동시 편집 | ✅ | `web/components/editor/collaborative-editor.tsx` |
| F2 | 커서·프레즌스 | ✅ | `web/components/room/participant-list.tsx`, `lib/collab/use-participants.ts` |
| F3 | 링크 공유 입장 | ✅ | `web/app/d/[docId]/page.tsx`, `components/room/room.tsx` |
| F4 | AI 에이전트 참여 | ✅ | `agent-worker/src/session.ts` (첫 사람 입장 시 자동 참여) |
| F5 | @멘션 호출 | ✅ | `web/lib/editor/mention-trigger.ts` → `sync-server/src/index.ts` |
| F6 | 스트리밍 편집 | ✅ | `agent-worker/src/stream-writer.ts` (50ms 묶음, 줄바꿈 → 새 문단) |
| F7 | 위치 앵커링 | ✅ 기본 | `agent-worker/src/doc-model.ts` (`anchorAfterEachBlock`) |
| F8 | 제안 모드 | ✅ 기본 | `web/lib/editor/ai-suggestion.ts` |
| F9 | AI 편집만 되돌리기 | ✅ 기본 | `agent-worker/src/session.ts` (`Y.UndoManager` + `AGENT_ORIGIN`) |
| F10 | 저장·복원 | ✅ 파일 / ⬜ Supabase 미검증 | `sync-server/src/persistence.ts` |
| — | A4 페이지 나눔 | ✅ | `web/components/editor/collaborative-editor.tsx` (`tiptap-pagination-plus`, 좁은 화면은 연속 보기) |
| — | 글꼴·글자 크기·줄간격·정렬 | ✅ | `web/components/editor/format-toolbar.tsx`, `lib/editor/formats.ts`, `lib/editor/line-height.ts` |
| F11 | 사람 편집 영역 회피 | ⬜ | `agent-worker/src/llm.ts` `planEdit`의 TODO |
| F12 | 버전 타임라인 | ⬜ | |
| F13 | 역할별 다중 에이전트 | ⬜ | |
| F14 | 선제적 코멘트 | ⬜ | |

✅는 로컬에서 브라우저 두 개로 확인한 항목이다 (목업 LLM 기준). 실제 OpenAI 호출 경로는 타입체크만 통과했다.

## 핵심 설계

**메시지 흐름** — 브라우저는 Hocuspocus stateless 메시지(`agent:mention`, `agent:undo`)를 보내고, 동기화 서버가 워커에 HTTP로 전달한다. 워커는 진행 상황을 `agent:status`로 방에 되돌려 보낸다. 타입은 `packages/shared/src/protocol.ts`.

**요청 시점 동기화** — 멘션 요청(HTTP)이 문서 변경(WebSocket)보다 워커에 먼저 도착할 수 있다. 브라우저는 Enter 처리 뒤 자신의 `Y.encodeStateVector`를 함께 보내고, 워커는 그만큼 따라잡은 뒤(최대 3초) 위치를 정한다. 이게 없으면 멘션 직후 생긴 빈 줄과 AI 문단의 순서가 무작위가 된다.

**페이지** — A4(794×1123px, 96dpi)로 화면 표시(decoration)만 나눈다. 문서 구조는 바뀌지 않으므로 Yjs와 에이전트 워커에 영향이 없다. 폭이 A4보다 좁은 화면에서는 페이지 없이 이어서 보여 준다.

**LLM 출력 → CRDT 연산** — `planEdit`가 구조화 출력(`generateText` + `Output.object`)으로 "몇 번 블록 뒤에 쓸지"를 먼저 정하고, 본문만 `streamText`로 받는다.

**앵커링** — 계획용 LLM 호출 전에 모든 블록 뒤에 `Y.RelativePosition`(assoc −1)을 걸어 둔다. 호출 중 위쪽에 문단이 추가·삭제돼도 같은 블록 뒤로 해석된다. 이후 스트리밍은 AI 전용 문단 끝에만 쌓이므로 위치가 흔들리지 않는다.

**제안 모드** — 워커가 Yjs 텍스트 속성 `{ aiSuggestion: { jobId } }`로 넣으면 y-tiptap이 같은 이름의 TipTap Mark로 보여 준다. 수락은 마크 제거, 거절은 텍스트(또는 문단 전체) 삭제다.

**AI undo** — 워커의 `Y.UndoManager`가 `AGENT_ORIGIN` 트랜잭션만 추적한다. 작업 시작마다 `stopCapturing()`을 호출해 작업 하나가 undo 한 단계가 된다.

## 알려진 한계

- 마지막 사람이 방을 나가면 워커 세션이 종료되어 AI undo 기록이 사라진다.
- `@AI …` 멘션 문단은 문서에 그대로 남는다.
- 워커 세션은 메모리에 있으므로 워커는 인스턴스 하나만 띄워야 한다 (다중 인스턴스는 대회 범위 밖).

## 배포 (US3, 인프라 담당)

- 웹: Vercel, Root Directory `apps/web`, 환경 변수 `NEXT_PUBLIC_SYNC_SERVER_URL=wss://…`
- 동기화 서버·워커: Fly.io 또는 Railway, 레포 루트를 빌드 컨텍스트로 `apps/sync-server/Dockerfile`, `apps/agent-worker/Dockerfile`
- 두 서비스의 `AGENT_SHARED_SECRET`은 같은 긴 랜덤 값으로 설정
- CI: `.github/workflows/ci.yml` (타입체크 · 린트 · 웹 빌드). 자동 배포 단계는 플랫폼 확정 후 추가

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 세 서비스 동시 실행 |
| `npm run typecheck` | 전체 워크스페이스 타입체크 |
| `npm run build` | 웹 프로덕션 빌드 |
