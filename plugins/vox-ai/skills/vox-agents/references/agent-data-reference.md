# agent.data Reference

MCP `create_agent` / `update_agent` 사용 시 `agent.data`의 동작 규칙을 정리한 레퍼런스.

정확한 field, enum, required 여부는 MCP schema endpoint 가 authoritative 하다. 이 파일은 실수하기 쉬운 운영 규칙만 요약한다.

```text
get_schema(namespace="agent-schema", schema_type="agent-data-create")
get_schema(namespace="agent-schema", schema_type="agent-data-update")
```

[default-agent-data.json](default-agent-data.json)은 `agent.data` root 구조 예시(illustrative shape)일 뿐이다. 복사해서 보낼 "기본값"도 schema source 도 아니다. 기본값의 SSOT 는 api-server 이고, 생략한 sub-schema 는 서버가 기본값으로 채운다.

## Root 필수 필드

schema endpoint 결과를 따른다. 현재 기본 payload 에서는 `prompt`, `stt`, `llm`, `voice`, `postCall`, `toolIds`를 핵심 root 로 다룬다.
나머지(`builtInTools`, `speech`, `callSettings`, `security`, `knowledge`, `webhookSettings`, `presetDynamicVariables`)는 schema 결과에 맞춰 선택적으로 보낸다.

## 필드별 핵심 규칙

스키마 전체는 `get_schema` 결과를 참조한다. 여기는 **LLM이 실수하기 쉬운 규칙만** 정리한다.

### prompt

- `firstLineType` enum: `userFirst` | `aiFirstDynamic` | `aiFirstStatic`
- `firstLine`: `aiFirstStatic`일 때만 사용 — 매 통화 동일한 첫 인사. `aiFirstDynamic`이면 LLM이 생성하므로 빈 문자열로 두면 된다.
- `pauseBeforeSpeakingSeconds`: `0.0 ~ 5.0` — 인바운드에서 수신 후 첫 발화까지 대기 시간.
- `isFirstMessageInterruptible`: 첫 인사 중간에 사용자가 끊고 말할 수 있는지. 긴 인사말이면 `true` 권장.

### llm

- `model` override 시 허용 값은 `list_llm_models` 로 조회한다. 기본 모델을 쓸 거면 `llm` 전체를 생략해 서버 기본값을 적용한다 (기본값 문자열을 하드코딩하지 않는다).

### stt

- `languages` 필수. `string[]` 형태 (예: `["ko"]`, `["ko", "en"]`).
- `speed`: 단일 언어면 `"high"` | `"medium"` | `"low"`, 다국어(`languages.length >= 2`)면 `null`.
- 한국어 단일 언어 STT 는 `["ko"]` 를 사용한다. `["ko-KR"]` 는 STT language 가 아니라 voice locale 과 혼동한 값이므로 쓰지 않는다.

### voice

- `id` / `provider` / `model` override 시 허용 조합은 `list_voice_models` 로 조회한다. 기본 음성을 쓸 거면 `voice` 전체를 생략해 서버 기본값을 적용한다 (id/provider/model 값을 하드코딩하지 않는다).
- `speed`: 발화 속도 (0.5~2.0).
- `temperature`: 음성 변이.

### postCall

- `actions[]` 각 항목에 `type`, `name` 필수.
- `type` enum: `string` | `enum` | `boolean` | `number`
- `type="enum"`이면 `enumOptions` 필수 — 없으면 런타임에 빈 선택지가 되어 추출 실패.
- PostCall은 통화 내용을 구조화해 저장하는 기능이다. 예약·변경·취소·발송·결제 같은 외부 Side-effect를 실행하거나 성공시키지 않는다.

### manualIds

- single-prompt Agent에 직접 연결하는 Manual UUID 배열이다.
- 특정 Manual 이후에만 사용하는 후속 Manual은 부모 Manual의 `linked_manual_ids`에 연결한다.
- Manual이 연결된 Agent는 `manual-review.md` 기준으로 직접·linked Manual과 Manual 소유 Tool을 재귀 검토한다.
- Manual content·Trigger·`StartManual` 라우팅은 `manual-authoring.md`, 필드와 연결·참조 규칙은 `manual-data-reference.md`를 따른다.

### callSettings

- `callTimeoutInSeconds`: 최대 통화 시간. 기본 900초(15분). 짧은 CS콜이면 300초 권장.
- `silenceCallTimeoutInSeconds`: 양쪽 무음 시 자동 종료. 기본 30초.
- `backgroundMusic` enum: `none` | `cafe` | `office` | `call_center` | `library` | `dial_tone`
- `noiseCancellation` enum: `none` | `nc` | `bvc` (기본 `bvc`)
- `dtmfInterruptible`: 기본 `false`. `true`이면 DTMF 묶음의 첫 키에서 현재 에이전트 발화를 중단한다. 입력 묶음은 기존 timeout/종료 키까지 계속 수집하며, 첫 메시지는 `isFirstMessageInterruptible` 설정을 따른다.
- `dtmfTerminationEnabled` / `dtmfTerminationKey` / `dtmfTimeoutSeconds`: DTMF 입력 종료 설정.

### speech

- `isAllowInterruption`: 사용자가 에이전트 발화 중 끊을 수 있는지. 기본 `true`.
- `isAllowTurnDetection`: 턴 감지 활성화. 기본 `true`.
- `responsiveness`: 0.0~2.0. 높을수록 빠르게 응답 시작. 기본 1.0.
- `responsiveness` 는 latency 에 직접 영향을 주는 production default 다. 사용자 요구나 기존 agent 설정이 없으면 `1.0` 을 유지하고, 자연스러움/안정성 개선을 추측해 `0.8` / `0.9` 로 낮추지 않는다.
- `boostedKeywords`: `string[]` — STT가 더 잘 인식해야 할 키워드 (브랜드명, 전문용어).

### security

- `optOutSensitiveDataStorage`: `true`면 통화 데이터 저장 안함.

### webhookSettings

- `inboundCallWebhookSigningEnabled`: 인바운드 콜 웹훅 HMAC 서명 opt-in.
- agent config boolean 은 nullable 이 아니다. 기본값은 필드를 생략해서 표현한다.
- 끄려면 `false`, 켜려면 `true` 를 보낸다. `null` 은 보내지 않는다.

### builtInTools

`builtInTools[]`는 tool schema surface 를 따른다. tool type 별 required field 를 이 문서에 복사하지 말고, MCP schema endpoint 에서 현재 built-in tool schema 를 조회한다.

```text
list_schemas(namespace="tool-schema", category="built_in")
get_schema(namespace="tool-schema", schema_type="<built-in-tool-schema>")
```

`data.builtInTools`는 전체 배열 교체(replace) 방식이다. 프롬프트/LLM만 바꾸는 update에서는 보내지 않는다. backend PATCH는 전송되지 않은 `data` sub-key를 기존 값으로 유지하므로, `builtInTools`를 생략해야 기존 도구 설정이 보존된다. 보내야 한다면 `get_agent()`로 현재 배열을 읽고, 각 도구 객체의 기본값이 아닌 설정을 그대로 보존한 전체 배열을 다시 보낸다.

특히 다음 값은 재구성 중 default로 되돌리면 실제 통화 동작이 바뀐다.

| 도구 | 보존해야 하는 대표 필드 |
|------|-------------------------|
| `end_call` | `speakDuringExecution` |
| `transfer_call` | `transferConfigurations` 전체와 각 item 안의 `transferType`, `transferTo`, `transferCondition` 등 schema/runtime 필드 |
| `transfer_agent` | `agent`, `preserveChatContext` |
| `send_sms` | `responseMode`, `smsMessageType`, `smsMessagePrompt`, `smsMessageStaticSentence`, `smsMessageStaticTitle`, `smsMessageStaticImageFileKeys`, `smsFromNumber` |
| `send_dtmf` | `allowInterruption` |

## MCP 동작 규칙

### create_agent

- 현재 MCP 입력은 `name`, `type`, `data`, `flow`, `flow_data` 기준이다.
- `type`: `"single_prompt"` | `"flow"` (기본 `"single_prompt"`).
- top-level `prompt`, `agent_type`, `llm`, `voice` shortcut 을 가정하지 않는다. 설정은 `data` object 안에 넣는다.
- `flow` agent 를 실사용 가능한 상태로 만들 때는 public `flow` 를 함께 보낸다. `flow_data` 는 legacy graph 이므로 새 작성에는 쓰지 않는다. 단순 shell agent 생성 여부는 API/MCP contract 를 확인한다.
- flow graph 만 만들거나 검증하는 작업이면 `data` 를 생략한다. schema 에 보이는 기본값을 복사하려고 `stt.speed`, `llm`, `voice`, `speech` 를 채우지 않는다.
- `data` 를 작성하기 전에 `get_schema(namespace="agent-schema", schema_type="agent-data-create")` 를 호출한다.

### update_agent

현재 MCP 입력은 `agent_id`, `name`, `data`, `flow`, `flow_data` 기준이다. agent 설정 변경은 top-level shortcut 이 아니라 `data` 안의 sub-schema 로 보낸다. flow graph 수정은 새 작성 경로에서는 `flow` 를 사용하고, `flow_data` 는 legacy graph 유지보수 때만 쓴다.

동작:
1. 기존 `agent.data`를 읽음
2. 변경할 sub-schema 의 현재 값을 보존해야 하면 전체 subtree 를 다시 구성
3. `get_schema(namespace="agent-schema", schema_type="agent-data-update")` 로 update shape 확인
4. `update_agent(agent_id=..., data=...)` 호출
5. `get_agent()`로 round-trip 확인

**sub-schema replacement semantics가 핵심이다** — `builtInTools`에 `end_call` 하나만 넣으면 기존 도구가 전부 사라질 수 있다. 기존 도구 객체를 schema 기본값으로 다시 만들면 전환 대상, SMS 발신/본문 설정, DTMF interrupt, 종료 도구 실행 중 발화 같은 tool-level 설정도 사라진다. 반드시 `get_agent()`로 현재 값을 읽고, 수정 후 보존할 sibling 값을 함께 다시 보내라.

## 실전 예시

### 최소 create_agent

```text
create_agent(
  name="CS 상담 에이전트",
  type="single_prompt",
  data={
    "prompt": {
      "prompt": "당신은 CS 상담 에이전트입니다..."
    }
  }
)
```

생략한 top-level agent data 는 서버 기본값으로 채워질 수 있지만, 정확한 required/default 동작은 `agent-data-create` schema 결과를 따른다.

### update_agent — 프롬프트 + LLM 변경

```text
# 허용 모델은 먼저 조회한다 — 모델명을 기억으로 쓰지 않는다
list_llm_models()

update_agent(
  agent_id="agent-uuid",
  data={
    "prompt": {"prompt": "수정된 프롬프트..."},
    "llm": {"model": "<list_llm_models 결과에서 선택>", "temperature": 0.2}
  }
)
```

프롬프트/LLM만 바꿀 때는 `builtInTools`를 포함하지 않는다.

### update_agent — builtInTools 추가 (replace 주의)

```text
# 1. 현재 설정 조회
get_agent(agent_id="agent-uuid")
# → data.builtInTools: [{"toolType": "end_call", "name": "end_call"}]

# 2. list_schemas/get_schema 로 built-in tool schema 확인

# 3. 기존 + 신규를 합쳐서 전체를 보냄
update_agent(
  agent_id="agent-uuid",
  data={
    "builtInTools": [
      {"toolType": "end_call", "name": "end_call"},
      {"...": "schema endpoint 결과에 맞춘 신규 built-in tool payload"}
    ]
  }
)
```

### 확인

```text
get_agent(agent_id="agent-uuid")
```

반영 후 반드시 확인. unknown key가 strip되었거나 검증 에러가 발생할 수 있다.
