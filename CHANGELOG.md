# Changelog

이 파일은 `domains/voxai/skills`의 maintainer-facing 변경 이력을 남긴다.

## Changelog Philosophy

- high-signal만 남긴다.
- skill catalog 변경, routing 규칙, MCP 연결 설정, plugin install 절차, 공개 문구(README/references) 변화 위주로 기록한다.
- 단순 formatting, noisy refactor, generated diff는 원칙적으로 적지 않는다.
- reader는 미래의 maintainer라고 가정한다.

## Format

- reverse chronological order를 유지한다.
- 먼저 `Unreleased`를 두고, release 시 날짜/버전 section으로 잘라낸다.
- category는 아래만 쓴다:
  - `Added`
  - `Changed`
  - `Fixed`
  - `Removed`
  - `Docs`

## Entry Rules

- 한 줄 요약이 아니라, 무엇이 바뀌었고 왜 중요한지 짧게 적는다.
- skill trigger/routing/ownership boundary가 바뀌면 반드시 남긴다.
- plugin install 절차, MCP 서버 URL, `.mcp.json` 스키마가 바뀌면 반드시 남긴다.
- README/references 같은 공개 문서 contract가 바뀌면 `Docs`에 남긴다.

## Template

```md
## Unreleased

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...

### Docs
- ...
```

## Unreleased

### Changed
- `vox-flow` 에 `validate_flow_data` dry-run 워크플로우를 통합했다. SKILL.md Workflow 를 4단계로 확장(4단계: dry-run 검증)하고 Core Operating Rules #9(전송 전 dry-run)·#10(nested config default 는 백엔드가 채움)을 추가했으며, Response Handling 섹션을 신설해 응답별 처리 룰과 룰 ID 빠른 참조를 정리했다. references 도 정합화 — `flow-review.md` 섹션 F(dry-run + 식별자 필수), `execution-node-markdown.md` / `node-types.md` / `node-creation.md` 의 dry-run 단계 통합. 사용자 입장에서 (1) 차단 오류가 400/422 로 노출되는 일을 줄이고, (2) 자동 보정 사실이 빠짐없이 전달되도록 한다.
- `vox-flow` references에 api 노드 실패 분기 설계 규칙을 추가했다. api 호출 실패 fallback edge가 곧바로 endCall로 흘러가면 사용자가 통화가 갑자기 끊긴 인상을 받기 때문에, 짧은 양해 안내 conversation 노드로 흡수한 뒤 마무리하도록 가이드한다. `execution-node-markdown.md`에 anti-pattern / 권장 JSON 예시를 두고, `node-examples.md`에 짝꿍 노드(API 실패 안내 conversation) 예시를 추가했으며, `flow-review.md`에는 통화 흐름 안전성 섹션 E를 신설해 E1 CRITICAL(api 실패 분기 + 안내 노드 흡수)와 E2 WARN(tool/sendSms 실패 흡수)을 두었다.
- `vox-flow`를 schema endpoint 우선 운영 방식으로 정리했다. 노드별 JSON field 목록을 로컬 reference에 고정하지 않고, `get_schema(namespace="flow-schema", schema_type="flow-data")`와 agent data schema를 호출한 뒤 `create_agent(type="flow", data=..., flow_data=...)` / `update_agent(flow_data=...)`를 수행하도록 안내한다.
- `vox-flow` node markdown 작성 가이드를 경량 라우터(`node-creation.md`)와 세부 reference(`conversation-markdown.md`, `execution-node-markdown.md`, `node-examples.md`)로 분리했다. 대시보드 입력용 markdown과 MCP/API `flow_data` JSON을 명확히 구분해 오래된 v2 shape가 섞이는 문제를 줄인다.
- Codex plugin 설치 경로를 2026-04 신규 `codex marketplace add vox-public/vox-skills` 단일 명령으로 전환했다. `README.md`, `vox-onboarding/references/quickstart-ko.md`, `vox-onboarding/references/mcp-vox-integration.md`의 기존 `git clone → cd → codex → /plugins` 흐름을 모두 대체하고 App(**Plugins → Add to Codex**)과 CLI(`/plugins → Install plugin`) 설치를 병기했다. docs `docs/ai/openai-codex` 개편과 정합한다.
- `vox-onboarding` Step 4(인바운드 안내)를 공개 MCP surface와 정합화했다. `update_telephone_number`가 Phase 1 public이 아니므로 번호-에이전트 연결은 웹 앱(`/dashboard/{organizationId}/numbers`)으로 안내하도록 바꿨다.
- `vox-onboarding` Related Resources의 MCP Tools 목록을 실제 public(`list_telephone_numbers`만 read-only)으로 정리하고 `list_organizations`를 명시했다.
- vox MCP의 **OAuth-only** contract를 온보딩 문서에도 반영했다. `SKILL.md` Step 1, `quickstart-ko.md`, `references/mcp-vox-integration.md`에서 `Authorization: Bearer ${VOX_API_KEY}` / `bearer_token_env_var` 등 **제거된 API token 방식** 안내를 모두 걷어내고 클라이언트별 OAuth 경로만 남겼다. 서버가 받지 않는 방식을 가이드해 유저를 막다른 길로 보내는 문제를 제거한다.

### Fixed
- `vox-agents`의 agent data / variable reference를 현재 MCP surface와 맞췄다. top-level `prompt`나 `agent_type` shortcut을 가정하지 않고, agent `data` schema와 flow 변수 전달 규칙을 기준으로 설명한다.
- `vox-agents` references의 변수 미주입 동작 기술을 실제 정책과 정합화했다. `voice-ai-playbook.md`(워크플로우/Variables 샘플/fallback 규칙), `voice-ai-prompt-template.md`(메타 가이드 + 템플릿 본문), `voice-ai-prompt-revision.md`(Pattern D), `voice-ai-prompt-diagnosis.md`(증상 6)에서 "비어있을 수 있음" 같은 표현을 "주입되지 않으면 `{{...}}`가 그대로 전달됨"으로 바꿨다. 이 문구들이 생성된 system prompt에 그대로 복사되어 런타임 LLM이 미주입 방어 로직을 엉뚱한 케이스(빈 값)에만 적용하던 문제를 제거한다. Mission 1 dry run 준비 중 사용자 제보로 발견.

### Docs
- `README.md`의 Claude Code Plugin 섹션에 `/reload-plugins` 단계와 "첫 도구 호출 시 OAuth 로그인" 시점을 명시했다. 설치 직후 도구가 보이지 않는 상황을 줄이기 위함이다.
- `references/mcp-vox-integration.md`, `references/quickstart-ko.md`, `README.md`의 MCP 서버 URL을 canonical `/mcp` 경로로 통일했다. `https://mcp.tryvox.co/`(root)는 404이고 실제 endpoint는 `/mcp`다.
- `references/quickstart-ko.md`를 "Plugin 없이 MCP 수동 연결"에 집중하도록 재정리하고, 공개 MCP 도구 목록을 Phase 1 public surface(`PUBLIC_TOOL_NAMES`)와 정합화했다. campaign/telephone 번호 CRUD/eval 도구가 공개되어 있다는 오해를 제거했다.
