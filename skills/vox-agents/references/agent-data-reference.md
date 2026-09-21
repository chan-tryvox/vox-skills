# agent.data Reference

MCP `create_agent` / `update_agent` 사용 시 `agent.data`의 동작 규칙을 정리한 레퍼런스.

정확한 field, enum, required 여부는 MCP schema endpoint 가 authoritative 하다. 이 파일은 실수하기 쉬운 운영 규칙만 요약한다.

```text
get_schema(namespace="agent-schema", schema_type="agent-data-create")
get_schema(namespace="agent-schema", schema_type="agent-data-update")
```

[default-agent-data.json](default-agent-data.json)은 `agent.data` root 구조 예시(illustrative shape)일 뿐이다. 복사해서 보낼 "기본값"도 schema source 도 아니다. [gpt-live-agent-data.json](gpt-live-agent-data.json)은 GPT-Live create/update shape와 전환 예시다. 기본값의 SSOT 는 api-server 이고, 생략한 sub-schema 는 서버가 기본값으로 채운다.

## Root 필수 필드

schema endpoint 결과를 따른다. 기존 pipeline payload 에서는 `prompt`, `stt`, `llm`, `voice`, `postCall`, `toolIds`를 핵심 root 로 다룬다. `runtime`을 사용하는 최신 계약은 현재 schema endpoint 결과를 기준으로 확인한다.
나머지(`builtInTools`, `manuals`, `speech`, `callSettings`, `security`, `knowledge`, `webhookSettings`, `presetDynamicVariables`)는 schema 결과에 맞춰 선택적으로 보낸다.

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

### runtime (GPT-Live)

When the user selects GPT-Live, use the contract below and the accompanying
[gpt-live-agent-data.json](gpt-live-agent-data.json) examples. The current agent
schema remains authoritative for field presence and validation.

- On create, an absent `runtime` or `{ "type": "pipeline" }` keeps the existing pipeline behavior.
- On update, an omitted `runtime` preserves the current runtime, including `gpt_live`; it does not switch an agent back to pipeline.
- GPT-Live uses `runtime: { "type": "gpt_live", "model": "gpt-live-1", "voice": ... }`.
- The built-in voice example is `runtime.voice: { "type": "builtin", "name": "marin" }`. This is an example, not a claim that marin is the only supported name or the universal default.
- A native custom voice is referenced only as `runtime.voice: { "type": "custom", "id": "voice_..." }` when the OpenAI-native reference passes the current organization-visible catalog/ownership checks. An arbitrary ID grants no access. Do not promise custom provisioning, migration, or exact voice identity.
- `data.llm` remains the selectable text LLM for shared chat and live business work. A new GPT-Live create requires `data.llm.model` from `list_llm_models`; do not invent `chatLlm` or implicitly map `data.llm` to Luna.
- Put GPT-Live voice configuration in `runtime.voice`, not pipeline `data.voice` or a TTS-only field. Do not send legacy `stt`, `voice`, `parallelSTT`, `sttPreference`, `voicePreference`, or speech preferences marked legacy/incompatible by the current schema. Do not delete the whole `data.speech` object by guesswork.
- A pipeline-to-live update retains the existing `data.llm` unless the user explicitly changes it. A live-to-pipeline update explicitly supplies pipeline `stt` and `voice`; never infer them from `runtime.voice`.
- GPT-Live reads may omit `stt`/`voice` or return them as `null`. Check `runtime` first.
- Preserve flow node overrides at `flow.nodes[].data.llm`; agent-level `data.llm` is a separate setting.

### postCall

- `actions[]` 각 항목에 `type`, `name` 필수.
- `type` enum: `string` | `enum` | `boolean` | `number`
- `type="enum"`이면 `enumOptions` 필수 — 없으면 런타임에 빈 선택지가 되어 추출 실패.
- PostCall은 통화 내용을 구조화해 저장하는 기능이다. 예약·변경·취소·발송·결제 같은 외부 Side-effect를 실행하거나 성공시키지 않는다.

### manuals

- single-prompt Agent가 소유한 Manual 맵이다. 키는 Manual UUID이고, 값은 `name`·`trigger`·`content`·`built_in_tools`·`config`다. 맵 값 안의 필드는 snake_case다.
- `manualIds`·`manual_ids`는 폐기됐다. create/update에 보내면 `manualIds is retired`로 거절된다. Manual을 따로 만들어 Agent에 붙이는 방식은 없고, Manual은 Agent 맵 안에만 있다.
- update에서 `manuals`를 보내면 맵 전체가 교체된다. 생략하면 기존 맵이 유지된다. Manual 하나만 고칠 때도 `get_agent`로 현재 맵을 읽고 나머지 Manual을 그대로 포함한 전체 맵을 보낸다. 빈 `{}`를 보내면 모든 Manual이 삭제된다.
- `trigger`가 채워진 Manual은 Agent가 직접 시작할 수 있는 진입 Manual이다. `trigger`가 빈 Manual은 다른 Manual content의 `@manual:<UUID>`로만 도달하는 후속 Manual이다.
- flow Agent에는 Manual을 두지 않는다. 비어 있지 않은 맵은 배포 시 `MANUALS_UNSUPPORTED_AGENT_TYPE`으로 거절된다.
- Manual이 있는 Agent는 `manual-review.md` 기준으로 진입·linked Manual과 Manual 소유 Tool을 재귀 검토한다.
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
- GPT-Live를 새로 만들 때는 `data.runtime`을 명시하고 `data.llm.model`을 반드시 포함한다. `runtime.voice`는 `builtin` 또는 현재 조직에 허용된 OpenAI 네이티브 `custom` 참조만 사용한다. pipeline용 `stt`/`voice`/`parallelSTT`/`sttPreference`/`voicePreference`와 호환되지 않는 legacy speech preference를 같은 입력에 복사하지 않는다.

### update_agent

현재 MCP 입력은 `agent_id`, `name`, `data`, `flow`, `flow_data` 기준이다. agent 설정 변경은 top-level shortcut 이 아니라 `data` 안의 sub-schema 로 보낸다. flow graph 수정은 새 작성 경로에서는 `flow` 를 사용하고, `flow_data` 는 legacy graph 유지보수 때만 쓴다.

동작:
1. 기존 `agent.data`를 읽음
2. 변경할 sub-schema 의 현재 값을 보존해야 하면 전체 subtree 를 다시 구성
3. `get_schema(namespace="agent-schema", schema_type="agent-data-update")` 로 update shape 확인
4. `update_agent(agent_id=..., data=...)` 호출
5. `get_agent()`로 round-trip 확인

GPT-Live 전환:

- pipeline → GPT-Live: `runtime`을 명시하고 기존 `data.llm`을 유지한다. `runtime`을 생략한 PATCH는 전환이 아니다.
- GPT-Live → pipeline: `runtime: {"type": "pipeline"}`과 pipeline용 `stt`, `voice`를 명시한다. `runtime.voice`에서 pipeline 음성을 추측하지 않는다.
- GPT-Live 수정: `data.stt`/`data.voice`가 `null`이거나 응답에서 생략될 수 있으므로 `runtime`을 기준으로 round-trip을 확인한다.

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
