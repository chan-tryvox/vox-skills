---
name: vox-flow
description: "Use when the user is designing a vox.ai flow agent — selecting node types, planning branching logic, wiring transitions, extracting variables between nodes, configuring global nodes, converting a call-center script into flow nodes, visualizing scripts as Mermaid flowcharts, or reviewing flow designs. Flow agents are the multi-node extension of prompt agents for complex scenarios. Trigger on 'flow 설계', '스크립트를 노드로 변환해줘', 'flow vs single prompt', '플로우차트 그려줘', '노드 설계', 'flow 리뷰해줘', 'condition node 설정', '플로우 검증', '노드 연결 어떻게 해', or any vox.ai flow agent question."
license: MIT
compatibility: "Requires the vox MCP server (https://mcp.tryvox.co/mcp, OAuth login on first tool call), registered by the vox-ai plugin. Works in Claude Code, Codex, and any agentskills.io-compatible client; the vox CLI bundles the same skill offline."
---

# vox-flow

vox.ai **플로우 에이전트**를 설계하는 domain skill. 여러 node를 연결해 대화 흐름을 제어한다.

Flow는 prompt agent의 확장이므로, **공통 음성 UX 규칙은 `vox-agents`의 playbook을 따른다.** 새 flow 설계 시 `vox-agents` 스킬을 먼저 호출해 그 규칙을 받는다.

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

`vox-agents` 스킬이 소유한 공통 지식은 파일 경로로 열지 말고 **`vox-agents` 스킬을 호출**해 받는다 — 플러그인 설치 위치에 따라 다른 스킬의 상대 경로는 해석되지 않는다. 호출 시점:
- 새 flow 설계 시작 — 음성 UX 핵심 규칙(voice-ai-playbook). **가장 먼저.**
- extraction/condition 변수 흐름 설계 — 변수 naming·추출 설정·렌더링 위치(variable-system).
- MCP로 에이전트를 생성하며 agent `data` 도 보낼 때 — agent.data 동작 규칙(값은 복사하지 말 것 — override 안 하는 sub-schema는 OMIT, 기본값은 api-server가 채움).
- ARS/IVR 통과 시나리오 — IVR/DTMF 패턴.
- generated conversation 노드의 `data.prompt` 를 채울 때 — 프롬프트 템플릿을 checklist 로 참고하되 전체 prompt 를 복사하지 않는다.
- flow 에이전트가 이상하게 동작할 때 — 실패 사례 진단, 그 뒤 노드 프롬프트 수정(진단 기반 리팩터링).

## Workflow

스크립트 → flow 변환 시 4단계로 진행:

1. **시각화 (flow-sketch)**: 스크립트 → Mermaid flowchart + 노드 요약 테이블
2. **상세 설계 (node creation)**: 확정된 차트의 각 노드 → flow node markdown. `node-creation.md`를 시작점으로 읽고 필요한 노드 계열 reference만 추가로 읽는다.
3. **리뷰 (flow review)**: 체크리스트 기반 검증, CRITICAL/WARN/INFO 분류
4. **JSON 작성/전송 loop**: `schema 조회 → fill → validate → save` 순서로 진행한다.
   - **schema 조회**: [Schema Fetching](#schema-fetching) 으로 current `flow` schema 를 가져온다.
   - **fill**: schema 기준으로 `nodes[]`, `edges[]`, node `data` 를 채운다. flow graph 만 만들거나 검증하는 작업이면 agent 최상위 `data` 는 생략하고, reference 표나 기억으로 field/enum/required 여부를 추측하지 않는다.
   - **validate**: MCP `validate_flow(flow=..., level="all")` 를 호출하고 `errors` / `advisories` 를 [Response Handling](#response-handling) 기준으로 처리한다.
   - **save**: blocking `errors` 가 비었을 때에만 `create_agent(flow=...)` / `update_agent(flow=...)` 를 호출한다.

사용자가 시각화만 요청하면 1단계만. "노드로 변환해줘"면 1→2단계. "리뷰해줘"면 3단계. JSON 으로 보내려면 4단계까지. 각 단계에서 여는 reference 는 위 목록의 해당 파일 하나(2단계는 `node-creation.md` + 필요한 노드 계열 1개)로 제한한다. 새 작성/수정은 `flow` 를 사용하고, legacy `flow_data` 경계는 [Incremental Editing](#incremental-editing) 한 곳에서 정의한다.

## Schema Fetching

`flow` JSON 을 작성하기 직전에 schema 를 가져온다. **default 는 단일 호출이다.**

### Default — `flow-data` minimal 한 번

```text
get_schema(namespace="flow-schema", schema_type="flow-data", detail="minimal")
```

이 한 응답에 public `flow` graph (`nodes[]`, `edges[]`), edge `condition`, `skip_user_response`, 모든 node type 의 `data` shape 가 `$defs` 로 함께 포함되어 온다. 먼저 이 응답으로 작성하고, 설명 문구가 필요한 일부 node type 만 standard 로 보강한다.

flow 에 `api` / `transferCall` / `transferAgent` / `sendSms` / `tool` 노드 중 **하나라도** 있으면, 다음 [standard 모드로 보강이 필요한 노드 type](#standard-모드로-보강이-필요한-노드-type) 단계를 추가로 거친다. `begin` / `conversation` / `condition` / `extraction` / `endCall` / `note` 만 사용하는 flow 라면 이 minimal 한 번으로 충분하다.

agent `data` 도 같이 보낼 경우 별도로 한 번 더 호출한다.

```text
get_schema(namespace="agent-schema", schema_type="agent-data-create", detail="minimal")
get_schema(namespace="agent-schema", schema_type="agent-data-update", detail="minimal")
```

### standard 모드로 보강이 필요한 노드 type

다음 node type 중 **하나라도 flow 에 등장하고 설명 문구가 필요하면** 그 type 에 한해 standard 모드로 한 번 더 fetch 한다:

```text
get_schema(namespace="flow-schema", schema_type="node-api", detail="standard")
get_schema(namespace="flow-schema", schema_type="node-transferCall", detail="standard")
get_schema(namespace="flow-schema", schema_type="node-transferAgent", detail="standard")
get_schema(namespace="flow-schema", schema_type="node-sendSms", detail="standard")
get_schema(namespace="flow-schema", schema_type="node-tool", detail="standard")
```

standard 보강으로 확인할 수 있는 대표 정보:

- **`node-api`** — `api_configuration.body` 가 JSON 문자열인지 object 인지, `response_variables.json_path` 의 JSONPath 문법 예시, `auth_type` × `auth_credentials` 조합 의미
- **`node-transferCall`** — `transfer_configuration.transfer_to` 가 phone number vs SIP URI 어느 쪽인지, `transfer_type` (cold/warm) 의 동작 차이, `sip_headers` 사용법, `displayed_caller_id` (agent/user) 의미
- **`node-transferAgent`** — `agent.agent_id` 가 같은 조직 agent UUID 라는 운영 제약, `preserve_chat_context` 의 의미
- **`node-sendSms`** — `static_image_file_keys` 가 어떤 S3 key 형식인지, `sms_from_number` 가 등록된 발신번호여야 한다는 제약
- **`node-tool`** — `tool_id` (custom tool UUID) 의 의미. built-in tool 설정은 agent `data.builtInTools` schema surface 를 별도로 확인한다.

위 type 이 flow 에 없다면 (`begin` / `conversation` / `condition` / `extraction` / `endCall` / `note` 만 사용), minimal flow-data 한 번이면 충분하다.

### 그 외 narrow case fallback

다음 좁은 경우에도 per-node 호출이 도움이 된다.

- flow 가 매우 큼 (15+ 노드, 다양한 type) + LLM context budget 이 빡빡해서 minimal envelope 도 부담스러울 때 → 사용한 type 별 minimal per-node 호출로 분할
- 같은 flow 를 반복 patch 하면서 envelope 은 캐시하고 한 노드 type 의 detail 만 다시 standard 모드로 보고 싶을 때
- `validate_flow` 가 같은 node type 에서 같은 룰로 반복 실패할 때 → 그 type 만 standard 모드로 받아 description 으로 디버깅

이 경우에만 `list_schemas(namespace="flow-schema", category="flow-node")` 로 카탈로그를 받아 어떤 node type 이 있는지 metadata only 로 확인할 수 있다 (응답은 `schema: null`).

### 절대 하지 말 것

- 위 보강 대상 외 type 에 standard 모드 사용 — minimal 로 시작.
- `get_schema(flow-data)` 와 `get_schema(node-{type})` 를 같은 type 으로 둘 다 minimal 호출 — flow-data 가 이미 그 $def 를 포함하므로 토큰 중복. (위 standard 보강은 detail 이 다르므로 중복 아님.)

## Node Type 요약

아래 표는 설계 대화를 위한 개념 요약이다. 실제 `flow` JSON 을 작성할 때는 이 표나 로컬 reference 를 schema source 로 쓰지 말고, [Schema Fetching](#schema-fetching) 에 따라 `get_schema('flow-data', detail='minimal')` 한 번을 호출해 현재 node type, field, enum, required 여부를 확인한다.

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

각 노드의 의미/사용 판단 → `node-types.md` 참조. Deprecated: `function` / legacy `knowledge` node. 호환성을 위해 기존 flow 조회 결과에는 보일 수 있지만, public `flow` write 에는 넣지 않는다. 정확한 schema 는 항상 MCP schema endpoint 결과를 따른다.

## 설계 패턴

**Linear**: `begin → 인사 → 본인확인 → 안내 → endCall`

**Branching**: `begin → 의도파악 → condition → 시나리오A/B/C → endCall`

**Data Collection**: `begin → extraction(이름) → extraction(번호) → api(조회) → condition → 안내 → endCall`

**Transfer Fallback**: `begin → 대화 → transferCall → (성공)종료 / (fallback)안내 → 재시도/endCall`

## Core Operating Rules

## Agent-level runtime versus node overrides

Current vox.ai GPT-Live, Grok Voice, and Gemini Live runtimes support
`single_prompt` agents only. Flow agents use the `pipeline` runtime; sending
`type: "flow"` with `data.runtime.type` set to `gpt_live`, `grok_voice`, or
`gemini_live` is rejected. Do not implicitly convert or migrate an existing
Flow to `single_prompt`.

When editing an existing Flow, preserve every `flow.nodes[].data.llm` override.
Those are legacy Flow node settings, not a native live feature. Do not rewrite
node LLMs to the agent-level `data.llm` or a native live model, and do not put
native live voice under a Flow node or pipeline `data.voice` field.

If the flow request also carries agent data, read the current agent schema first.
Keep existing Flow runtime and node-level LLM settings within the Flow
contract. Native live payload authoring belongs to `vox-agents` and must use
`type: "single_prompt"`.

Before an `update_agent` write, read the current agent revisions and pass the
observed `expected_head_revision`. Replacing the entire Flow graph also requires
the matching `expected_flow_revision`. On `REVISION_CONFLICT`, stop and surface
the conflict; do not automatically fetch the latest graph and retry.

1. **공통 규칙 먼저** — flow에서도 실패 원인의 대부분은 음성 UX 위반(장문 발화, 부정확한 사실)이므로, `vox-agents`의 voice-ai-playbook 규칙(사실성 우선, 트레이드오프, 런타임 vs 개발 산출물 구분)이 flow에도 동일하게 적용된다.
2. node type, field, enum, required 여부를 추측하지 않는다 — `flow` 작성 직전에 `get_schema(namespace='flow-schema', schema_type='flow-data', detail='minimal')` 를 한 번 호출하고 그 결과를 기준으로 JSON 을 만든다. 이 한 응답에 graph shape, edge condition, 모든 node type 의 `data` shape 가 함께 들어온다. per-node `get_schema(node-{type})` 는 narrow case 의 보조 호출이지 default 가 아니다. 자세한 패턴은 [Schema Fetching](#schema-fetching).
3. deprecated node(`function`, legacy `knowledge`)는 신규 flow에 사용하지 않고, 기존 flow 수정 시에도 public `flow` write 전에 마이그레이션한다. `function`은 `tool` 또는 `api`로, legacy `knowledge`는 `conversation` node의 node-level knowledge 설정으로 옮긴다. 마이그레이션할 수 없으면 `update_agent(flow=...)` 로 round-trip 하지 말고 legacy `flow_data` 유지보수 경로를 사용하거나 사용자에게 막힌 이유를 보고한다.
4. node 수는 최소화 — 불필요한 분할은 edge 관리를 복잡하게 하고 유지보수 비용이 증가한다.
5. 변수 이름은 snake_case, 의미가 명확한 이름 사용 — condition node와 변수 렌더러가 snake_case를 전제로 동작하며, 모호한 이름(val1, temp)은 노드 간 전달 시 혼동을 일으킨다.
6. 전환조건에 "다음 단계 이름"을 쓰지 않는다 — exit 조건만 정의해야 노드 순서가 바뀌어도 LLM이 올바르게 판단한다.
7. **conversation JSON 은 mode와 exit 조건을 빠뜨리지 않는다** — static 문구는 `prompt_type:"static"` + `static_sentence`, generated 대화는 `prompt_type:"dynamic"` + `prompt`/`first_message` 로 작성한다. 일반 out-edge 의 `condition` 은 빈 값/null/"None" 이 아니라 사용자가 그 노드를 벗어나도 되는 의미 있는 한국어 exit 조건이어야 한다. 조건 없는 edge 는 자동 진행이 아니라 dead route 가 된다.
8. **검증/비교는 정답 데이터 출처가 있어야 한다** — 본인확인, 예약조회, 계약검증처럼 사용자의 답을 기존 데이터와 비교해야 하는 flow 는 먼저 정답값 출처를 정한다. API node 의 `response_variables` 또는 통화 시작 전 주입된 preset dynamic variables 가 없으면 "일치 확인"이라고 말하거나 condition 으로 검증하지 않는다. 그런 경우는 정보 수집 flow 로 낮추거나, 조회 API 를 추가한다.
9. **동일 인물/동일 대상 shortcut 을 명시한다** — "계약자와 학습자가 본인", "예약자와 방문자가 동일"처럼 앞에서 받은 답이 뒤 질문의 답을 결정하면 다시 묻지 않는다. extraction 에서 동일성 변수(`is_same_person` 등)를 만들고 condition 으로 재사용 path 와 추가질문 path 를 나눈다.
10. **Write contract** — For REST or vox.ai MCP, use the public `flow` parameter for current graphs and replace the complete node/edge graph. Read the current agent first; every `update_agent` call requires the observed `expected_head_revision`, and a full Flow replacement also requires the observed `expected_flow_revision`. On `REVISION_CONFLICT`, stop without an automatic retry. Preserve a legacy graph only through full `flow_data` replacement where supported; `update_agent_partial` is retired.
11. **Schema endpoint 우선** — `references/node-types.md` 는 node 선택과 실수 방지 playbook 이다. 실제 필드 목록을 복사하지 말고, 작업 중 받은 `get_schema(flow-data, minimal)` 결과를 기준으로 `flow` 를 작성한다. 전송 후 `get_agent` 로 round-trip 확인해 unknown field drop 을 잡는다.
12. **flow 전송 전 dry-run 먼저** — `create_agent` / `update_agent` 의 `flow` 를 보내기 전 `validate_flow(flow=..., level="all")` 를 호출하고, `errors` 가 비었을 때만 진짜 호출한다. 응답별 처리와 legacy `flow_data` 도구는 [Response Handling](#response-handling) 한 곳에서만 정의한다.
13. **nested config default 는 백엔드가 채운다** — `api_configuration` 의 인증/헤더/바디 옵션, `extraction_configuration`, `transfer_configuration`, `knowledge` 같은 nested 객체의 모든 필드를 LLM 이 외워 채울 필요 없다. `url`, `agent.agent_id`, `tool_id` 처럼 누락 시 진짜 차단 오류가 나는 식별자만 명시하고, 나머지는 사용자가 의도적으로 지정한 키만 보낸다. 외운 default 를 강제로 채워 넣으면 schema 진화에 뒤처지고 dry-run warnings 만 늘어난다.
14. **외부 fixture 값은 만들지 않는다** — `transferCall` 은 실제 전화번호/SIP target 이 있을 때만 쓰고, `transferAgent` 는 실제 대상 agent UUID 가 있을 때만 쓴다. `tool` 은 `list_tools` 결과의 실제 id 를 사용한다. `sendSms` 의 발신번호/첨부 파일 key 처럼 운영 리소스가 필요한 값은 시나리오나 API가 제공하지 않으면 비워 두거나 해당 노드를 쓰지 않는다. placeholder 번호, 임의 UUID, 가짜 sender 를 넣지 않는다.
15. **agent `data` 는 요청받은 것만, 기본값은 서버가 채운다** — flow graph 만 생성·검증하는 작업이면 `create_agent(name, type="flow", flow=...)` 처럼 `data` 없이 보낸다. `data` 를 같이 보내야 할 때도 override 하지 않는 sub-schema(`llm`/`voice`/`speech`/`stt.speed` 등)는 OMIT 해 api-server 기본값을 받는다 — schema 에 보인다는 이유로 기본값을 복사하지 않는다. 명시 override 시 허용값은 `list_llm_models`/`list_voice_models`, shape 는 `get_schema(... detail="minimal")` 로 확인한다. 한국어 STT 는 `stt.languages:["ko"]`, voice locale 은 `voice.language:"ko-KR"` 로 분리하고, `speech.responsiveness` 는 요구가 없으면 `1.0` 을 유지한다.
16. **edge 의미를 fallback 으로 뭉개지 않는다** — `begin` 에서 첫 실행 node 로 가는 edge 에는 `skip_user_response:true` 를 붙이지 않는다. extraction 완료, static one-shot 안내 후 다음 단계, API 성공 후 일반 진행처럼 정상 진행이 확정된 edge 는 명시적인 condition 으로 표현하고, fallback 은 실패/else/default 복구 path 에만 쓴다.
17. **"확인" 요구는 실제 확인 turn 으로 만든다** — 사용자가 수집 정보 요약을 확인받으라고 했으면 endCall 종료 멘트에 요약을 넣는 것만으로 끝내지 않는다. 요약을 읽고 "맞으면 진행, 틀리면 수정"을 받는 conversation node 와 확인/수정 edge 를 둔 뒤 종료한다.
18. **분기용 제어 변수를 그대로 말하지 않는다** — `is_emergency`, `address_complete`, `access_allowed` 같은 boolean/control variable 은 condition branching 에 쓰는 내부 상태다. endCall 또는 conversation 의 사용자-facing 문구에서 `{{is_emergency}}` 처럼 그대로 읽히게 하지 말고, 자연어 문장이나 별도 string summary 변수로 바꾼다.

## Response Handling

`validate_flow` / `create_agent` / `update_agent` 의 검증 결과를 어떻게 다루는지 정리.

### `validate_flow` 응답

- `valid: true` + `errors: []` + `advisories: []` → 안전. 그대로 `create_agent(flow=...)` / `update_agent(flow=...)` 호출.
- `valid: true` + `errors: []` + `advisories: [...]` → 저장은 가능하지만 실행 중 주의 항목이 있음. 사용자에게 한두 줄로 요약 후 진행한다. 예: terminal node 가 begin 에서 도달되지 않거나 skip/fallback wakeup transition 이 연결되지 않은 경우.
- `valid: false` → `errors[]` 의 각 항목 (`rule`, `node_id`, `message`, `suggestion`) 을 읽고 1회 수정 후 재검증. 같은 rule 이 다시 나오면 사용자에게 보고하고 멈춘다.
- `deprecated_node_unsupported` → 기존 flow 조회 결과에 read-only compatibility node(`function`, legacy `knowledge`)가 포함된 상태다. public `flow` 로 저장하기 전에 지원되는 node type 으로 마이그레이션한다. 단순 보존 목적이면 `update_agent(flow=...)` 를 호출하지 않는다.

### Legacy `flow_data` tools

`validate_flow_data` 와 `autofix_flow_data` 는 legacy `flow_data` graph 전용이다. 새 flow 작성에는 쓰지 않는다.

- legacy payload 를 유지보수해야 하면 `validate_flow_data(flow_data=...)` 로 dry-run 하고, `errors` 가 비었을 때만 legacy write 를 진행한다.
- `warnings` 또는 `fixed_flow_data` 가 있으면 자동 보정 preview 이므로 사용자에게 한두 줄로 전달한다.
- `autofix_flow_data(flow_data=..., apply_fixes=true)` 를 썼다면, 보정본을 곧장 보내지 말고 `validate_flow_data` 로 다시 dry-run 한다.
- `update_agent_partial` is a retired legacy name. The current CLI/MCP client rejects it locally and sends no API request. Do not use it.

### `create_agent` / `update_agent` 422 / 400 응답

응답 envelope 가 `{"error": {"code": "VALIDATION_ERROR", "details": {"errors": [...]}}}` 형태이면 `details.errors[]` 를 위 dry-run 과 동일한 룰별 처리로 다룬다. 그 외 schema 검증 실패는 nodes / edges / node data 자체를 점검한다.

### `advisories` 빠른 참조

저장은 가능하지만 사용자에게 알려야 하는 실행 중 주의 항목:
- `unconnected_skip_user_response_transition` — skip/wakeup transition 이 outgoing edge 없이 남아 있음
- `unconnected_fallback_transition` — fallback transition 이 outgoing edge 없이 남아 있음
- `no_terminal_reachable` — begin 으로부터 endCall / transferCall / transferAgent 도달 경로 없음

## Incremental Editing

새 flow 작성/수정에서는 `update_agent(flow=...)` 로 전체 graph 를 보낸다. 보내지 않은 노드/엣지는 삭제로 간주되므로, 기존 flow 를 수정할 때는 먼저 `get_agent` 로 현재 `flow` 를 읽고, 변경하지 않는 nodes/edges 를 그대로 보존한 뒤 전체 graph 를 다시 보낸다.

단, 현재 `flow.nodes[]` 에 `function` 또는 legacy `knowledge` node 가 있으면 public `flow` write 는 거절된다. 먼저 지원되는 node type 으로 마이그레이션하거나, 해당 legacy graph 를 보존해야 하면 `flow_data` 유지보수 경로를 쓴다.

### Current write path vs retired partial helper

| 상황 | 도구 |
|------|------|
| public `flow` 생성/수정 | `create_agent(flow=...)` / `update_agent(flow=...)` |
| public `flow` read contains `function` / legacy `knowledge` node | Migrate to a supported node type before `update_agent(flow=...)`; preserve only through legacy `flow_data` where necessary |
| Maintain an existing `flow_data` graph | Check its schema and use full `update_agent(flow_data=..., expected_head_revision=...)` replacement |
| `update_agent_partial` appears in a tool list | Retired helper; locally rejected, no API request |

Prefer public `flow`. Do not use the retired partial helper; use a full `flow_data` replacement only when preserving an existing legacy graph.

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
- `create_agent` — flow 에이전트 생성 (`type: "flow"`, `flow=...`)
- `update_agent` — 에이전트 설정 수정 (`flow` 는 전체 교체)
- `update_agent_partial` — retired legacy name; the current client rejects it locally and sends no request. Use `update_agent(flow=...)` for current graphs or full `flow_data` replacement only when preserving a legacy graph.
- `get_agent` — 기존 에이전트 설정 확인 (`flow` 포함, `flow_data` 는 deprecated compatibility)
- `list_agents` — 에이전트 목록
- `get_schema(namespace='flow-schema', schema_type='flow-data', detail='minimal')` — **default 호출.** public `flow` graph + edge condition + 모든 node type 의 `data` shape 가 한 응답에 들어온다. `flow` 구성 전 1회 호출.
- `list_schemas(namespace='flow-schema', category='flow-node')` — narrow case 보조. 사용 가능한 node type 카탈로그 (`node-conversation`, `node-api`, ...). schema body 는 빠진 metadata only.
- `get_schema(namespace='flow-schema', schema_type='node-{type}')` — narrow case 보조. 특정 node 의 `data` shape 만. 일반적으로는 위 `flow-data` 한 번으로 충분하므로 호출하지 않는다.
- `validate_flow(flow=..., level='critical'|'runtime'|'all')` — public `flow` dry-run. 응답: `{valid, errors, advisories}`. `create_agent(flow=...)` / `update_agent(flow=...)` 직전에 호출한다.
- `validate_flow_data(flow_data=...)` — deprecated legacy `flow_data` graph dry-run.
- `autofix_flow_data(flow_data=..., apply_fixes?)` — deprecated legacy `flow_data` 보정 helper.

### Docs (vox.ai docs / vox-docs)
- `https://docs.tryvox.co/docs/build/flow/overview` — 플로우 에이전트 개요
- `https://docs.tryvox.co/docs/build/flow/nodes/overview` — 노드 타입 개요
- `https://docs.tryvox.co/docs/build/flow/nodes/begin-node` — 시작 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/conversation-node` — 대화 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/api-node` — API 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/condition-node` — 조건 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/extraction-node` — 추출 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/tool-node` — 도구 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/transfer-node` — 통화 전환 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/transfer-agent-node` — 에이전트 전환 노드
- `https://docs.tryvox.co/docs/build/flow/nodes/end-node` — 종료 노드
- `https://docs.tryvox.co/docs/build/flow/transitions` — 전환 조건
- `https://docs.tryvox.co/docs/build/flow/advanced/global-node` — 글로벌 노드

### App URLs
- `https://www.tryvox.co/flow/{agentId}` — 플로우 에이전트 에디터. **agent_id 를 그대로 쓴다 — 별도 flow_id 가 아니다.** (UI 경로 정본은 `vox-web-app` 딥링크 치트시트)
- `https://www.tryvox.co/dashboard/{organizationId}/agents` — 에이전트 목록
