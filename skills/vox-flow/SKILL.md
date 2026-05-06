---
name: vox-flow
description: "Use when the user is designing a vox.ai flow agent — selecting node types, planning branching logic, wiring transitions, extracting variables between nodes, configuring global nodes, converting a call-center script into flow nodes, visualizing scripts as Mermaid flowcharts, or reviewing flow designs. Flow agents are the multi-node extension of prompt agents for complex scenarios. Trigger on 'flow 설계', '스크립트를 노드로 변환해줘', 'flow vs single prompt', '플로우차트 그려줘', '노드 설계', 'flow 리뷰해줘', 'condition node 설정', '플로우 검증', '노드 연결 어떻게 해', or any vox.ai flow agent question."
---

# vox-flow

vox.ai **플로우 에이전트**를 설계하는 domain skill. 여러 node를 연결해 대화 흐름을 제어한다.

Flow는 prompt agent의 확장이므로, **공통 음성 UX 규칙은 `vox-agents`의 playbook을 따른다.** 새 flow 설계 시 `vox-agents/references/voice-ai-playbook.md`를 먼저 읽어야 한다.

## Flow vs Single Prompt 판단 기준

→ `vox-agents`의 Agent Type 판단 기준 테이블 참조. Single prompt로 충분한 경우 `vox-agents` 스킬로 handoff한다.

## References

- **default-flow-data.json** — flow 기본 스키마 (begin→conversation→endCall). **flow 구조를 이해할 때 읽기.** See [references/default-flow-data.json](references/default-flow-data.json)
- **flow-guide.md** — flow 설계 통합 가이드 (edge 메커니즘, 변수 흐름, 설계 원칙). **flow를 처음 설계할 때 읽기.** See [references/flow-guide.md](references/flow-guide.md)
- **flow-sketch.md** — 스크립트 → Mermaid flowchart 시각화. **1단계: 스크립트를 처음 받았을 때 읽기.** See [references/flow-sketch.md](references/flow-sketch.md)
- **node-creation.md** — flowchart/스크립트 → 노드 markdown 변환 workflow. **2단계 시작 시 먼저 읽기.** See [references/node-creation.md](references/node-creation.md)
- **conversation-markdown.md** — conversation 노드 static/generated 작성법. **대화 노드 문구와 exit 조건을 쓸 때 읽기.** See [references/conversation-markdown.md](references/conversation-markdown.md)
- **execution-node-markdown.md** — extraction/condition/api/transfer/sendSms/tool/endCall 작성법. **대화 외 노드를 쓸 때 읽기.** See [references/execution-node-markdown.md](references/execution-node-markdown.md)
- **node-examples.md** — 긴 예시 모음. **출력 톤이나 구조 예시가 필요할 때만 읽기.** See [references/node-examples.md](references/node-examples.md)
- **node-types.md** — 노드 타입 선택 기준 + schema endpoint 사용 규칙. **특정 노드의 JSON 설정 옵션이 필요하면 먼저 schema endpoint 를 호출하기.** See [references/node-types.md](references/node-types.md)
- **flow-review.md** — 설계물 체크리스트 기반 검증. **3단계: 설계 완료 후 또는 "리뷰해줘" 요청 시 읽기.** See [references/flow-review.md](references/flow-review.md)

공통 reference (`vox-agents`에 위치):
- **variable-system.md** — 변수 naming, 추출 설정, 렌더링 위치. **extraction/condition 변수 흐름을 설계할 때 읽기.**
- **voice-ai-playbook.md** — 음성 UX 핵심 규칙. **새 flow 설계 시 가장 먼저 읽기.**
- **default-agent-data.json** + **agent-data-reference.md** — agent.data 기본값 + MCP 동작 규칙. **MCP로 에이전트를 생성할 때 읽기.**
- **ivr-navigation-best-practice.md** — IVR/DTMF 패턴. **ARS/IVR 통과 시나리오에서 읽기.**
- **voice-ai-prompt-template.md** — 프롬프트 템플릿. **conversation 노드 프롬프트 작성 시 참고.**
- **voice-ai-prompt-diagnosis.md** — 실패 사례 진단. **flow 에이전트가 이상하게 동작할 때 읽기.**
- **voice-ai-prompt-revision.md** — 진단 기반 리팩터링. **diagnosis 후 노드 프롬프트를 수정할 때 읽기.**

## Workflow

스크립트 → flow 변환 시 4단계로 진행:

1. **시각화 (flow-sketch)**: 스크립트 → Mermaid flowchart + 노드 요약 테이블
2. **상세 설계 (node creation)**: 확정된 차트의 각 노드 → flow node markdown. `node-creation.md`를 시작점으로 읽고 필요한 노드 계열 reference만 추가로 읽는다.
3. **리뷰 (flow review)**: 체크리스트 기반 검증, CRITICAL/WARN/INFO 분류
4. **dry-run 검증 (validate_flow_data)**: JSON 산출물이 준비되면 MCP `validate_flow_data` 를 호출해 결과를 사용자에게 한두 줄로 요약하고, errors / warnings 처리는 [Response Handling](#response-handling) 을 따른다. errors 가 비었을 때에만 `create_agent` / `update_agent` 호출.

사용자가 시각화만 요청하면 1단계만. "노드로 변환해줘"면 1→2단계. "리뷰해줘"면 3단계. JSON 으로 보내려면 4단계까지.

## What the API auto-fixes vs what you must get right

api-server 는 runtime 에서 깨지기 쉬운 일부 graph shape 를 validation / autofix 로 보강한다. 정확한 보정 목록과 현재 API 계약은 MCP `validate_flow_data` / `autofix_flow_data` 응답을 따른다. 이 skill 에서는 그 목록을 외우지 말고, 설계자가 책임져야 하는 사용자 경험과 시나리오 의도에 집중한다.

**Usually safe to leave to api-server / MCP dry-run**:
- edge layout / handle / basic graph default 같이 deterministic 하게 보강 가능한 값
- 실패 fallback transition / condition 처럼 표준 문구로 보강 가능한 runtime safety net
- schema default 가 있는 nested config

**You must get right**:
- top-level flow 생성 의도 (`type: "flow"`)
- 실제 URL, 전화번호/SIP URI, 대상 에이전트, 도구 식별자, SMS 본문 같은 도메인 값
- node 간 분기 의도와 condition 변수 매핑
- `api` node chain race 를 피하는 설계 (`api → bridge(skip) → api` 대신 다음 api 의 안내문에 합치거나 `condition` node 사용)
- fallback/recovery edge 의 사용자 경험 — API가 fallback transition 은 만들 수 있어도 어떤 안내/재시도/전환 노드로 보낼지는 설계자가 정해야 함
- sendSms fail 분기는 성공 분기와 다른 wrap-up 으로 보내고 사용자에게 SMS 실패를 고지 (자세한 패턴은 `execution-node-markdown.md`)
- 구체적 일자/시간을 한 노드에서 묶어 받기 (turn 절약)
- API 가 availability / eligibility 만 확인하는 단계에서는 고객이 요청한 날짜, 시간, 수량, 수신자 정보를 confirmation 과 wrap-up 의 source of truth 로 유지하기. API 가 같은 값을 명시적으로 echo 하지 않는 한 generic 응답 필드(`$.data.date`, `$.data.time` 등)로 고객 요청값을 덮어쓰지 않는다.
- 마무리 발화 + 작별 인사 (rubric 평가 시 필수)

## Node Type 요약

아래 표는 설계 대화를 위한 개념 요약이다. 실제 `flow_data` JSON 을 작성할 때는 이 표나 로컬 reference 를 schema source 로 쓰지 않는다. 먼저 MCP `get_schema(namespace='flow-schema', schema_type='flow-data')` 로 graph envelope 를 확인하고, `list_schemas(namespace='flow-schema', category='flow-node')` 와 `get_schema(namespace='flow-schema', schema_type='node-api')` 같은 node type별 schema 로 현재 field, enum, required 여부를 확인한다.

| Node | 용도 |
|------|------|
| `begin` | flow 시작점 |
| `conversation` | LLM 기반 대화 수행 |
| `tool` | vox.ai 등록 도구 실행 |
| `api` | HTTP API 호출 + 응답 변수 추출 |
| `sendSms` | SMS 발송 |
| `condition` | 변수 기반 조건 분기 (대화 없음) |
| `extraction` | 대화 컨텍스트에서 변수 추출 |
| `transferCall` | 통화 전환 (cold/warm) |
| `transferAgent` | 에이전트 전환 |
| `endCall` | 통화 종료 |
| `note` | 메모 (실행 없음) |

각 노드의 의미/사용 판단 → `node-types.md` 참조. Deprecated: `function` (→ `tool`), `knowledge` (→ conversation node-level). 정확한 schema 는 항상 MCP schema endpoint 결과를 따른다. `tier` 는 api-server validation/autofix 내부 분류일 뿐이며, flow 작성 모델로 사용자에게 노출하지 않는다.

## 설계 패턴

**Linear**: `begin → 인사 → 본인확인 → 안내 → endCall`

**Branching**: `begin → 의도파악 → condition → 시나리오A/B/C → endCall`

**Data Collection**: `begin → extraction(이름) → extraction(번호) → api(조회) → condition → 안내 → endCall`

**Transfer Fallback**: `begin → 대화 → transferCall → (성공)종료 / (fallback)안내 → 재시도/endCall`

## Core Operating Rules

1. **공통 규칙 먼저** — flow에서도 실패 원인의 대부분은 음성 UX 위반(장문 발화, 부정확한 사실)이므로, `vox-agents`의 voice-ai-playbook 규칙(사실성 우선, 트레이드오프, 런타임 vs 개발 산출물 구분)이 flow에도 동일하게 적용된다.
2. node type, field, enum, required 여부를 추측하지 않는다 — `flow_data` 작성 직전에 `get_schema(namespace='flow-schema', schema_type='flow-data')` 로 graph envelope 를 확인하고, 실제 노드 JSON 은 `list_schemas(namespace='flow-schema', category='flow-node')` 로 찾은 `node-{type}` schema 를 기준으로 만든다.

> **Top-level `type: "flow"` 누락 = silent 실패.** `create_agent` 호출 시 top-level 에 `type: "flow"` 가 없으면 백엔드는 default `single_prompt` 로 저장하고 `flow_data` 는 null 로 떨어진다. JSON 응답이 200 이어도 round-trip 시 flow_data 가 비어 있다면 가장 먼저 `type` 누락을 의심한다.


3. deprecated node(`function`, `knowledge`)는 신규 flow에 사용하지 않는다 — 대시보드에서 더 이상 추가할 수 없고, 향후 런타임 지원이 제거될 수 있다.
4. node 수는 최소화 — 불필요한 분할은 edge 관리를 복잡하게 하고 유지보수 비용이 증가한다.
5. 변수 이름은 snake_case, 의미가 명확한 이름 사용 — condition node와 변수 렌더러가 snake_case를 전제로 동작하며, 모호한 이름(val1, temp)은 노드 간 전달 시 혼동을 일으킨다.
6. 전환조건에 "다음 단계 이름"을 쓰지 않는다 — exit 조건만 정의해야 노드 순서가 바뀌어도 LLM이 올바르게 판단한다.
7. **산출물 경로는 두 가지** — (a) 대시보드 flow editor 에 사람이 직접 입력하는 노드 markdown, (b) v3 REST API (`PATCH /v3/agents/{id}` with `flow_data`) 또는 동등한 vox.ai MCP `create_agent` / `update_agent` 의 `flow_data` 파라미터로 보내는 JSON. JSON surface 는 schema endpoint 가 authoritative 하며, 수정은 항상 **전체 교체** 방식 — 기존 노드 일부만 patch 하지 않고 nodes/edges 전체를 다시 보낸다.
8. **Schema endpoint 우선** — `references/node-types.md` 는 node 선택과 실수 방지 playbook 이다. 실제 필드 목록을 복사하지 말고, 작업 중 받은 `flow-data` + `node-{type}` schema 결과를 기준으로 `flow_data` 를 작성한다. 전송 후 `get_agent` 로 round-trip 확인해 unknown field drop 을 잡는다.
9. **flow_data 전송 전 dry-run 먼저** — `create_agent` / `update_agent` 의 `flow_data` 를 보내기 전, MCP `validate_flow_data(flow_data=...)` 를 먼저 호출해 dry-run 한다. 응답의 `errors` 가 비었을 때만 진짜 호출하고, `warnings` / `fixed_flow_data` / `validation_message` 가 있으면 사용자에게 한두 줄로 요약 전달한다. 정확한 API 응답 shape 해석은 MCP가 담당하므로 skill 안에서 field contract 를 외워 맞추지 않는다.
10. **nested config default 는 백엔드가 채운다** — 인증/헤더/바디 옵션처럼 schema default 가 있는 nested config 를 LLM 이 외워 채울 필요 없다. URL, 전환 대상, 도구 ID처럼 시나리오가 결정해야 하는 실제 값만 명시하고, 나머지는 schema endpoint 와 MCP dry-run 결과를 따른다.

## Boundary Rule

- **Runtime 에서 문제나는 케이스**: api-server validation / autofix 가 막거나 보강한다. skill 은 같은 검증 로직을 복제하지 않는다.
- **API layer 설명과 정상 작동 보장**: MCP `list_schemas`, `get_schema`, `validate_flow_data`, `autofix_flow_data`, `create_agent`, `update_agent` 가 담당한다. skill 은 이 도구들을 호출하는 순서와 결과 처리만 안내한다.
- **운영 팁 / 시나리오 분석 / 생성**: 이 skill 이 담당한다. 사용자 경험, fallback 안내 문구, 노드 수 줄이기, scenario_test 통과 패턴 같은 판단을 여기에 둔다.

## Response Handling

`validate_flow_data` / `create_agent` / `update_agent` 의 검증 결과를 어떻게 다루는지 정리.

### `validate_flow_data` 응답

- `valid: true` + `errors: []` → 안전. `fixed_flow_data` 가 있으면 그 값을, 없으면 원래 flow_data 를 `create_agent` / `update_agent` 로 보낸다.
- `valid: true` + `warnings: [...]` → 자동 보정이 적용되었거나 권장 사항이 있음. 사용자에게 한두 줄로 요약 후 진행 (예: "api 노드 X 에 실패 fallback 자동 추가됨").
- `valid: false` → `errors[]` 의 각 항목 (`field`/`code` 또는 `rule`/`node_id`, `message`, `suggestion`) 을 읽고 1회 수정 후 재검증. 같은 error 가 다시 나오면 사용자에게 보고하고 멈춘다.

### `create_agent` / `update_agent` 422 / 400 응답

MCP가 정규화해 보여주는 error 메시지를 기준으로 수정한다. API 응답 envelope 나 내부 error shape 를 skill 에서 직접 해석하지 않는다.

### `create_agent` / `update_agent` 성공 응답의 자동 보정 안내

MCP가 자동 보정 안내 텍스트를 제공하면 그대로 전달한다. 안내가 비어 있으면 추가로 보고할 내용이 없는 것이다.

### 반복 실패 처리

같은 dry-run error 가 2번 연속 나오면 API 계약을 추측해서 고치지 말고, MCP `get_schema` 를 다시 호출해 현재 shape 를 확인한 뒤 사용자에게 어떤 값이 필요한지 보고한다.

## Ownership Boundary

| Owns | Does Not Own |
|------|--------------|
| flow design / node conversion / review | prompt authoring / diagnosis / revision (→ vox-agents) |
| node types / transitions / patterns | tool management (→ vox-tools) |
| variable system (flow scope) | web app UI guide (→ vox-web-app) |
| flow sketch / Mermaid visualization | pricing / billing |
| global node configuration | phone number management |

## Related Resources

### MCP Tools (vox.ai)
- `create_agent` — flow 에이전트 생성 (`type: "flow"`)
- `update_agent` — 에이전트 설정 수정 (전체 `flow_data` 교체)
- `update_agent_partial(agent_id, operations[])` — flow_data 부분 수정. 각 operation 은 `{op: addNode|removeNode|updateNode|addEdge|removeEdge|updateEdge|cleanStaleEdges, ...}` shape. atomic 적용 + 전체 graph validation. 토큰 절감용 — 노드 1~2 개만 바꿀 때 사용.
- `get_agent` — 기존 에이전트 설정 확인 (flow_data 포함)
- `list_agents` — 에이전트 목록
- `validate_flow_data(flow_data=...)` — flow_data dry-run. 응답의 `errors` 가 비었을 때만 `create_agent` / `update_agent` 를 호출한다. 서버/도구 버전에 따라 `fixed_flow_data` / `warnings` 가 있으면 그 보정 결과와 안내를 사용자에게 전달한다.
- `autofix_flow_data(flow_data, apply_fixes=false|true)` — safe deterministic graph fix 를 dry-run / apply 한다. 도메인 값과 recovery edge 의 UX 의도는 자동 fix 대상이 아니므로, `remaining_errors` 와 runtime review 결과를 보고 설계자가 결정한다.
- `list_schemas(namespace='flow-schema', category='flow-node')` — MCP 가 노출하는 n8n-style flow node catalog. 특정 node JSON 을 작성하기 전에 사용 가능한 `node-{type}` schema 를 확인한다.
- `get_schema(namespace='flow-schema', schema_type='flow-data', detail='standard'|'minimal')` — flow graph envelope JSON Schema. nodes / edges / viewport 같은 graph-level shape 확인용이다.
- `get_schema(namespace='flow-schema', schema_type='node-api', detail='standard'|'minimal')` — node type별 JSON Schema. `node-conversation`, `node-sendSms`, `node-tool` 등 실제 사용할 node type 에 맞춰 호출한다. `detail='minimal'` 은 description / title / examples 를 제거한 lean payload (≈40-50% token savings) — schema shape 가 익숙할 때만 사용. `create_agent` / `update_agent` / `update_agent_partial` 의 `flow_data` 구성 전에 호출.

### Docs (vox.ai docs / vox-docs)
- `docs/build/flow/overview` — 플로우 에이전트 개요
- `docs/build/flow/nodes/overview` — 노드 타입 개요
- `docs/build/flow/nodes/begin-node` — 시작 노드
- `docs/build/flow/nodes/conversation-node` — 대화 노드
- `docs/build/flow/nodes/api-node` — API 노드
- `docs/build/flow/nodes/condition-node` — 조건 노드
- `docs/build/flow/nodes/extraction-node` — 추출 노드
- `docs/build/flow/nodes/tool-node` — 도구 노드
- `docs/build/flow/nodes/transfer-node` — 통화 전환 노드
- `docs/build/flow/nodes/transfer-agent-node` — 에이전트 전환 노드
- `docs/build/flow/nodes/end-node` — 종료 노드
- `docs/build/flow/transitions` — 전환 조건
- `docs/build/flow/advanced/global-node` — 글로벌 노드

### App URLs
- `https://www.tryvox.co/flow/{flowId}` — 플로우 에디터
- `https://www.tryvox.co/agent/{agentId}` — 에이전트 상세
- `https://www.tryvox.co/dashboard/{organizationId}/agents` — 에이전트 목록
