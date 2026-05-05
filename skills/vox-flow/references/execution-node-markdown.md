# Execution node markdown

이 문서는 conversation 외 노드의 **설계 markdown** 작성법을 다룬다. MCP/API `flow_data` JSON field 는 항상 `get_schema(namespace="flow-schema", schema_type="flow-data")` 결과를 따른다.

## Shared rules

- 실패, else, fallback path 가 필요하면 markdown 에 의도를 쓰고 JSON 변환 시 `edges` 로 명시한다.
- 각 노드는 `## name / ## content / ## transition conditions` 구조를 유지한다.
- `transitions[]` / `logicalTransitions[]` / `staticSentence` / `promptType` 등 **v3 의 정식 JSON 필드는 모두 사용한다** — markdown 의 표기 (예: "message mode: static") 를 JSON 필드명 (`promptType: "static"` + `staticSentence: ...`) 으로 옮긴다.

## JSON shape cheatsheet

설계 markdown 으로부터 JSON 으로 변환할 때의 필수 필드. **누락 시 백엔드가 `MISSING_REQUIRED_NODE_CONFIG` 로 reject 한다.**

### Transition condition 작성 규칙 (자주 틀림)

`api / function / sendSms / tool` 노드의 **success transition** 은 다음 두 패턴 중 하나로 적어야 한다. transition LLM 이 너무 까다로운 조건은 매칭 실패하고 fallback 으로 빠뜨려 흐름이 끊긴다.

- **simple form (권장)**: success transition 을 정의하지 않고 fallback (`isFallback: true`) 만 둔다. backend 가 fallback 이외의 default success path 로 자동 라우팅한다.
- **explicit form**: success transition 을 정의할 때는 condition 을 너그럽게 — `"API 응답을 받은 경우"`, `"요청 성공 응답을 받았을 때"`, `"도구 결과가 도착한 경우"` 같이 평가 LLM 이 어떤 정상 응답에서도 true 로 판단할 표현을 쓴다. 절대 `"status가 정확히 200이고 result가 ok이며 data가 있을 때"` 처럼 한 가지 응답 schema 만 매칭되는 표현은 쓰지 말 것.

또한 `api / function` 노드의 **fallback target 을 곧바로 endCall 로 보내지 말 것** — fallback 은 retry / 친절한 안내 노드 / transferCall 같이 graceful degrade path 로 보낸다. fallback → endCall 직결은 작은 응답 schema 차이 한 번에 통화가 종료되어 사용자 경험과 scenario_test 통과율 모두 떨어진다.

### `api` 노드를 연속으로 연결하지 말 것 (runtime race 회피)

`api` 노드 → `api` 노드 직결 edge 는 **금지**한다. 첫 번째 api 의 request_api 결과를 두 번째 api 가 평가하기 전에 두 번째 api 의 logicalTransitions 가 먼저 평가되어 fallback path 로 빠진다 (runtime race).

대신 다음 패턴을 사용한다:
- `api → conversation → api`: 첫 결과를 짧게 안내한 뒤 다음 api 호출
- `api → condition → api`: 첫 응답 변수를 condition 으로 명시 분기 후 다음 api 호출
- `api → extraction → api`: 사용자 추가 입력이 필요하면 extraction 으로 받은 뒤 다음 api 호출

api 노드 다음에 또 api 가 필요하다면 무조건 conversation/condition 한 단계를 끼워 넣어야 한다 — 짧은 static_sentence (예: "확인이 완료됐습니다. 다음 단계를 진행할게요.") + skip-user-response transition 한 줄로 충분하다.

**bridge conversation 노드 필수 필드** (auto-progress 가능하게 만들기):
- `data.isSkipUserResponse: true` (노드 자체)
- `data.transitions[0].isSkipUserResponse: true` (하나뿐인 outgoing transition)

둘 중 하나라도 빠지면 runtime 이 LLM 평가자에게 떠넘기는데, LLM 은 명시적 사용자 입력이 없는 상태에서 분기를 결정하지 못해 노드가 자가 루프에 빠진다.

```jsonc
// OK — bridge 가 auto-progress 한다
{
  "id": "bridge_to_next",
  "type": "conversation",
  "data": {
    "name": "단계 안내",
    "promptType": "static",
    "staticSentence": "확인이 완료됐습니다. 다음 단계를 진행할게요.",
    "isSkipUserResponse": true,            // 노드 자체에 필수
    "transitions": [
      { "id": "tr_bridge_done", "isSkipUserResponse": true }
    ]
  }
}
```

### `logicalTransitions` 작성 시 mock-friendly 패턴 (scenario_test 통과를 위한 권장)

api 노드의 `logicalTransitions[]` 에서 응답 변수와 비교할 때 **boolean 또는 `exists` 연산을 우선 사용**한다. 임의 문자열 (예: `equals "matched"`, `equals "approved"`) 비교는 scenario_test 의 mock 응답과 mismatch 되어 자주 fallback 으로 빠진다.

권장 패턴:
- `{ "variable": "<varname>", "operator": "exists" }` — id, name, summary 같이 값 자체의 존재 여부로 분기
- `{ "variable": "<flag>", "operator": "equals", "value": true }` — verified, exists, matched 등 boolean flag
- `{ "variable": "<flag>", "operator": "equals", "value": false }` — 부정 분기 시

비권장 (fragile):
- `equals "matched"` / `equals "approved"` / `equals "ok"` 같이 응답 본문의 정확한 문자열 매칭
- `contains "성공"` 같이 자연어 substring 매칭

따라서 `responseVariables` 도 jsonPath 를 boolean 필드 (`$.verified`, `$.exists`, `$.matched`, `$.confirmed`) 또는 id 필드 (`$.data.reservation_id`, `$.data.id`) 위주로 매핑하라. 예: `{ "variableName": "card_verified", "jsonPath": "$.verified" }` + `equals true` 비교.

### Edge ↔ transition id 일관성 규칙 (자주 틀림)

`edge.sourceHandle` 값은 **반드시** 같은 source 노드의 `data.transitions[].id` 또는 `data.logicalTransitions[].id` 중 하나와 정확히 일치해야 한다.

- **success path 가 단 하나** (예: `api`, `sendSms`, `transferCall`, `tool`) — `sourceHandle` 을 비워 두면 backend 가 fallback 이외의 next path 로 자동 라우팅한다. **stable id 를 쓰고 싶다면**, transition 을 명시 추가해야 하고 그 id 를 그대로 edge 에 적어야 한다.
- **branch 가 여러 개** (예: `condition`, `extraction → 분기`) — `data.logicalTransitions[]` 에 정의한 `lt_*` id 를 그대로 사용한다.
- 절대로 edge 에 `sourceHandle: "tr_X_success"` 같은 임의 이름을 적은 뒤 노드 transition 에는 random id (`"jciEWA2LH4"` 등) 를 두지 말 것 — 양쪽 id 가 정확히 일치해야 한다.

```jsonc
// OK: success 는 sourceHandle 생략
{ "id": "e1", "source": "send_sms", "target": "next" }
// OK: success 도 stable id 명시 — node 에도 같은 id 가 있어야 함
{ "id": "e1", "source": "send_sms", "target": "next", "sourceHandle": "tr_sms_success" }
// BAD: 노드에는 tr_sms_success 가 없고 random id 로 만들어 둔 상태
{ "id": "e1", "source": "send_sms", "target": "next", "sourceHandle": "tr_sms_success" }
```

### `api` 노드 — `data.apiConfiguration.url` 필수

```jsonc
{
  "id": "verify_api",
  "type": "api",
  "data": {
    "name": "본인인증 API",
    "promptType": "static",
    "staticSentence": "본인 확인 중입니다. 잠시만 기다려 주세요.",
    "isSkipUserResponse": true,
    "apiConfiguration": {
      "method": "POST",                       // GET | POST | PUT | DELETE
      "url": "https://api.example.com/verify",
      "headersEnabled": true,
      "headers": { "Content-Type": "application/json" },
      "bodyEnabled": true,
      "body": "{\"name\":\"{{customer_name}}\"}",
      "timeoutSeconds": 10
    },
    "responseVariables": [
      { "variableName": "verify_status", "jsonPath": "$.status" }
    ],
    "transitions": [
      { "id": "tr_verify_fail", "isFallback": true, "isSkipUserResponse": true, "condition": "요청 실패 시" }
    ],
    "logicalTransitions": [
      {
        "id": "lt_verify_ok",
        "condition": {
          "logicalOperator": "and",
          "conditions": [{ "variable": "verify_status", "operator": "equals", "value": "ok" }]
        },
        "isSkipUserResponse": true
      }
    ]
  },
  "position": { "x": 1280, "y": 0 }
}
```

### `transferCall` 노드 — `data.transferConfiguration.transferTo` 필수

```jsonc
{
  "id": "transfer_human",
  "type": "transferCall",
  "data": {
    "name": "상담원 전환",
    "promptType": "static",
    "staticSentence": "상담원으로 연결드리겠습니다. 잠시만 기다려 주세요.",
    "isSkipUserResponse": true,
    "transferType": "cold",                    // cold | warm
    "displayedCallerId": "agent",              // agent | user
    "transferConfiguration": {
      "transferTo": "+82-2-XXXX-XXXX",         // 전화번호 또는 SIP URI
      "transferType": "phone"                  // phone | sip
    },
    "transitions": [
      { "id": "tr_xfer_fail", "isFallback": true, "isSkipUserResponse": true, "condition": "에러 발생 시" }
    ]
  },
  "position": { "x": 1600, "y": 240 }
}
```

### `transferAgent` 노드 — `data.agentId` 필수 (실제 대상 에이전트 UUID, **placeholder 금지**)

> **placeholder 사용 금지.** `"PLACEHOLDER_X_AGENT_ID"`, `"<target agent UUID>"` 같은 가짜 값을 넣으면 runtime 이 즉시 거부한다 (agent-server 가 numeric id 만 받는다). 실제 UUID 가 없다면 `transferAgent` 노드를 쓰지 말고 `transferCall` (phone number 또는 SIP URI) 로 대체한다.

```jsonc
{
  "id": "transfer_partner",
  "type": "transferAgent",
  "data": {
    "name": "타팀 에이전트 전환",
    "promptType": "static",
    "staticSentence": "담당팀 에이전트로 연결드리겠습니다.",
    "isSkipUserResponse": true,
    "agentId": "<target agent UUID>",
    "preserveChatContext": false,
    "transitions": [
      { "id": "tr_xfer_fail", "isFallback": true, "isSkipUserResponse": true, "condition": "에러 발생 시" }
    ]
  },
  "position": { "x": 1600, "y": 240 }
}
```

### `sendSms` 노드 — message 본문 필수

```jsonc
{
  "id": "send_confirmation",
  "type": "sendSms",
  "data": {
    "name": "확정 SMS",
    "promptType": "static",                    // static | dynamic
    "staticSentence": "{{customer_name}}님 예약이 확정되었습니다 (예약번호: {{reservation_id}}).",
    "isSkipUserResponse": true,
    "transitions": [
      { "id": "tr_sms_fail", "isFallback": true, "isSkipUserResponse": true, "condition": "요청 실패 시" }
    ]
  },
  "position": { "x": 1920, "y": 0 }
}
```

### `extraction` 노드 — `extractionConfiguration.variables[]` 필수

```jsonc
{
  "id": "extract_score",
  "type": "extraction",
  "data": {
    "name": "점수 추출",
    "isSkipUserResponse": true,
    "extractionConfiguration": {
      "extractionPrompt": "직전 대화에서 고객이 말한 NPS 점수를 0~10 정수로 추출하라.",
      "variables": [
        { "variableName": "nps_score", "variableType": "number", "variableDescription": "0~10 정수 NPS 점수" }
      ]
    },
    "transitions": [{ "id": "tr_extracted", "isSkipUserResponse": true }]
  },
  "position": { "x": 960, "y": 0 }
}
```

### `condition` 노드 — `logicalTransitions[]` 로 분기, `transitions[]` 에 fallback 1 개

```jsonc
{
  "id": "branch_score",
  "type": "condition",
  "data": {
    "name": "점수 분기",
    "transitions": [
      { "id": "tr_default", "isFallback": true, "isSkipUserResponse": true, "condition": "위 조건이 모두 거짓일 때" }
    ],
    "logicalTransitions": [
      {
        "id": "lt_promoter",
        "condition": {
          "logicalOperator": "and",
          "conditions": [{ "variable": "nps_score", "operator": "greater_than_or_equal", "value": 9 }]
        },
        "isSkipUserResponse": true
      }
    ]
  },
  "position": { "x": 1280, "y": 0 }
}
```

### `endCall` / `tool` / `function` / `note`

- `endCall`: `data.promptType` 가 `"none"` 이면 멘트 없이 즉시 종료, `"static"` 이면 `staticSentence` 발화 후 종료.
- `tool`: `data.toolId` 또는 `data.agentToolId` 로 대상 도구 지정 + api 노드와 같은 fallback transition 패턴.
- `function`: deprecated — 신규 flow 에 사용하지 않는다.
- `note`: editor 메모 전용. runtime 에 영향 없음. 일반 transition / edge 에 포함시키지 않는다.

## extraction

대화 컨텍스트에서 값을 추출한다. 고객에게 새 질문을 하지 않는다.

```md
## name
[노드 이름]

## content
### 목적
1. [추출 소스]에서 [추출 대상]을 추출한다.

### 추출 변수
- [variable_name] ([type]): [추출 소스] + [추출 대상 설명] + [포맷 규칙]
  ex) [기대 출력 예시]

## transition conditions
(조건 없이 다음 노드로 진행. JSON 변환 시 현재 schema 의 skip/edge field 를 확인하고 edge 를 명시.)
```

작성 규칙:
- 추출 소스를 명시한다: 직전 대화, DTMF 입력, API 응답 설명 등.
- 전화번호, 주문번호처럼 형식이 있는 값은 포맷을 적는다.
- 변수명은 snake_case 로 쓴다.
- 여러 값을 추출해야 하면 각 변수의 기대 출력 예시를 둔다.

## condition

이미 만들어진 변수 값을 deterministic logic 으로 분기한다. 고객 발화를 직접 해석하지 않는다.

```md
## name
[노드 이름]

## content
### 목적
1. [분기 판단 목적]

### 분기 조건
- {{variable_name}} == "값A" → [결과 라벨]
- {{variable_name}} == "값B" → [결과 라벨]
- default → [결과 라벨]

## transition conditions
(변수 기반 분기. JSON 변환 시 edge condition union 과 operator enum 을 schema endpoint 로 확인한다.)
```

작성 규칙:
- 앞선 extraction/api 에서 만든 변수만 소비한다.
- else/default 분기를 둔다.
- 실제 JSON operator 이름은 schema endpoint 결과를 따른다.

## api

외부 HTTP API를 호출하고 응답 변수 추출 의도를 정의한다.

```md
## name
[노드 이름]

## content
### 목적
1. [API 호출 목적]

### 호출 전 발화
- 발화 모드: [none/static/generated]
- 대기 멘트: "[필요할 때만]"

### API 설정
- method: [schema endpoint enum 확인]
- url: [요청 URL. {{variable_name}} 사용 가능]
- body: [필요 시]
- auth: [필요 시]

### 응답 변수
- [variable_name]: [JSONPath 표현식] — [설명]

## transition conditions
- 성공: API 응답 정상 수신 시 다음 노드로 진행.
- 실패: API 호출 실패 시 fallback edge로 진행. (JSON 변환 시 edge 명시)
```

## endCall

통화를 종료한다. 종료 직전 발화를 할 수도 있고 즉시 종료할 수도 있다.

```md
## name
[노드 이름]

## content
### 목적
1. [종료 목적]

### 종료 멘트
- message mode: [static/generated/none]
- 멘트: "[필요할 때만]"

### Global Node 설정
- global enter condition: "[언제든 이 종료로 진입해야 하는 조건. 필요할 때만]"

## transition conditions
(통화 종료. 전환 없음.)
```

## transferCall

외부 전화번호 또는 SIP 대상으로 통화를 전환한다.

```md
## name
[노드 이름]

## content
### 목적
1. [전환 이유]

### 전환 전 발화
- 발화 모드: [none/static/generated]
- 멘트: "[필요할 때만]"

### 전환 설정
- transfer type: [cold/warm]
- transfer target: [전화번호 또는 SIP URI]
- displayed caller id: [agent/user]

### warm transfer 설정
- transfer message mode: [static/generated]
- 멘트/프롬프트: "[상담원에게 전달할 브리핑]"

## transition conditions
- 성공: 전환 성공 시 에이전트 퇴장.
- 실패: 전환 실패 시 fallback edge로 진행. (JSON 변환 시 edge 명시)
```

## transferAgent

같은 조직 내 다른 vox.ai 에이전트로 대화를 넘긴다.

```md
## name
[노드 이름]

## content
### 목적
1. [전환 이유]

### 전환 설정
- target agent: [전환 대상 에이전트 ID/버전. JSON shape 는 schema endpoint 확인]
- preserve chat context: [true/false]

## transition conditions
- 성공: 에이전트 전환 성공 시 현재 에이전트 퇴장.
- 실패: 전환 실패 시 fallback edge로 진행. (JSON 변환 시 edge 명시)
```

## sendSms

통화 중 SMS/LMS/MMS 를 발송한다.

```md
## name
[노드 이름]

## content
### 목적
1. [SMS 발송 이유]

### SMS 내용
- SMS mode: [static/dynamic]
- 멘트: "[SMS 내용 또는 생성 프롬프트]"

### 발신 설정
- sender: [기본값 사용 또는 발신 가능 번호. JSON shape 는 schema endpoint 확인]

## transition conditions
- 성공: SMS 발송 성공 시 다음 노드로 진행.
- 실패: SMS 발송 실패 시 fallback edge로 진행. (JSON 변환 시 edge 명시)
```

## tool

custom tool 실행 node 와 agent `data.builtInTools` 설정은 schema surface 가 다르다. JSON 변환 전 schema endpoint 로 현재 shape 를 확인한다.

```md
## name
[노드 이름]

## content
### 목적
1. [도구 실행 이유]

### 발화 모드
- 발화 모드: [none/static/generated]
- 멘트: "[필요할 때만]"

### 도구 설정
- tool: [custom tool 또는 built-in tool 여부를 명시]
- 입력: [필요 시]

## transition conditions
- 성공: 도구 실행 성공 시 다음 노드로 진행.
- 실패: 도구 실행 실패 시 fallback edge로 진행. (JSON 변환 시 edge 명시)
```

## Global node

통화 종료 요청, 상담원 연결 요청처럼 어디서든 발생할 수 있는 예외는 global node 후보가 될 수 있다.

작성 규칙:
- 보통 conversation 또는 endCall 에 설계한다. 정확한 허용 shape 는 schema endpoint 결과를 따른다.
- global enter condition 은 고객 발화 기반으로 쓴다.
- 2-3개 이내로 제한한다. 너무 많으면 전환 충돌 위험이 커진다.
