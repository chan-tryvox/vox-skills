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

## Dry-run before create / update

`flow_data` 를 `create_agent` / `update_agent` 로 보내기 직전 호출 절차와 응답 처리는 SKILL.md 의 Core Operating Rules #9~#10 과 [Response Handling](../SKILL.md#response-handling) 을 따른다. 핵심만 짚으면: MCP dry-run 이 보여주는 `errors` 가 비었을 때만 보내고, 보정/경고 메시지가 있으면 사용자에게 전달한다.

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

- flow_data 의 정확한 node / edge field shape 는 MCP `get_schema` 결과를 따른다.
- 분기 의도는 사람이 정한다. API가 일부 fallback transition 을 보강할 수 있어도, 실패 시 어느 안내/재시도/전환 노드로 보낼지는 skill 이 시나리오 기준으로 설계해야 한다.
- fallback transition/condition 은 API가 보강할 수 있지만, 필요한 fallback path 의 target 은 자동으로 정할 수 없다. 사용자에게 안내해야 하는 실패 경로는 `edges` 안에 명시한다.
- layout / handle / viewport 같은 필드는 기억으로 작성하지 않고 schema endpoint 와 round-trip 결과로 확인한다.

## High-risk nodes

아래 node 는 과거 데이터 형태와 현재 v3 surface 가 자주 섞인다. 작성 전 schema endpoint 결과를 반드시 대조한다.

- `transferAgent`: 대상 에이전트 식별자는 실제 조회한 값만 사용한다. placeholder 문자열은 dry-run 에서 차단된다.
- `sendSms`: message object 와 섞지 않는다. SMS node 전용 field shape 를 schema 결과에서 확인한다.
- `api`: 지원 HTTP method, auth, body, response variable shape 를 schema 결과에서 확인한다. 임의로 `PATCH` 등을 추가하지 않는다.
- `tool`: built-in tool 과 custom tool 을 섞지 않는다. custom tool 실행 node 와 agent-level built-in tool 설정은 별도 surface 다.
- `condition`: 고객 발화를 직접 해석하는 용도가 아니라, 이미 추출된 변수/API 결과로 deterministic 분기할 때 사용한다.

## Review checklist

1. `get_schema(namespace="flow-schema", schema_type="flow-data")` 를 호출했는가?
2. schema 결과에 없는 field 를 과거 문서나 UI 기억만으로 넣지 않았는가?
3. fallback, failure, else path 를 필요한 `edges` 로 명시했는가?
4. dry-run 절차 (`validate_flow_data` → errors 없음 확인 → 보정/경고 메시지 전달) 를 거쳤는가? 자세한 응답 처리 룰은 SKILL.md [Response Handling](../SKILL.md#response-handling).
5. `create_agent` / `update_agent` 후 `get_agent` 로 round-trip 확인했는가? 응답에서 사라진 field 가 있다면 schema 결과 기준으로 다시 작성했는가?
