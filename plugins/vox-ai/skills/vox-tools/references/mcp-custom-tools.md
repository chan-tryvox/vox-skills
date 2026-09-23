# 커스텀 도구 레퍼런스

조직 단위 커스텀 도구(HTTP/API)의 조회, 생성, 수정, 삭제 및 에이전트 연결/해제입니다. 공개 MCP `create_tool`은 HTTP 엔드포인트 호출 설정(API 타입)만 지원합니다. MCP 서버를 도구로 붙이는 MCP 타입 커스텀 도구는 웹 앱(`/dashboard/{orgId}/tools?create=mcp`)에서만 만들 수 있으며, 그 안내는 `vox-web-app` 스킬이 담당합니다.

## 조회: list_tools(organization_id)

```
list_tools(organization_id="org-uuid")
```

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `organization_id` | 선택 | 미지정 시 기본 조직 사용 |

응답 예시:

```json
{
  "organization_id": "org-uuid",
  "tools": [
    {"uid": "tool-uuid", "name": "check_order_status", "description": "주문 상태 조회"}
  ],
  "count": 1
}
```

단건 상세는 `get_tool(tool_id="tool-uuid")`로 조회합니다.

## 생성: create_tool(...)

HTTP 엔드포인트를 호출하는 도구를 만듭니다.

```
create_tool(
  name="check_reservation",
  input_schema={
    "type": "object",
    "properties": {"reservation_id": {"type": "string", "description": "예약 번호"}},
    "required": ["reservation_id"]
  },
  api_configuration={
    "url": "https://api.example.com/reservations",
    "method": "GET",
    "headers": {"Authorization": "Bearer {{api_token}}"},
    "timeout_seconds": 5
  },
  description="예약 상태 조회"
)
```

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `name` | 필수 | 도구 이름 (영문/숫자/`_`/`-`, 1-64자) |
| `input_schema` | 필수 | 도구 파라미터 JSON Schema |
| `api_configuration` | 필수 | HTTP 호출 설정 (아래 표) |
| `description` | 선택 | 도구 설명 |
| `speak_during_execution` | 선택 | 실행 중 발화 설정 |
| `allow_interruption_during_execution` | 선택 | 실행 중 인터럽트 허용 |
| `response_mode` | 선택 | `"wait"` (기본, 응답 대기) 또는 `"fire_and_forget"` (요청만 보내고 진행) |
| `organization_id` | 선택 | 미지정 시 기본 조직 사용 |

`"fire_and_forget"` 은 늦게 도착한 응답을 대화에 주입하지 않으며, flow 의 응답 변수·결과 기반 transition 과 조합하면 저장이 거부됩니다. flow `tool` 노드는 이 설정을 그대로 상속합니다 (노드 오버라이드 없음).

### api_configuration

| 필드 | 필수 | 설명 |
|-----|------|------|
| `url` | 필수 | 호출 대상 URL |
| `method` | 필수 | `"GET"` / `"POST"` 등 |
| `headers` | 선택 | 요청 헤더 객체 |
| `auth_type` | 선택 | 인증 방식 |
| `auth_credentials` | 선택 | 인증 자격 |
| `timeout_seconds` | 선택 | 타임아웃 |

## 수정: update_tool(...)

```
update_tool(tool_id="tool-uuid", description="예약 상태 및 잔여석 조회")
```

`tool_id`와 **변경할 필드만** 전달합니다. `response_mode` 를 `"wait"` → `"fire_and_forget"` 으로 바꿀 때, 이 도구를 결과 기반 transition 으로 참조 중인 flow 가 있으면 저장이 거부됩니다.

## 삭제: delete_tool(tool_id)

```
delete_tool(tool_id="tool-uuid")
```

에이전트 연결/해제 요청 전 `get_agent`를 호출하고 응답의 `head_revision`을
필수 `expected_head_revision`으로 전달합니다. `REVISION_CONFLICT`를 자동 재시도하지
않습니다.

## 에이전트 연결: update_agent(expected_head_revision=..., data={"toolIds": [...]})

```
update_agent(agent_id="agent-uuid", expected_head_revision=<head_revision from get_agent>, data={"toolIds": ["tool-uuid"]})
```

`list_tools()` 또는 `create_tool()` 응답의 `uid`를 `data.toolIds` 배열에 넣어 전달합니다. `toolIds`는 top-level 인자가 아니라 `data` 안의 필드입니다 — top-level로 보내면 호출이 거부됩니다.

## 에이전트 해제: update_agent(expected_head_revision=..., data={"toolIds": [...]})

```
update_agent(agent_id="agent-uuid", expected_head_revision=<head_revision from get_agent>, data={"toolIds": []})
```

`toolIds`는 교체(replace) 방식입니다. 일부만 변경할 때는 `get_agent()`로 현재 `data.toolIds`를 조회한 뒤 원하는 항목을 추가/제거한 전체 배열을 다시 저장하세요.
