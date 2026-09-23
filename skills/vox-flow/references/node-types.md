# Node Types: schema endpoint playbook

이 파일은 node type 을 고르는 기준과 흔한 실수를 정리한다. 실제 `flow` 의 node type, field, enum, required 여부는 이 파일에 박아두지 않는다. 작업 직전에 MCP schema endpoint 를 호출해 현재 API 계약을 확인한다.

> 규칙의 정본은 `vox-flow/SKILL.md`의 Core Operating Rules다. 이 문서의 서술이 그 규칙과 다르면 SKILL.md가 우선하고, 이 문서를 고친다.

## Authoritative schema

MCP 로 flow JSON 을 만들거나 수정하기 전에 항상 호출한다. default 는 `flow-data` 한 번이다. 이 한 응답에 public `flow` graph, edge condition, 모든 node type 의 `data` shape 가 함께 포함된다.

```text
get_schema(namespace="flow-schema", schema_type="flow-data", detail="minimal")
```

응답에 들어오는 것:

- graph: `nodes[]`, `edges[]`
- node: `id`, `type`, `position`, type-specific `data`
- edge: `id?`, `source`, `target`, `condition`, `skip_user_response`
- 모든 node `$defs`: `BeginData`, `ConversationData`, `ApiData`, `ConditionData`, `ExtractionData`, `SendSmsData`, `ToolData`, `TransferCallData`, `TransferAgentData`, `EndCallData`, `NoteData`

`detail="minimal"` 은 description / title / examples 를 재귀적으로 제거해 응답을 줄인다. 권장 default.

agent `data` 도 같이 보낼 때:

```text
get_schema(namespace="agent-schema", schema_type="agent-data-create", detail="minimal")
get_schema(namespace="agent-schema", schema_type="agent-data-update", detail="minimal")
```

schema 결과를 받은 뒤에만 `validate_flow(flow=..., level="all")` 와 `create_agent(type="flow", data=..., flow=...)` 또는 `update_agent(flow=...)` 를 호출한다. `update_agent`에는 현재 읽은 `head_revision`을 `expected_head_revision`으로 전달하고 Flow 전체 교체에는 `flow_revision`도 `expected_flow_revision`으로 지정한다. 충돌을 자동 재시도하지 않는다. 전송 후 `get_agent` 로 다시 읽어, 보낸 field 가 사라지지 않았는지 확인한다.

## Per-node fallback

`flow-data` 가 이미 모든 node $defs 를 포함하므로 일반 케이스에서는 per-node 호출이 필요 없다. 다음 좁은 경우에만 보조로 사용한다.

- flow 가 매우 큼 (15+ 노드, 다양한 type) + LLM context 가 빡빡해 minimal graph schema 도 부담스러울 때
- 같은 flow 를 반복 patch 하면서 graph schema 는 캐시하고 한 node type 의 detail 만 standard 로 다시 보고 싶을 때
- api / transferCall / transferAgent / sendSms / tool 처럼 설명 문구가 중요한 node type 을 작성할 때

```text
list_schemas(namespace="flow-schema", category="flow-node")
get_schema(namespace="flow-schema", schema_type="node-{type}", detail="standard")
```

## 절대 하지 말 것

- public `flow` 에 legacy routing key 를 넣지 않는다: node `data.transitions`, `data.logicalTransitions`, `data.globalNodeSettings`, edge `sourceHandle`, `targetHandle`, `type:"custom"`.
- `get_schema(flow-data)` + 같은 detail 의 `get_schema(node-{type})` 를 중복 호출하지 않는다.
- `detail="standard"` 를 default 로 사용하지 않는다. 항상 minimal 로 시작한다.
- schema 결과 없이 예전 예시를 복사하지 않는다.

## Dry-run before create / update

`flow` 를 `create_agent` / `update_agent` 로 보내기 직전 `validate_flow(flow=..., level="all")` 를 호출한다.

- `errors` 가 있으면 저장을 막는 문제다. 수정 후 재검증한다.
- `advisories` 는 저장은 가능하지만 런타임에서 문제가 될 수 있는 항목이다. 사용자에게 요약한다.
- `valid` 는 blocking error 기준이다.

`validate_flow_data` / `autofix_flow_data` 는 legacy `flow_data` graph 전용이다. 새 flow 작성에는 사용하지 않는다.

## Node selection guide

아래는 설계 판단용 요약이다. 정확한 JSON shape 는 schema endpoint 결과를 따른다.

| Node | 선택 기준 |
|---|---|
| `begin` | flow 시작점. 보통 첫 실행 node 로 fallback edge 하나를 둔다. |
| `conversation` | 고객 발화를 듣고 LLM 이 응답하거나 exit 조건을 판단해야 하는 대화 단계. |
| `condition` | 이미 추출된 변수나 API 응답 값을 deterministic logic 으로 분기할 때. 고객 발화를 직접 해석하는 용도가 아니다. |
| `extraction` | 이전 대화 컨텍스트에서 이름, 주문번호, 의사 여부 같은 변수를 추출할 때. |
| `api` | 외부 HTTP API 호출과 응답 변수 추출이 필요할 때. |
| `tool` | vox.ai 에 등록된 custom tool 을 실행할 때. built-in tool 설정은 agent `data` schema 를 별도로 확인한다. |
| `transferCall` | 외부 전화번호나 SIP 대상으로 통화를 전환할 때. |
| `transferAgent` | 같은 조직 내 다른 vox.ai agent 로 대화를 넘길 때. |
| `sendSms` | 통화 중 SMS/LMS/MMS 를 발송할 때. |
| `endCall` | 종료 발화 후 통화를 끝내거나 즉시 종료할 때. |
| `note` | editor 설명용 메모. `data` 는 `content` / `width` / `height` 만 사용하고 통화 실행 흐름에는 넣지 않는다. |

## Edge condition rules

- 자연어 route condition 은 `condition:{type:"ai", prompt:"..."}` 로 표현한다. conversation out-edge 에서는 고객 발화 판단에 쓰고, api / tool / sendSms / transfer 계열 node 에서는 `"요청 성공 시"` 같은 일반 성공 path label 로 쓴다.
- 변수 비교는 `condition:{type:"logic", equations:[...], operator:"&&"|"||"}` 로 표현한다. source 는 condition node 로 둔다.
- 실패/else/default 는 `condition:{type:"fallback"}` 으로 표현한다.
- fallback 은 자동으로 생긴다고 가정하지 않는다. 필요한 fallback edge 를 모두 명시한다.
- begin node 에서 첫 실행 node 로 가는 edge 는 보통 fallback condition 을 쓴다.
- edge `skip_user_response` 는 사용자 응답을 기다리지 않는 route 에만 쓴다. static conversation → endCall edge, 실패 fallback edge 에 습관적으로 붙이지 않는다.
- begin 으로 들어가는 edge, endCall 에서 나가는 edge, note 로 들어가거나 나가는 edge 는 만들지 않는다.
- condition node 에서 나가는 edge 는 `logic` 또는 `fallback` condition 만 쓴다. 응답 변수 값 비교는 api node 의 `ai` edge 가 아니라 다음 condition node 의 `logic` edge 로 처리한다.
- 기존 public `flow` 수정 시 edge id, node id, 바꾸지 않는 condition 은 보존한다. "더 좋은 이름"으로 정규화하지 않는다.
- `position` 은 모든 노드에서 필수다. 기본은 **가로 정렬** — `x` 를 320 step 으로 늘려가며 좌→우로 흐르게 두고, 분기 경로만 `y ± 240` 으로 위/아래 분리한다.

## High-risk nodes

아래 node 는 과거 데이터 형태와 현재 public `flow` surface 가 자주 섞인다. 작성 전 schema endpoint 결과를 반드시 대조한다.

- `transferAgent`: 과거 flat `agentId` 표현을 그대로 쓰지 않는다. 현재 schema 결과의 nested `agent.{agent_id, agent_version}` shape 를 따른다. `prompt` 도 넣지 않는다. 실제 대상 agent UUID 가 없으면 만들지 않는다.
- `transferCall`: 실제 전화번호/SIP target 이 없으면 쓰지 않는다. placeholder 번호로 통과시키지 말고, fallback 안내나 callback 요청 flow 로 바꾼다.
- `sendSms`: message object 와 섞지 않는다. SMS node 전용 field shape 를 schema 결과에서 확인한다.
- `sendSms`: 발신번호/첨부 key 같은 운영 fixture 는 임의로 만들지 않는다. schema default 로 충분한 값은 비워 둔다.
- `sendSms` 실패: 앞선 업무 API 가 성공했다면 fallback 은 "업무는 완료, 문자만 실패"를 말하는 endCall 로 보낸다. generic failure endCall 로 보내면 성공한 예약/등록/접수를 실패처럼 뒤집는다.
- `endCall`: 종료 멘트가 필요한 경우 node data 의 종료 응답 필드를 schema 로 확인한다. 최종 one-shot 안내만 남았다면 별도 static conversation 대신 endCall 종료 멘트에 넣는 편이 반복을 줄인다.
- `api`: 지원 HTTP method, auth, body, response variable shape 를 schema 결과에서 확인한다. 임의로 `PATCH` 등을 추가하지 않는다.
- `api`: 응답 변수 기반 분기는 별도 condition node 에서 logic edge 로 처리한다.
- `api` / `sendSms`: `response_mode:"fire_and_forget"` 은 결과 변수를 쓰지 않는 발송 전용 흐름에만 쓴다.
- `tool`: built-in tool 과 custom tool 을 섞지 않는다. custom tool 실행 node 와 agent `data.builtInTools` 설정은 별도 schema surface 다.
- `tool`: `tool_id` 는 `list_tools` 결과에서 확인한 실제 id 만 사용한다. 임의 UUID 를 만들지 않는다.
- `condition`: deterministic 분기 전용이다. 고객 발화 판단을 넣지 않는다.
- `global_node_setting`: conversation / sendSms / endCall 에서만 사용한다. 다른 node type 에 넣으면 dry-run 이 차단한다.
- `function` / legacy `knowledge`: 기존 flow 조회 결과에 보일 수 있지만 public `flow` write 에는 넣지 않는다. 각각 `tool`/`api`, conversation node-level knowledge 설정으로 마이그레이션한다.

## Review checklist

1. `get_schema(namespace="flow-schema", schema_type="flow-data", detail="minimal")` 를 호출했는가?
2. schema 결과에 없는 field 를 과거 문서나 UI 기억만으로 넣지 않았는가?
3. legacy routing key 를 public `flow` 에 넣지 않았는가?
4. fallback, failure, else path 를 필요한 `edges` 로 명시했는가?
5. dry-run 절차 (`validate_flow(flow=..., level="all")` → `errors === []` 확인 → `advisories` 사용자 전달) 를 거쳤는가?
6. 기존 flow 수정이면 `function` / legacy `knowledge` node 를 public `flow` write 전에 마이그레이션했는가?
7. `create_agent` / `update_agent` 후 `get_agent` 로 round-trip 확인했는가?
