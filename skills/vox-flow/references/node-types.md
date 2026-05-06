# Node Types: schema endpoint playbook

이 파일은 node type 을 고르는 기준과 흔한 실수를 정리한다. 실제 `flow_data` 의 node type, field, enum, required 여부는 이 파일에 박아두지 않는다. 작업 직전에 MCP schema endpoint 를 호출해 현재 API 계약을 확인한다.

## Authoritative schema

MCP 로 flow JSON 을 만들거나 수정하기 전에 항상 호출한다.

```text
get_schema(namespace="flow-schema", schema_type="flow-data")
```

agent `data` 도 같이 작성해야 하면 별도로 호출한다.

```text
get_schema(namespace="agent-schema", schema_type="agent-data-create")
get_schema(namespace="agent-schema", schema_type="agent-data-update")
```

schema 결과를 받은 뒤에만 `create_agent(type="flow", data=..., flow_data=...)` 또는 `update_agent(flow_data=...)` 를 호출한다. 전송 후 `get_agent` 로 다시 읽어, 보낸 field 가 silently drop 되지 않았는지 확인한다.

## Node selection guide

아래는 설계 판단용 요약이다. 정확한 JSON shape 는 schema endpoint 결과를 따른다.

| Node | 선택 기준 |
|---|---|
| `begin` | flow 시작점. 보통 첫 실행 node 로 연결한다. |
| `conversation` | 고객 발화를 듣고 LLM 이 응답하거나 exit 조건을 판단해야 하는 대화 단계. |
| `condition` | 이미 추출된 변수나 API 응답 값을 deterministic logic 으로 분기할 때. 고객 발화를 직접 해석하는 용도가 아니다. |
| `extraction` | 이전 대화 컨텍스트에서 이름, 주문번호, 의사 여부 같은 변수를 추출할 때. |
| `api` | 외부 HTTP API 호출과 응답 변수 추출이 필요할 때. |
| `tool` | vox.ai 에 등록된 custom tool 을 실행할 때. built-in tool 설정은 agent `data` schema 를 별도로 확인한다. |
| `transferCall` | 외부 전화번호나 SIP 대상으로 통화를 전환할 때. |
| `transferAgent` | 같은 조직 내 다른 vox.ai agent 로 대화를 넘길 때. |
| `sendSms` | 통화 중 SMS/LMS/MMS 를 발송할 때. |
| `endCall` | 종료 발화 후 통화를 끝내거나 즉시 종료할 때. |
| `note` | editor 설명용 메모. runtime 실행 흐름에는 넣지 않는다. |

## Edge and transition rules

- 노드 내부에 구 v2 `transitions[]`, `logicalTransitions[]`, `sourceHandle` 같은 editor/legacy field 를 넣지 않는다.
- 분기는 `edges[].condition` 으로 표현한다. condition 의 정확한 union shape 는 schema endpoint 를 확인한다.
- fallback transition/condition 은 API가 보강할 수 있지만, 필요한 fallback path 의 target 은 자동으로 정할 수 없다. 사용자에게 안내해야 하는 실패 경로는 `edges` 안에 명시한다.
- `position`, `viewport`, `sourceHandle`, `targetHandle`, animated edge 등 layout/editor field 는 API payload 기준이 아니다. 필요 여부는 schema endpoint 와 round-trip 결과로만 판단한다.

## High-risk nodes

아래 node 는 과거 데이터 형태와 현재 v3 surface 가 자주 섞인다. 작성 전 schema endpoint 결과를 반드시 대조한다.

- `transferAgent`: 과거 flat `agentId` 표현을 그대로 쓰지 않는다. 현재 schema 결과의 target agent mapping shape 를 따른다.
- `sendSms`: message object 와 섞지 않는다. SMS node 전용 field shape 를 schema 결과에서 확인한다.
- `api`: 지원 HTTP method, auth, body, response variable shape 를 schema 결과에서 확인한다. 임의로 `PATCH` 등을 추가하지 않는다.
- `tool`: built-in tool 과 custom tool 을 섞지 않는다. custom tool 실행 node 와 agent `data.builtInTools` 설정은 별도 schema surface 다.
- `condition`: node `data` 안에 분기 조건을 넣지 않는다. 분기 조건은 edge condition 이다.

## Review checklist

1. `get_schema(namespace="flow-schema", schema_type="flow-data")` 를 호출했는가?
2. schema 결과에 없는 field 를 과거 문서나 UI 기억만으로 넣지 않았는가?
3. fallback, failure, else path 를 필요한 `edges` 로 명시했는가?
4. `create_agent` / `update_agent` 후 `get_agent` 로 round-trip 확인했는가?
5. 응답에서 사라진 field 가 있다면, 해당 field 를 제거하거나 schema 결과 기준으로 다시 작성했는가?
