---
name: vox-onboarding
description: "Getting started with vox.ai — create a voice AI agent, make an outbound call, and set up inbound reception. Guides the full onboarding flow: agent creation → outbound test call → inbound phone number setup. Especially useful for first-time users and general vox.ai questions. Trigger on '에이전트 만들어줘', '전화 걸어줘', 'vox 시작', '음성 에이전트', '아웃바운드', '인바운드', or any getting-started request. Use this when the user has no agent yet or no working MCP connection (list_agents fails or returns 0). If agents already exist and the ask is about the prompt or agent settings, use vox-agents instead."
license: MIT
compatibility: "Requires the vox MCP server (https://mcp.tryvox.co/mcp, OAuth login on first tool call), registered by the vox-ai plugin. Works in Claude Code, Codex, and any agentskills.io-compatible client; the vox CLI bundles the same skill offline."
---

# vox — 음성 AI 에이전트 시작하기

vox.ai MCP 도구를 사용해 음성 AI 에이전트를 만들고 실제 전화를 걸거나 받는 것을 도와주는 스킬.

## 온보딩

처음 사용하는 사용자를 자연스러운 대화로 안내한다. 사용자가 한 번에 정보를 주면 추가 질문 없이 바로 진행. 정보가 부족할 때만 가볍게 물어본다.

### Step 1: MCP 연결 확인

`list_agents` MCP 도구를 호출하여 vox.ai 서버 연결을 확인한다.

성공하면 Step 2로 넘어간다.

실패하면:
- "vox.ai MCP 서버에 연결되지 않았습니다. 어떤 AI 도구를 사용하고 계신가요?" (Claude Code / Codex / Cursor / VS Code 등)
- 사용자가 알려주면 references/mcp-vox-integration.md에서 해당 클라이언트 섹션을 읽고 연결 방법을 안내
- vox MCP는 OAuth only다 (API token 방식은 지원하지 않는다). 첫 도구 호출 시 브라우저에서 로그인 창이 열린다.
- 안내 후: "설정이 완료되면 '준비됐어요'라고 말씀해주세요" → 다시 list_agents 호출하여 확인

### Step 2: 에이전트 생성

사용자가 이미 충분한 정보를 줬으면 (예: "치과 예약 에이전트 만들어줘") 바로 생성. 정보가 부족할 때만 질문한다.

**필요한 정보:**
- 업종 (어떤 분야?)
- 사용 사례 (에이전트가 할 일?)
- 웹사이트/참고 자료 (선택)

**프롬프트는 `vox-agents` 스킬을 호출해 만든다.** 다른 스킬의 파일 경로를 직접 열지 않는다 — 플러그인 설치 위치에 따라 해석되지 않는다. 호출할 때 업종·사용 사례·참고 자료를 넘기고 완성된 프롬프트를 받는다.
- 결과에는 역할 정의, 인사말, 업무 범위, 톤, 금지사항, 마무리 멘트가 있어야 한다
- 한국어 자연스러운 음성 대화체

수집한 정보로:
1. 에이전트 이름 자동 생성 (업종 + 사용 사례 기반)
2. 위 템플릿 기반으로 프롬프트 생성
3. 사용자에게 이름과 프롬프트 요약을 보여주고 확인: "이렇게 만들까요?"
4. 확인 받으면 `create_agent` MCP 도구로 생성
   - name: 이름
   - type: "single_prompt" (기본값 — 생략 가능)
   - data: { prompt: { prompt: "<생성된 프롬프트>" } } — `prompt`는 문자열이 아니라 객체다. `firstLine`/`firstLineType`은 생략하면 서버 기본값이 적용된다. 프롬프트/설정은 top-level이 아니라 `data` 안에 넣는다(camelCase). 정확한 형태는 `get_schema(namespace="agent-schema", schema_type="agent-data-create", detail="minimal")`로 확인
   - llm/voice는 넣지 않는다 — `data.llm`/`data.voice`를 생략하면 서버가 기본값을 채운다. 사용자가 특정 음성·언어를 명시할 때만, 허용값을 `list_voice_models(language="ko-KR")`·`list_llm_models`로 조회해 지정한다.

If the user explicitly asks for GPT-Live during onboarding, do not use the
pipeline-only default above. Create only a `type: "single_prompt"` agent;
current vox.ai GPT-Live does not support `type: "flow"` and rejects a
`gpt_live` runtime on an existing Flow. Do not implicitly convert or migrate a
Flow; existing Flow agents remain on `pipeline`. Hand the payload design to
`vox-agents` and require `data.llm.model` plus an explicit `data.runtime` object.
Put the GPT-Live voice under `data.runtime.voice` (the `builtin` `marin` shape is an example). The
`custom` form is a reference for a new GPT-Live custom voice only; existing
pipeline voice settings remain unchanged and are not migrated. Organization
authorization and provisioning must complete before use, followed by quality
validation; do not present the reference as execution-ready or as a way to
create a voice. Omit
legacy pipeline `stt`, `voice`, `parallelSTT`, and
schema-marked legacy speech preferences. Do not infer GPT-Live from a missing
field or silently map `data.llm` to another model.

생성 성공 시에만 다음 단계로 진행.
실패 시: 에러 내용을 보여주고 수정 후 재시도.

### Step 3: 아웃바운드 콜 (전화 걸기)

"직접 들어보시겠어요? 전화번호를 알려주시면 에이전트가 전화합니다."
(넘어가려면 "나중에 해볼게요"도 OK)

사용자가 번호를 알려주면:
1. `list_telephone_numbers` MCP 도구로 보유 번호 확인
2. 보유 번호가 있으면: 해당 번호를 call_from으로 사용
3. **보유 번호가 없으면 (results가 비어있음)**:
   - `list_organizations` MCP 도구로 현재 organization_id를 확인
   - 아래 URL을 사용자에게 안내한다 (이 URL로 들어가면 번호 구매 다이얼로그가 바로 열림):
     ```
     https://www.tryvox.co/dashboard/{organization_id}/numbers?new=1
     ```
   - "발신 번호가 없어서 전화를 걸 수 없습니다. 위 링크로 들어가 번호를 구매하신 후, '번호 샀어요'라고 말씀해주세요"
   - 사용자가 구매 완료를 알리면 `list_telephone_numbers`를 다시 호출하여 확인
   - 구매를 원하지 않으면 Step 4로 넘어간다
4. 번호가 있으면 `create_call` MCP 도구 실행
   - agent_id: Step 2에서 생성한 에이전트 ID
   - call_from: 보유 번호
   - call_to: 사용자가 알려준 번호
5. 발신 직후 연결이 시작된다. 통화 후 결과는 `get_call` 도구로 확인한다.

### Step 4: 인바운드 안내 (전화 받기)

"전화를 받는 에이전트도 설정할 수 있어요."
(넘어가려면 "나중에 할게요"도 OK)

1. `list_telephone_numbers` MCP 도구로 보유 번호 확인 (Step 3에서 이미 조회했으면 재사용)
2. **번호가 있으면**: `update_telephone_number_agent` 도구로 바로 연결한다.
   - 번호 row의 `id`를 그대로 `organization_telephone_number_id`로 사용
   - `update_telephone_number_agent(organization_telephone_number_id=<id>, inbound_agent={ agent_id: <방금 만든 에이전트>, agent_version: "current" })`
   - `agent_version`: `current`(기본)|`production`|`v{n}`
   - 에이전트는 같은 조직 소속이어야 하고, 번호는 만료되지 않은 상태여야 한다
   - 인바운드 연결을 해제하려면 `clear_inbound_agent=true` (단독 사용 — `inbound_agent`와 함께 보낼 수 없다)
   - 연결 후 "이제 이 번호로 전화하면 방금 만든 에이전트가 받습니다"로 마무리한다.
3. **번호가 없으면**: 번호 구매는 공개 MCP에 도구가 없으므로 웹 앱에서 진행한다. `list_organizations`로 `organization_id`를 확인한 뒤, 구매 다이얼로그가 자동으로 열리는 딥링크를 안내한다.
   ```
   https://www.tryvox.co/dashboard/{organization_id}/numbers?new=1
   ```
   구매 완료 후 "번호 샀어요"라고 하면 `list_telephone_numbers`를 다시 호출하고, 위 2번대로 `update_telephone_number_agent`로 연결한다.

### Step 5: 완료

**완료 요약:**
- 생성된 에이전트: {name} (ID: {agent_id})
- 아웃바운드 테스트: {완료/스킵}
- 인바운드 설정: {완료/스킵}
- 대시보드: https://www.tryvox.co/agent/{agent_id}

**다음 단계:**
- 프롬프트 다듬기 → 그냥 "프롬프트 수정해줘"라고 말하면 됨 (vox-agents 스킬이 처리)
- 대량 발신 → "대량발신 설정해줘" (vox-web-app 스킬이 처리)
- 도구 추가 → "도구 연결해줘" (vox-tools 스킬이 처리)
- 요금 확인 → "요금이 얼마예요?" (vox-docs MCP에서 pricing 검색)

이 스킬들은 vox-ai 플러그인에 포함되어 있으며, 플러그인 설치 시 함께 사용 가능하다.

## 이 스킬이 하지 않는 것

- 프롬프트 작성의 세부 규칙 → vox-agents
- 플로우 노드 설계 → vox-flow
- 빌트인/커스텀 도구 관리 → vox-tools
- 가격 정책 상세 → vox-docs MCP에서 pricing 검색

## Related Resources

### MCP Tools (vox)
- `list_organizations` — 현재 조직 확인 (웹 앱 딥링크 생성용 `organization_id`)
- `list_agents`, `create_agent` — 에이전트 조회/생성
- `create_call` — 아웃바운드 콜 실행
- `list_telephone_numbers` — 보유 번호 확인 (read-only)
- `update_telephone_number_agent` — 번호에 인바운드 에이전트 연결/해제

번호 구매는 공개 MCP에 도구가 없으므로 `https://www.tryvox.co/dashboard/{organizationId}/numbers?new=1`로 안내한다.

### Docs (vox-docs)
- `https://docs.tryvox.co/docs/start/quickstart` — 빠른 시작 가이드
- `https://docs.tryvox.co/docs/start/pricing` — 요금 안내

### App URLs
- `https://www.tryvox.co` — 대시보드 홈
- `https://www.tryvox.co/agent/{agentId}` — 에이전트 상세
