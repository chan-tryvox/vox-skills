---
name: vox-tools
description: "Use whenever the user asks about vox.ai tool management — adding or removing built-in tools (end_call, transfer_call, transfer_agent, send_sms, send_dtmf, search_address), creating custom HTTP/API tools, tool attachment/detachment workflow, or any question about managing tools on a vox agent. Trigger on 'end_call 추가해줘', 'custom tool 만들어줘', '도구 연결 어떻게 해', '도구 빼줘', 'transfer_call 제거해줘', '빌트인 도구 목록', or any vox tool question. If the question is about how to phrase tool usage inside the prompt, use vox-agents instead."
license: MIT
compatibility: "Requires the vox MCP server (https://mcp.tryvox.co/mcp, OAuth login on first tool call), registered by the vox-ai plugin. Works in Claude Code, Codex, and any agentskills.io-compatible client; the vox CLI bundles the same skill offline."
---

# vox-tools

vox.ai 에이전트의 도구 관리를 다루는 domain skill. 빌트인 도구와 커스텀 도구의 조회/생성/장착/해제를 안내한다.

## References

- **mcp-tool-management.md** — 도구 관리 전체 워크플로우. **도구 장착/해제 작업 시 읽기.** See [references/mcp-tool-management.md](references/mcp-tool-management.md)
- **mcp-built-in-tools.md** — 빌트인 도구 파라미터 상세 (end_call, transfer_call, transfer_agent, send_dtmf, send_sms, search_address). **빌트인 도구 설정 시 읽기.** See [references/mcp-built-in-tools.md](references/mcp-built-in-tools.md)
- **mcp-custom-tools.md** — 커스텀 도구(HTTP/API) 생성/연결/삭제. **커스텀 도구 작업 시 읽기.** See [references/mcp-custom-tools.md](references/mcp-custom-tools.md)

MCP 서버 연결 설정(Claude, Cursor, ChatGPT 등)은 `vox-onboarding` 스킬이 담당한다.

## Workflow

도구 장착/해제는 read-modify-write다. 순서를 건너뛰면 `data.builtInTools`/`data.toolIds`가 전체 교체되어 기존 도구가 사라진다.

1. `list_schemas(namespace="tool-schema", category="built_in", include_schema=true)` 또는 `get_schema(namespace="tool-schema", schema_type="<toolType>")`로 현재 built-in 목록과 payload shape를 확인한다. 커스텀 도구는 `list_tools()`로 `uid`를 확인한다.
2. `get_agent()`로 현재 `data.builtInTools`와 `data.toolIds`를 읽는다.
3. 기존 항목을 그대로 두고 추가/제거만 반영한 **전체 배열**을 만든다. 기존 도구 객체의 `speakDuringExecution`, `transferConfigurations`, `responseMode` 같은 설정은 손대지 않는다.
4. Only call `update_agent(agent_id=..., expected_head_revision=<get_agent.head_revision>, data={"builtInTools": [...]} | {"toolIds": [...]})` after the user explicitly authorizes the write.
5. `get_agent()`로 round-trip 확인한다.

Every `update_agent` write must use the caller-observed `expected_head_revision` from the current `get_agent` result. Surface `REVISION_CONFLICT` without a blind retry.

## Core Operating Rules

- 작업 유형에 맞는 reference를 먼저 열고 그 규칙을 적용한다.
- vox 플랫폼의 도구명/필드/엔드포인트는 **확인된 목록**이 없으면 만들어내지 않는다 — 존재하지 않는 도구를 안내하면 고객이 디버깅에 시간을 낭비한다.
- MCP로 실제 업데이트는 유저가 "적용/업데이트"를 명시했을 때만 실행한다 — `data.builtInTools`와 `data.toolIds`는 전체 교체(replace) 방식이라 실수로 실행하면 기존 도구가 전부 지워진다.
- `data.builtInTools`를 보낼 때는 먼저 `get_agent()`로 현재 도구 객체를 읽고, `list_schemas(namespace="tool-schema", category="built_in", include_schema=true)` 또는 `get_schema(namespace="tool-schema", schema_type="<toolType>")`로 현재 schema를 확인한다. 프롬프트/LLM만 바꾸는 업데이트라면 `builtInTools`를 보내지 않는다.
- 도구 이름 규칙: 영문/숫자/`_`/`-`만 허용, 1-64자, 에이전트 내 중복 금지. 예약어 `extract_variables`, `request_api`, `retrieve_knowledge`, `determine_transition`은 쓸 수 없다 — 생성 시점에 바로 에러가 난다.

## Ownership Boundary

| Owns | Does Not Own |
|------|--------------|
| built-in tools (end_call, transfer_call, transfer_agent, send_sms, send_dtmf, search_address) | prompt authoring (→ vox-agents) |
| custom tools (HTTP/API) | pricing (→ docs MCP) |
| tool management workflow | flow design (→ vox-flow) |
| tool naming rules | MCP server connection setup (→ vox-onboarding) |

## Related Resources

### MCP Tools (vox)
- `list_tools` — 커스텀 도구 목록
- `create_tool` — 커스텀 도구(HTTP/API) 생성
- `get_tool` — 커스텀 도구 상세
- `update_tool` — 커스텀 도구 수정
- `delete_tool` — 커스텀 도구 삭제
- `list_schemas`, `get_schema` — 빌트인 도구 payload 스키마 조회
- `get_agent`, `update_agent` — 도구 장착/해제 시 사용 (`data.builtInTools[]`, `data.toolIds[]`)

### Docs (vox-docs)
- `https://docs.tryvox.co/docs/build/tools` — 도구 관리 개요

### App URLs
- `https://www.tryvox.co/agent/{agentId}` — 에이전트 상세 (Tools 탭)
