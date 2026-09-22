---
name: using-vox-skills
description: "Use FIRST — before any other vox skill — when a user asks anything related to vox.ai: voice agent creation, prompt writing, Manual authoring, flow design, tool setup, CLI / Agent-as-Code work (Codex·Claude Code), pricing, MCP connection, web app usage, testing, deployment, or general platform questions. Always route through this skill instead of calling vox domain skills directly. Trigger on '프롬프트 작성해줘', '매뉴얼 만들어줘', '요금이 얼마예요', 'MCP 연결', 'CLI', 'vox init', 'Agent-as-Code', 'diff 보고 push', 'flow 설계', '도구 추가', '웹 앱 안내', '에이전트 만들어줘', '전화 걸어줘', '음성 AI', '통화 기록', '대량발신', or any vox.ai-related request."
license: MIT
compatibility: "Requires the vox MCP server (https://mcp.tryvox.co/mcp, OAuth login on first tool call) and the vox-docs MCP server, both registered by the vox-ai plugin. Works in Claude Code, Codex, and any agentskills.io-compatible client; the vox CLI bundles the same skills offline."
---

# using-vox-skills

vox.ai 관련 요청의 routing entrypoint. domain 로직을 직접 실행하지 않고, 요청에 맞는 domain skill을 선택한다.

## Skill Catalog

| Skill | Trigger |
|-------|---------|
| `vox-onboarding` | 시작/온보딩, 첫 에이전트 만들기(에이전트 0건 또는 MCP 미연결), 전화 걸기/받기, MCP 연결 설정, 일반 안내 |
| `vox-agents` | prompt 작성/리팩터링/진단, Manual 설계·Trigger·라우팅·linked 체인 진단, agent.data, pipeline/GPT-Live runtime 선택·전환, 에이전트 유형 판단, IVR/DTMF 탐색 전략, 발화 표현력(감정·속도·웃음) 프롬프트 |
| `vox-flow` | flow 설계/노드 변환/리뷰, 노드별 프롬프트, condition_node 설정, 스크립트 시각화, 변수 시스템 |
| `vox-tools` | 빌트인/커스텀 도구 관리 — 장착·해제·생성·수정·삭제 |
| `vox-web-app` | 웹 앱 UI 사용법, 딥링크, UI 전용 흐름(보이스 클론, CSV 업로드, 녹취 재생, 결제, 멤버 초대), 통화 기록·녹취 조회 |

소유 경계(Owns / Does Not Own)의 정본은 각 domain skill의 Ownership Boundary다. 라우터는 그 표를 복제하지 않는다 — 경계가 궁금하면 해당 스킬의 표를 읽는다.

> CLI / Agent-as-Code 작업(레포에서 코드처럼 관리, diff/push, Codex·Claude Code)은 별도 설치 skill이 아니라 **설치된 `vox` CLI가 소유**한다 — 아래 "CLI / Agent-as-Code" 섹션 참조.

## CLI / Agent-as-Code (Codex·Claude Code)

레포에서 코드처럼 관리(diff/PR/리뷰/롤백/CI), sync/import, validate·diff·status·push, chat smoke가 필요하거나 Codex·Claude Code 같은 코딩 에이전트가 vox.ai 리소스를 다루면, 이 작업은 **별도 설치 skill이 아니라 설치된 `vox` CLI가 소유**한다. `vox` 바이너리는 자기 사용법을 스스로 설명하므로, 별도 public skill 설치 없이 아래로 시작한다. 이 레포의 6개 스킬은 CLI 안에도 offline pack으로 들어 있어(`vox skills show <skill> --brief --json`) 같은 playbook을 CLI에서 조회할 수 있다.

1. **첫 명령**: `vox guide coding-agent --brief --json` (target별 `vox guide coding-agent --target codex|claude --brief --json`) — CLI 운영 계약과 첫 명령 루프를 반환한다. flow authoring 세부는 `vox guide flow --task "<intent>" --json`.
2. **local 부트스트랩**: `vox init` / `vox agent init` / `vox agent create`는 root `CLAUDE.md`/`AGENTS.md`를 만들지 않고, 충돌이 적은 launcher를 `.claude/skills/vox-ai/SKILL.md`와 `.codex/skills/vox-ai/SKILL.md`에 만든다(원치 않으면 `--no-agent-skills`; 갱신은 `vox agent skills refresh`). 이 launcher도 위 `vox guide coding-agent`를 가리킨다.
3. **durable 루프**: 정본은 `vox guide coding-agent`가 돌려주는 루프다. 요약하면 `vox init --json` → plan/create 또는 pull → 파일 편집 또는 `vox agent flow` helper → `vox doctor --json` → `vox agent validate --agent <name> --json` → 프로젝트 리뷰 `vox agent status --all --offline --json` / `vox agent diff --all --offline --check --json` → `vox agent push --agent <name> --json`. `push`/`delete`/`vox call create`는 사용자가 명시 요청할 때만.

라우팅: 사용자가 "레포", "코드처럼", "diff/PR/리뷰", "롤백", "CI", "sync/import", "push 전 검증", "Codex/Claude가 CLI 쓰게", "AI-first CLI"를 언급하면 durable authoring 루프는 위 CLI 계약이 소유하고, 도메인 설계 세부는 해당 domain skill(`vox-agents`/`vox-flow`/`vox-tools`)을 secondary로 참조한다.

## Docs MCP 활용

`vox-docs` MCP 서버(`https://fleek.mintlify.app/mcp`)는 vox.ai 공식 문서 ~85페이지를 실시간 검색한다. 스킬이 커버하지 않는 영역(요금/빌링, SDK, 보안, 배포 상세, 모니터링, API reference 등)은 docs MCP로 직접 답변한다.

**사용 방법:**
1. `vox-docs` MCP의 `search_vox_ai_docs` tool로 검색 (query 예: "pricing", "SDK javascript", "webhook", "SIP telephony")
2. 전문이 필요하면 `query_docs_filesystem_vox_ai_docs` tool로 조회 — search가 돌려준 path에 `.mdx`를 붙여 `head`/`cat` (예: `cat /start/pricing.mdx`)
3. 페이지 내용 기반으로 답변

**URL 형식 (중요):** 사용자에게 docs 페이지 링크를 전달할 때는 반드시 `/docs/` prefix를 포함한다. 형식: `https://docs.tryvox.co/docs/{path}` (예: `https://docs.tryvox.co/docs/start/pricing`, `https://docs.tryvox.co/docs/build/overview`). `/docs/` 없이 `https://docs.tryvox.co/{path}` 로 전달하면 404다.

docs MCP는 router가 직접 처리하는 검색 케이스다 — 단순 검색 후 전달이므로 domain skill 수준의 로직이 불필요하기 때문이다.

## 스킬 없이 router가 직접 다루는 MCP 도구

전용 domain skill이 없지만 단일 MCP 호출로 끝나는 두 경우는 router가 직접 처리한다.

- **조직 전환** — 멀티 조직 계정에서 활성 조직을 바꿔야 하면 `list_organizations`로 소속 조직을 확인하고 `set_organization(organization_id)`로 세션 활성 조직을 전환한다. 다른 작업을 "다른 조직에서" 진행하라는 요청이면 먼저 전환한 뒤 해당 domain skill로 라우팅한다.
- **지식 베이스 조회** — `list_knowledges`로 조직의 지식 베이스 목록을 조회한다. 조회 전용이며, 지식 베이스를 만들거나 에이전트에 연결하는 공개 도구는 없다(연결·관리는 웹 앱에서 — `vox-web-app` 참조).

## Routing Rules

1. **1% rule** — 요청이 1%라도 특정 domain skill에 해당되면 해당 skill을 invoke한다. domain skill 내부에 사실 검증과 가드레일이 있어, router가 직접 답하면 이를 우회하게 된다.
2. **One primary skill** — 한 요청에는 하나의 primary skill만 선택한다. 두 스킬을 동시에 invoke하면 operating rule이 충돌하고 output 형식이 섞인다.
3. **UI 보충 참조** — 다른 스킬 실행 중 웹 앱 UI 경로 안내가 필요하면 `vox-web-app`을 secondary로 참조한다. UI 경로와 딥링크는 자주 변경되므로 web-app의 references가 정확한 경로를 가지고 있다.

## Routing Disambiguation

경계가 모호한 케이스의 판단 기준:

| 요청 패턴 | 라우팅 | 이유 |
|-----------|--------|------|
| 프롬프트 안에서 도구 호출 방법 언급 | `vox-agents` | 프롬프트 컨텍스트 안의 도구 언급은 prompt authoring |
| "매뉴얼 만들어줘", Manual Trigger/content/linked 체인 수정·진단 | `vox-agents` | Manual은 single-prompt Agent의 선택적 기능이며 본문 라우팅·완료 근거와 함께 설계해야 함 |
| 도구 자체의 생성/삭제/파라미터 변경 | `vox-tools` | 도구 CRUD는 tools 영역 |
| 대시보드에서 voice·속도 슬라이더 등 설정값 변경 | `vox-web-app` | UI 조작 가이드는 웹 앱 영역 |
| "더 자연스럽게 말하게", "감정 넣어서", "웃게", 구간별 속도 조절 | `vox-agents` | 발화 표현력은 프롬프트 규칙(표현력 opt-in 모듈). 판별 기준은 설정값 변경이냐 프롬프트 규칙이냐 |
| "에이전트 만들어줘" — `list_agents`가 에러(미연결)이거나 0건 | `vox-onboarding` | 온보딩 플로우에 에이전트 생성 포함. 첫 사용자 여부는 짐작하지 말고 `list_agents`를 먼저 호출해 판별한다 |
| "에이전트 만들어줘" — `list_agents`가 1건 이상 | `vox-agents` | 온보딩 이후의 에이전트 생성은 authoring |
| "flow 설계해줘", "스크립트를 노드로 변환" | `vox-flow` | flow 전용 설계 작업 |
| "node prompt 작성", "노드별 프롬프트", "condition_node 수정" | `vox-flow` | flow node 의 `data.prompt` / transition / fallback 보존은 flow 영역 |
| "flow vs single prompt 뭐가 나아?" | `vox-agents` | 유형 판단은 agents가 소유, flow 결정 시 handoff |
| "GPT-Live 에이전트 만들기", "gpt_live runtime 바꾸기", "실시간 음성 런타임" | `vox-agents` | 현재 vox.ai GPT-Live는 `single_prompt` 전용이다. Flow는 pipeline 전용이며 `flow.nodes[].data.llm`은 기존 Flow 설정이지 GPT-Live 기능이 아니다 |
| 요금/빌링/플랜/크레딧 질문 | docs MCP | 실시간 pricing 페이지 검색 |
| SDK 사용법, API reference | docs MCP | 문서 검색으로 충분 |
| "캠페인 만들어줘", "대량발신 설정" | `vox-web-app` | 대량발신/캠페인 관리는 웹 앱 영역 |
| "번호 구매 페이지 알려줘", "녹취 어디서 들어?" | `vox-web-app` | 페이지 경로/딥링크 안내 |
| "통화 기록 보여줘", "어제 통화 로그", "콜 로그에서 끊긴 원인" | `vox-web-app` | 통화 이력·녹취 조회는 monitor 영역. 데이터 확인은 `list_calls`/`get_call`, 화면 안내는 history 페이지 |
| "ARS 뚫고 상담원 연결", "IVR 메뉴 눌러야 해", DTMF 탐색 | `vox-agents` | 탐색 전략과 프롬프트는 agents 소유(IVR best practice). `send_dtmf` 장착만 필요하면 `vox-tools` secondary |
| "조직 전환", "다른 organization 으로 작업", "멀티 조직 계정" | router 직접 (org 도구) | 세션 활성 조직 전환은 domain 로직이 아닌 단일 MCP 호출 |
| "지식 베이스 뭐 있어?", "knowledge base 목록" | router 직접 (`list_knowledges`) | 지식 베이스 전용 스킬 없음 — 조회만 가능 |
| 어떤 스킬에도 매핑 안 되는 vox.ai 질문 | docs MCP → `vox-onboarding` | docs 검색 먼저, 없으면 onboarding이 가장 넓은 안내 범위 |

## 복합 요청

"프롬프트 작성 + 도구 연결"처럼 여러 영역에 걸친 요청은:
1. 핵심 작업을 primary skill로 선택 (요청의 주된 의도)
2. primary 완료 후 "도구 연결도 진행할까요?"로 secondary handoff
3. 동시 invoke하지 않는다 — 한 스킬의 output이 다음 스킬의 input이 되는 경우가 많다

## 이 스킬이 하지 않는 것

domain skill의 내용을 복제하거나 요약하지 않는다 — router가 domain 내용을 요약하면 domain skill 업데이트 시 불일치가 발생한다. 각 domain skill이 소유하는 영역은 위 Skill Catalog 참조.
