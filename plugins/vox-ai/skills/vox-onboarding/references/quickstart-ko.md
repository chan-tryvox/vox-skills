# vox.ai MCP 수동 연결 가이드

이 문서는 **Plugin을 사용하지 않고** vox.ai MCP 서버에 직접 연결하려는 사용자를 위한 reference다. 대부분의 사용자는 이 레포 README의 Plugin 설치 절차를 따르면 되고, Plugin이 `.mcp.json`으로 MCP 연결을 자동 구성한다. 레포에서 에이전트를 코드처럼 관리하는 코딩 에이전트 작업은 [vox CLI](https://docs.tryvox.co/docs/ai/cli)가 담당한다.

## MCP 서버 연결

vox.ai MCP 서버 URL: `https://mcp.tryvox.co/mcp`

vox MCP는 **OAuth only**다. API token/`Authorization: Bearer` 헤더 방식은 지원하지 않는다. 클라이언트가 OAuth를 지원하지 않으면 연결할 수 없다.

### Claude Code

```bash
claude mcp add --transport http vox https://mcp.tryvox.co/mcp
```

추가 후 채팅에서 `/mcp` 명령으로 연결 상태를 확인한다. 첫 vox 도구 호출 시 브라우저에서 로그인 창이 열린다.

### OpenAI Codex

Plugin (권장, 2026-04+):
```bash
codex plugin marketplace add vox-public/vox-skills
```

그 뒤 plugin 목록에서 `vox-ai`를 설치한다.
- Codex App: **Plugins** 화면에서 `vox-ai` → **Add to Codex**
- Codex CLI: `codex` 실행 후 `/plugins` → `vox-ai` → **Install plugin**

MCP 직접 등록:
```bash
codex mcp add vox --url https://mcp.tryvox.co/mcp
codex mcp login vox
```

### Cursor

`~/.cursor/mcp.json` 또는 `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "vox": { "url": "https://mcp.tryvox.co/mcp" }
  }
}
```

### VS Code Copilot

`.vscode/mcp.json`:
```json
{
  "servers": {
    "vox": {
      "type": "http",
      "url": "https://mcp.tryvox.co/mcp"
    }
  }
}
```

## 사용

연결 후 AI 앱에서 vox.ai MCP 도구가 보이면 연결 완료다. 확인: "vox.ai 에이전트 목록을 보여줘"라고 요청해 `list_agents`가 실행되면 정상이다.

Plugin을 설치한 경우에는 `/vox-ai:vox-onboarding`(Claude Code/Codex/Cowork) 또는 "에이전트 만들어줘" 같은 자연어 요청으로 온보딩이 시작된다.

## 공개 MCP 도구

아래는 공개 surface에 노출되는 도구다. 정본은 레포의 `scripts/vox-mcp-public-tools.json`(vox-mcp `PUBLIC_TOOL_NAMES` 스냅샷)이고, 개수와 이름은 그 파일 기준이다.

| 도구 | 설명 |
|------|------|
| `list_organizations` | 소속 조직 목록과 current/default 조직 확인 |
| `set_organization` | 현재 세션의 활성 조직 전환 |
| `list_agents` | 에이전트 목록 |
| `get_agent` | 에이전트 상세 |
| `create_agent` | 에이전트 생성 |
| `update_agent` | 에이전트 수정 |
| `list_calls` | 통화 기록 |
| `get_call` | 통화 상세 |
| `create_call` | 아웃바운드 콜 |
| `validate_flow` | public `flow` 검증 (dry-run, 기본 all; critical/runtime level 지원) |
| `update_agent_partial` | retired 이름. 현재 클라이언트는 로컬에서 거부하며 API 요청을 보내지 않음 |
| `validate_flow_data` | legacy `flow_data` 검증 (dry-run, fixed_flow_data 반환) |
| `autofix_flow_data` | legacy `flow_data` 자동 보정 (preview / apply) |
| `list_tools` | 커스텀 도구(HTTP/API) 목록 |
| `create_tool` | 커스텀 도구 생성 (HTTP/API) |
| `get_tool` | 커스텀 도구 상세 |
| `update_tool` | 커스텀 도구 수정 |
| `delete_tool` | 커스텀 도구 삭제 |
| `list_schemas` | public schema 목록 (agent / flow / tool 등) |
| `get_schema` | 특정 schema body 조회 (namespace + schema_type) |
| `list_knowledges` | 지식 베이스 목록 (read-only) |
| `list_llm_models` | 허용 LLM 모델 목록 |
| `list_voice_models` | 허용 음성 모델 목록 |
| `list_telephone_numbers` | 보유 번호 조회 (read-only) |
| `update_telephone_number_agent` | 번호에 인바운드 에이전트 연결/해제 (`inbound_agent` / `clear_inbound_agent`) |

`update_agent`를 쓸 때는 직전 `get_agent` 응답의 `head_revision`을 필수 `expected_head_revision`으로 전달하세요. Flow 전체를 교체하면 `flow_revision`도 `expected_flow_revision`으로 전달하고, `REVISION_CONFLICT`를 자동 재시도하지 마세요.

번호 구매, 대량 발신 캠페인은 이 phase에서 공개 MCP 도구가 없다. 웹 앱(`https://www.tryvox.co/dashboard/{organizationId}/numbers`)에서 수행한다.
