# MCP 도구 관리 가이드

vox MCP 서버를 통해 에이전트에 도구를 조회/생성/장착/해제하는 방법을 다룹니다.

## 개요

vox.ai 에이전트는 두 종류의 도구를 사용합니다.

| 구분 | 빌트인 도구 | 커스텀 도구 |
|------|------------|------------|
| 종류 | `end_call`, `transfer_call`, `transfer_agent`, `send_sms`, `send_dtmf`, `search_address` (정본: `list_schemas`) | HTTP/API |
| 범위 | 플랫폼 전체 공통 | 조직(organization) 단위 |
| 생성 | 불가 (플랫폼 제공) | `create_tool()` |
| 에이전트 연결 | `update_agent(expected_head_revision=..., data={"builtInTools": [...]})` | `update_agent(expected_head_revision=..., data={"toolIds": [...]})` |

- **빌트인 도구**: 플랫폼이 제공하는 기본 도구. 별도 생성/연결 엔드포인트 없이 `data.builtInTools[]` 배열로 에이전트에 직접 설정(파라미터)을 지정하여 장착합니다.
  - 상세: See [mcp-built-in-tools.md](mcp-built-in-tools.md)
- **커스텀 도구**: 조직이 직접 만드는 HTTP 엔드포인트 호출 도구. `create_tool()`로 만들고 `data.toolIds[]`로 연결합니다.
  - 상세: See [mcp-custom-tools.md](mcp-custom-tools.md)
- **에이전트 설정 데이터**(`agent.data`): `vox-agents` 스킬의 `references/agent-data-reference.md` 참조

모든 `update_agent` 쓰기에는 먼저 `get_agent`로 읽은 `head_revision`을
`expected_head_revision`으로 전달하세요. `REVISION_CONFLICT`가 나면 자동 재시도하지
말고 최신 상태를 사용자와 확인합니다.

## End-to-end 워크플로우

에이전트에 빌트인 + 커스텀 도구를 모두 장착하는 전체 흐름입니다.

### 1. 빌트인 도구 payload 스키마 확인

```text
list_schemas(namespace="tool-schema", category="built_in", include_schema=true)
get_schema(namespace="tool-schema", schema_type="transfer_call")
```

### 2. 에이전트 생성

```
create_agent(
  name="CS 상담 에이전트",
  type="single_prompt",
  data={"prompt": {"prompt": "당신은 CS 상담 에이전트입니다..."}}
)
```

### 3. 빌트인 도구 장착

```text
get_agent(agent_id="agent-uuid")
update_agent(
  agent_id="agent-uuid",
  expected_head_revision=<head_revision from get_agent>,
  data={
    "builtInTools": [
      {"toolType": "end_call", "name": "end_call", "description": "통화를 종료합니다."},
      {
        "toolType": "transfer_call", "name": "transfer_to_human",
        "transferConfigurations": [{"transferType": "phone", "transferTo": "010-1234-5678"}]
      }
    ]
  }
)
```

`builtInTools`는 **교체(replace)** 방식입니다.
- 일부만 바꾸려면 `get_agent()`로 현재 `data.builtInTools`를 읽고
- 원하는 항목을 추가/제거한 전체 배열을 다시 `update_agent(expected_head_revision=..., data={"builtInTools": [...]})`로 저장하세요.
- `end_call.speakDuringExecution`, `transferConfigurations`, `send_sms.responseMode`, `send_dtmf.allowInterruption`처럼 기본값이 아닌 public schema 필드는 기존 객체에서 그대로 보존하세요.

### 4. 커스텀 도구 생성 & 연결

```
create_tool(
  name="check_order",
  input_schema={"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]},
  api_configuration={
    "url": "https://api.example.com/orders",
    "method": "GET",
    "timeout_seconds": 10
  },
  description="주문 상태 조회"
)

get_agent(agent_id="agent-uuid")
update_agent(agent_id="agent-uuid", expected_head_revision=<head_revision from get_agent>, data={"toolIds": ["tool-uuid"]})
```

### 5. 확인

```
get_agent(agent_id="agent-uuid")
```

`data.builtInTools`와 `data.toolIds`를 확인.

## 주의사항

### name 규칙

- 영문/숫자/`_`/`-`만 허용, 1-64자
- 정규식: `^[A-Za-z0-9_-]{1,64}$`
- 에이전트 내 name 중복 금지 (중복 시 에러)

### 예약어

도구 이름으로 사용 불가: `extract_variables`, `request_api`, `retrieve_knowledge`, `determine_transition`

### 도구 장착 순서

`update_agent`의 built-in tool 입력은 `data.builtInTools`이며 **교체(replace)** 방식입니다.
- 단건 추가/해제도 `현재 목록 조회 -> 목록 수정 -> 전체 목록 저장` 순서로 처리하세요.

### 커스텀 도구 삭제

커스텀 도구 삭제: `delete_tool(tool_id="uuid")` — 상세는 [mcp-custom-tools.md](mcp-custom-tools.md) 참조.
