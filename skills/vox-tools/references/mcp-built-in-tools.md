# 빌트인 도구 레퍼런스

빌트인 도구(end_call, transfer_call, transfer_agent, send_sms, send_dtmf, search_address)의 장착, 해제 및 타입별 파라미터 상세입니다. 현재 제공되는 전체 목록은 `list_schemas(namespace="tool-schema", category="built_in")` 결과가 정본입니다 — 이 문서에 없는 toolType이 조회되면 schema를 따르세요.

빌트인 도구는 별도 생성/연결 엔드포인트가 없습니다. 에이전트 데이터 객체의 `data.builtInTools[]` 배열로 존재하며, 이 배열을 `create_agent` / `update_agent(expected_head_revision=..., data={"builtInTools": [...]})`로 통째로 보내서 장착·해제합니다.

## payload 스키마 조회: list_schemas / get_schema

각 빌트인 도구 item의 정확한 필드 구조는 스키마로 확인합니다.

```
list_schemas(namespace="tool-schema", category="built_in", include_schema=true)
get_schema(namespace="tool-schema", schema_type="transfer_agent")
```

## 장착: update_agent(expected_head_revision=..., data={"builtInTools": [...]})

`builtInTools`는 배열 전체 교체(replace) 방식입니다. `toolType`에 따라 item 객체 구조가 다릅니다.

수정 전에는 `get_agent()`로 현재 `data.builtInTools`와 `head_revision`을 읽고, 기본값이 아닌 tool-level 설정을 보존합니다. 모든 `update_agent` 쓰기에 관찰한 `head_revision`을 필수 `expected_head_revision`으로 전달하세요. `REVISION_CONFLICT`를 자동 재시도하지 않습니다. 프롬프트/LLM만 바꾸는 업데이트라면 `builtInTools`를 보내지 않습니다. backend PATCH는 전송되지 않은 `data` sub-key를 유지하지만, `builtInTools`를 전송하면 그 배열 전체를 교체합니다.

### end_call

통화를 종료합니다.

```json
{"toolType": "end_call", "name": "end_call", "description": "고객이 더 이상 질문이 없을 때 통화를 종료합니다."}
```

| 필드 | 필수 | 설명 |
|-----|------|------|
| `toolType` | 필수 | `"end_call"` |
| `name` | 필수 | 도구 이름 (고유) |
| `description` | 선택 | 호출 조건 설명 |

### transfer_call

통화를 외부 전화번호/SIP로 전환합니다.

```json
{
  "toolType": "transfer_call",
  "name": "transfer_to_agent",
  "description": "고객이 상담원 연결을 요청할 때 전환합니다.",
  "transferConfigurations": [{"transferType": "phone", "transferTo": "010-1234-5678"}]
}
```

| 필드 | 필수 | 기본값 | 설명 |
|-----|------|--------|------|
| `toolType` | 필수 | | `"transfer_call"` |
| `name` | 필수 | | 도구 이름 (고유) |
| `description` | 선택 | | 호출 조건 설명 |
| `transferConfigurations` | 필수 | | 전환 대상 배열. v3 public/API canonical field |
| `transferConfigurations[].transferType` | 선택 | `"phone"` | `"phone"` 또는 `"sip"` |
| `transferConfigurations[].transferTo` | 필수 | | 전화번호 또는 SIP URI |
| `transferConfigurations[].transferCondition` | 선택 | | 전환 조건 설명 |

`get_agent()` 응답에 singular `transferConfiguration`이 보이더라도(runtime/DB legacy shape) 다시 보낼 때는 복수형 `transferConfigurations`를 씁니다. v3 API와 MCP round-trip은 복수형 기준입니다.

**cold vs warm**:

| | cold | warm |
|---|------|------|
| 브리핑 | 없음 | AI가 다음 상담원에게 통화 요약 전달 |
| 속도 | 빠름 | 약간 느림 (브리핑 시간) |
| 용도 | 단순 전환 | 복잡한 상담, 컨텍스트 전달 필요 시 |

### transfer_agent

같은 조직 내 다른 vox.ai 에이전트로 전환합니다.

```json
{
  "toolType": "transfer_agent",
  "name": "transfer_to_support",
  "agent": {
    "agent_id": "7f3e9c12-4a8b-4d5e-9f1a-2b3c4d5e6f7a",
    "agent_version": "current"
  },
  "preserveChatContext": false
}
```

| 필드 | 필수 | 기본값 | 설명 |
|-----|------|--------|------|
| `toolType` | 필수 | | `"transfer_agent"` |
| `name` | 필수 | | 도구 이름 (고유) |
| `description` | 선택 | | 호출 조건 설명 |
| `agent` | 필수 | | 전환 대상 에이전트 매핑 객체 |
| `agent.agent_id` | 필수 | | 같은 조직의 전환 대상 에이전트 UUID |
| `agent.agent_version` | 선택 | `"current"` | 전환 대상 버전 |
| `preserveChatContext` | 선택 | `false` | 대화 컨텍스트 유지 여부 |

MCP/v3에서는 기존 `transferAgentId` / `transferAgentVersion` 대신 `agent` 객체를 보냅니다.

### send_sms

통화 중 SMS를 발송합니다.

```json
{"toolType": "send_sms", "name": "send_confirmation", "smsMessageType": "static", "smsMessageStaticSentence": "예약이 확정되었습니다."}
```

| 필드 | 필수 | 기본값 | 설명 |
|-----|------|--------|------|
| `toolType` | 필수 | | `"send_sms"` |
| `name` | 필수 | | 도구 이름 (고유) |
| `description` | 선택 | | 호출 조건 설명 |
| `responseMode` | 선택 | `"wait"` | `"fire_and_forget"` 이면 발송 결과를 기다리지 않고 대화 진행 (늦은 결과는 대화에 미주입) |
| `smsMessageType` | 선택 | `"static"` | `"static"` (고정) 또는 `"dynamic"` (AI 생성) |
| `smsMessagePrompt` | 선택 | | dynamic: AI가 SMS 생성할 프롬프트 |
| `smsMessageStaticSentence` | 선택 | | static: 발송할 고정 문장 |
| `smsMessageStaticTitle` | 선택 | | static: 선택 제목 |
| `smsMessageStaticImageFileKeys` | 선택 | | static: MMS 이미지 file key, 최대 3개 |
| `smsFromNumber` | 선택 | | 조직이 보유한 SMS 발신 가능 번호. 생략 시 통화 context 기본값 |

### send_dtmf

IVR 메뉴 탐색을 위한 DTMF 톤을 전송합니다.

- 설계 가이드: `vox-agents/references/ivr-navigation-best-practice.md` 참조

```json
{"toolType": "send_dtmf", "name": "send_dtmf", "description": "IVR 메뉴 탐색 시 DTMF 톤을 전송합니다."}
```

| 필드 | 필수 | 기본값 | 설명 |
|-----|------|--------|------|
| `toolType` | 필수 | | `"send_dtmf"` |
| `name` | 필수 | | 도구 이름 (고유) |
| `description` | 선택 | | 호출 조건 설명 |
| `allowInterruption` | 선택 | `true` | DTMF 도구 실행 중 사용자 발화로 끼어들 수 있는지 |

### search_address

통화 중 들은 한국 주소를 검색해 도로명·지번 주소 후보를 돌려줍니다. 도구는 후보와 근거만 반환하고 주소를 확정하지 않으므로, 에이전트가 후보를 읽어 주고 사용자 확인을 받아 확정하도록 프롬프트에 적어야 합니다.

- 설계 가이드: 주소 수집 절차를 Manual로 분리할 때는 `vox-agents` 스킬의 Manual 작성 규칙을 따른다 (`@tool:search_address` 참조 방식)

```json
{"toolType": "search_address", "name": "search_address", "description": "고객이 배송지나 방문지 주소를 말할 때 주소 후보를 검색합니다."}
```

| 필드 | 필수 | 기본값 | 설명 |
|-----|------|--------|------|
| `toolType` | 필수 | | `"search_address"` |
| `name` | 필수 | | 도구 이름 (고유). 기본 이름은 `search_address` |
| `description` | 선택 | 서버 기본 설명 | 호출 조건 설명 |
| `speakDuringExecution` | 선택 | | 검색 중 재생할 TTS 메시지 설정 |
| `allowInterruptionDuringExecution` | 선택 | | 검색 중 사용자 발화로 끼어들 수 있는지 |
| `toolCallSound` | 선택 | | 검색 중 재생할 대기음 프리셋 (`none` / `typing` / `elevator_1`~`elevator_4`) |

정확한 필드명과 기본값은 `get_schema(namespace="tool-schema", schema_type="search_address")` 결과를 따릅니다.

## 필드 보존 주의

`builtInTools`를 보내면 배열 전체가 교체됩니다. 일부 도구만 수정하더라도 `get_agent()` 결과에서 수정하지 않는 도구 객체를 그대로 유지하고, 현재 public schema에 없는 필드는 임의로 추가하지 마세요.

특히 다음 public 필드는 기본값으로 재구성하면 실제 통화 동작이 바뀔 수 있습니다.

| 도구 | 보존할 대표 필드 |
|------|------------------|
| `end_call` | `speakDuringExecution` |
| `transfer_call` | `transferConfigurations` 전체 |
| `transfer_agent` | `agent`, `preserveChatContext` |
| `send_sms` | `responseMode`, `smsMessageType`, `smsMessagePrompt`, `smsMessageStaticSentence`, `smsMessageStaticTitle`, `smsMessageStaticImageFileKeys`, `smsFromNumber` |
| `send_dtmf` | `allowInterruption` |
| `search_address` | `speakDuringExecution`, `allowInterruptionDuringExecution`, `toolCallSound` |

## 해제: update_agent(expected_head_revision=..., data={"builtInTools": [...]})

별도 해제 엔드포인트는 없습니다. 제거하려는 도구를 **제외한** 최종 배열을 `update_agent`로 다시 보내면 해당 도구가 빠집니다.

```
update_agent(
  agent_id="agent-uuid",
  expected_head_revision=<head_revision from get_agent>,
  data={
    "builtInTools": [
      {"toolType": "transfer_call", "name": "transfer_to_agent", "transferConfigurations": [{"transferType": "phone", "transferTo": "010-1234-5678"}]}
    ]
  }
)
```
