---
name: vox-agents
description: "Use whenever the user is building or diagnosing a vox.ai prompt-based (`single_prompt`) voice agent — including its system prompt, optional Manuals (Trigger/content/linked chains), agent.data, pipeline or GPT-Live runtime behavior, and runtime transitions. Manuals are a feature of prompt-based agents, not a separate agent type. For `flow` agent design, use vox-flow instead. Trigger on '프롬프트 작성해줘', '매뉴얼 만들어줘', '프롬프트 고쳐줘', 'GPT-Live', 'gpt_live', '실시간 음성 런타임', '에이전트가 이상하게 답해', '음성 에이전트', or any vox prompt-agent authoring question."
license: MIT
compatibility: "Requires the vox MCP server (https://mcp.tryvox.co/mcp, OAuth login on first tool call), registered by the vox-ai plugin. Works in Claude Code, Codex, and any agentskills.io-compatible client; the vox CLI bundles the same skill offline."
---

# vox-agents

vox.ai 프롬프트 에이전트(single prompt)를 설계하는 domain skill. 공통 음성 UX 규칙과 Agent의 선택적 기능인 Manual을 포함해 에이전트 생성/수정/진단/리팩터링을 담당한다.

Flow 에이전트(multi-node)가 필요한 경우 → `vox-flow` 스킬로 handoff. 사용자가 flow node, node prompt, condition_node, transition, fallback 을 언급하면 single prompt 를 작성하지 말고 `vox-flow` 로 handoff한다.

## Agent Type 판단 기준

| 기준 | Prompt-based (`single_prompt`) | Flow |
|------|-------------------------------|------|
| 흐름 제어 | LLM 판단에 맡길 수 있는 대화와 독립 절차 | 순서와 분기를 node·edge로 결정적으로 강제해야 하는 시나리오 |
| 조건부 분기 | 본문 자연어 분기 또는 선택적 Manual Trigger | extraction → condition처럼 명시적 상태 체인 |
| 외부 API 연동 | Agent Tool 또는 Manual 소유 Tool | api node로 응답 변수 추출·후속 분기까지 보장 |
| 변수 추적 | 대화 맥락과 Manual 로드 시점 변수 | extraction 변수와 condition 체인 |
| 유지보수 | 본문과 선택적 Manual을 기능 단위로 수정 | node 단위로 수정 |

사용자가 유형을 명시하지 않으면 위 기준으로 판단하여 제안한다. 분기 수나 Manual 유무로 Agent type을 바꾸지 않는다. 규제·과금·필수 순서처럼 진입 자체를 모델 재량에 맡길 수 없거나 명시적 상태 체인이 필요하면 `vox-flow`로 handoff한다.

### Manual 사용 판단 (`single_prompt` 내부)

| 업무 | 배치 |
|------|------|
| 짧은 FAQ, 항상 적용되는 역할·톤·가드레일 | Agent 본문 prompt |
| 독립적인 다턴 수집·검증·조건 판정 절차 | Manual |
| 특정 절차에서만 필요한 Tool | 해당 Manual에 귀속 |
| 진입부터 결정적으로 강제해야 하는 규제·과금·필수 순서 | Flow 검토 |
| 3단 이상의 linked Manual 체인이 필요한 절차 | Flow 검토 |

## References

- **voice-ai-playbook.md** — 음성 UX 핵심 규칙, 트레이드오프 우선순위. **새 에이전트 설계 시 가장 먼저 읽기.** See [references/voice-ai-playbook.md](references/voice-ai-playbook.md)
- **default-agent-data.json** + **agent-data-reference.md** — agent.data root 구조 예시(JSON, 복사용 기본값 아님) + MCP 동작 규칙(md). **MCP로 에이전트를 생성·수정할 때 둘 다 읽기.** See [references/default-agent-data.json](references/default-agent-data.json), [references/agent-data-reference.md](references/agent-data-reference.md)
- **gpt-live-agent-data.json** — GPT-Live create/update payload examples and transition matrix. **Read when the user selects GPT-Live or changes `data.runtime`.** See [references/gpt-live-agent-data.json](references/gpt-live-agent-data.json)
- **ivr-navigation-best-practice.md** — IVR 메뉴 탐색, DTMF 전략, send_dtmf 프롬프팅. **에이전트가 ARS/IVR을 통과해야 하는 시나리오에서 읽기.** See [references/ivr-navigation-best-practice.md](references/ivr-navigation-best-practice.md)
- **voice-ai-prompt-template.md** — 한국어 프롬프트 템플릿. **신규 프롬프트 작성 시 복사해 사용.** See [references/voice-ai-prompt-template.md](references/voice-ai-prompt-template.md)
- **voice-ai-prompt-diagnosis.md** — 실패 사례 원인 진단. **에이전트가 이상하게 동작할 때 읽기.** See [references/voice-ai-prompt-diagnosis.md](references/voice-ai-prompt-diagnosis.md)
- **voice-ai-prompt-revision.md** — 진단 기반 리팩터링. **diagnosis 산출물의 change_requests를 반영할 때 읽기.** See [references/voice-ai-prompt-revision.md](references/voice-ai-prompt-revision.md)
- **variable-system.md** — 변수 카테고리(system/dynamic/extraction), naming, 렌더링 위치. **변수 설계 시 읽기.** See [references/variable-system.md](references/variable-system.md)
- **voice-emotive-speech.md** — Cartesia Sonic-3 기반 감정/속도/웃음 표현력 prompting 가이드 (SSML `<emotion>`, `<speed>`, `[laughter]`). **유저가 "자연스럽게", "웃게", "속도 조절", "감정 표현"을 요청할 때 읽기.** See [references/voice-emotive-speech.md](references/voice-emotive-speech.md)
- **manual-authoring.md** — Manual 분리 기준, Trigger 작성, 본문 StartManual 라우팅, content 구조와 Tool 귀속. **Manual을 새로 쓰거나 고칠 때 가장 먼저 읽기.** See [references/manual-authoring.md](references/manual-authoring.md)
- **manual-data-reference.md** — Manual 필드와 Agent·Tool·linked Manual 연결 및 `@tool:`·`@manual:` 참조 규칙. **Manual 필드와 연결 관계를 작성할 때 읽기.** See [references/manual-data-reference.md](references/manual-data-reference.md)
- **manual-review.md** — 직접 연결 및 linked Manual 전체를 재귀적으로 검토하는 품질 게이트. **Manual이 연결된 Agent를 완성·리뷰할 때 읽기.** See [references/manual-review.md](references/manual-review.md)

## Core Operating Rules

1. **작업 유형에 맞는 reference를 먼저 열고** 그 규칙을 적용한다.
2. **사실성 우선** — vox 플랫폼/도구/모델 관련 사실은 확인된 목록이 없으면 만들어내지 않는다. 잘못된 사실은 고객 신뢰를 손상시키고 실제 장애로 이어진다.
   - 목록이 없으면: (1) 확인 질문 1개, 또는 (2) `[[...]]` placeholder로 남긴다.
3. **트레이드오프 우선순위**: 사실성/정확성 > 음성 UX > 친절함/설명량
4. **런타임 발화 vs 개발 산출물 구분** — "기본 1–2문장" 같은 장문 방지 규칙은 에이전트의 **런타임 발화**에만 적용된다. 개발 산출물(시스템 프롬프트, 진단 YAML, 패치 노트)은 필요한 만큼 길어도 된다. 이 구분이 없으면 LLM이 voice UX 규칙을 개발 output에까지 적용해서, 프롬프트의 가드레일/도구 섹션을 지나치게 축약하는 실패가 발생한다.
5. **최소 변경 리팩터링** — 기존 프롬프트의 필수 섹션/도구 계약/변수/에러처리를 삭제하면 런타임 장애가 발생한다.
6. **진단 → 리팩터링 핸드오프**: diagnosis에 `failure_modes`와 `change_requests`가 반드시 포함, revision은 `change_requests`를 근거로만 변경한다 — 근거 없는 재설계는 기존 동작을 깨뜨린다.
7. **MCP 실행 주의** — 유저가 "적용/업데이트"를 명시했을 때만 실행. builtInTools/toolIds가 전체 교체 방식이라 실수로 실행하면 기존 설정이 날아간다. `agent-data-reference.md` 참조.
8. **기본값은 서버가 채운다** — 기본값의 SSOT 는 api-server 이고, get_schema 는 shape 만 주고 기본 *값* 은 주지 않는다. 의도적으로 override 하지 않는 sub-schema(특히 `llm`, `voice`)는 보내지 말고 OMIT 해 서버 기본값을 적용한다. override 할 때만 허용 값을 `list_llm_models` / `list_voice_models` 로 조회하고 shape 는 `get_schema(namespace="agent-schema", schema_type="agent-data-create" | "agent-data-update", detail="minimal")` 로 확인한다. 한국어 STT 는 `stt.languages:["ko"]` 를 사용하고 `ko-KR` 은 `voice.language` 에만 쓴다. `speech.responsiveness` 는 사용자 요구나 기존 agent 설정이 없으면 `1.0` 을 유지하며, "자연스러움" 명목으로 `0.8` / `0.9` 로 낮추지 않는다.

## GPT-Live runtime contract

When the user selects GPT-Live, use the following contract and read
`references/gpt-live-agent-data.json` before assembling a payload:

- Current vox.ai GPT-Live supports `type: "single_prompt"` (single-node) agents only. Do not send `data.runtime.type: "gpt_live"` with `type: "flow"`; the combination is rejected. Existing Flow agents remain on the `pipeline` runtime and are not implicitly converted or migrated.
- On create, treat an absent `data.runtime` and `{ "type": "pipeline" }` as the existing pipeline behavior. On PATCH/update, an omitted `runtime` preserves the current runtime, including `gpt_live`.
- Represent GPT-Live as `{ "type": "gpt_live", "model": "gpt-live-1", "voice": ... }` under `data.runtime`.
- Use `{ "type": "builtin", "name": "marin" }` as a native built-in voice example; it is not a claim that marin is the only supported name or the universal default. Use `{ "type": "custom", "id": "voice_..." }` only as an authorized OpenAI-native reference for a new GPT-Live custom voice; an arbitrary ID grants no access. Existing pipeline voice settings remain unchanged and are not migrated. Treat custom references as non-executable until organization authorization and provisioning are complete and the voice passes quality validation; do not promise provisioning, migration, exact voice identity, or production readiness.
- Keep `data.llm` as the selectable text LLM for shared chat and live business work in `single_prompt`. Do not invent `chatLlm` or map `data.llm` implicitly to Luna or another model. For a new GPT-Live create, require `data.llm.model`; select it from `list_llm_models`.
- Put GPT-Live voice configuration in `data.runtime.voice`, never in the pipeline `data.voice` or a TTS-only field. A GPT-Live request must not include legacy `stt`, `voice`, `parallelSTT`, `sttPreference`, `voicePreference`, or speech preferences that the current schema marks as legacy/incompatible; do not delete or copy the whole `data.speech` object by guesswork. Inherited pipeline defaults are removed after effective merge.
- A pipeline-to-live update retains the existing `data.llm` unless the user explicitly changes it. A live-to-pipeline update must explicitly provide pipeline `stt` and `voice`; never infer them from `runtime.voice`.
- Reads may return `data.stt` or `data.voice` as `null` or omit them for GPT-Live. Check `data.runtime` first and do not treat absent legacy fields as a migration failure.
- When editing an existing Flow, preserve its node-level LLM overrides (`flow.nodes[].data.llm`), but treat them as legacy Flow settings, not a GPT-Live feature. Do not add a GPT-Live runtime to a Flow or rewrite node LLMs to a GPT-Live model.

Keep this contract separate from API-generated OpenAPI artifacts. Use the API-owned schema
generation pipeline for schema changes; do not invent or hand-edit generated schema in this
skill.

## Workflow

신규 작성:
1. `voice-ai-playbook.md` 읽기 → 규칙 숙지
2. `voice-ai-prompt-template.md` 복사 → 요구사항 반영
3. 다턴 수집·검증·조건 판정·절차 전용 Tool이 있으면 `manual-authoring.md`로 Manual 분리 경계와 Trigger 중첩을 설계
4. 각 업무의 결과를 쓰기 Tool 성공 / 요청 기록(PostCall 포함) / 내용 확인으로 분류해 Side-effect 완료 표현을 확정
5. agent.data 스키마 참조하여 MCP로 생성
6. Manual이 연결됐으면 `manual-review.md` 기준으로 직접·linked Manual과 Tool을 재귀 검토

디버깅/개선:
1. `voice-ai-prompt-diagnosis.md` 읽기 → 실패 원인 진단
2. `voice-ai-prompt-revision.md` 읽기 → change_requests 기반 리팩터링

## Prompt Composition (Default + Opt-in 모듈)

템플릿(`voice-ai-prompt-template.md`)은 공통 뼈대 + 조건부 모듈로 구성한다.

| 모듈 | 상태 | 주입 위치 | 소스 |
|------|------|----------|------|
| 턴테이킹 (인터럽션 복구 포함) | **Default** — 항상 포함 | `# 턴테이킹` 섹션의 `[[turn_taking_rules]]` | `voice-ai-playbook.md` § 턴테이킹 전체 |
| 표현력 (감정/속도/웃음) | **Opt-in** — 요청 시만 | 새 `# 표현력` 섹션의 `[[expressivity_rules]]` (템플릿에 주석 처리된 상태로 존재) | `voice-emotive-speech.md` |

**Opt-in 트리거 (표현력)** — 유저가 "자연스럽게", "감정 발화", "웃게", "톤", "속도 조절", "감정 enabled" 같은 표현을 쓰면 해당 모듈을 포함한다. 미언급 시 템플릿의 `# 표현력` 주석 블록을 **그대로 삭제**한다.

**Opt-in 전제 조건** — 표현력 모듈은 voice가 **Cartesia** 제공자일 때만 의미가 있다. 다른 제공자(ElevenLabs 등)면 포함하지 말고 사용자에게 voice 변경을 제안(`vox-web-app` 가이드)한 뒤 결정.

**기존 프롬프트 수정** — 이미 배포된 프롬프트에 opt-in 모듈을 **추가/제거**하라는 요청은 `voice-ai-prompt-revision.md`의 change_requests 흐름으로 처리한다.

## Ownership Boundary

| Owns | Does Not Own |
|------|--------------|
| prompt authoring / diagnosis / revision | flow design (→ vox-flow) |
| Manual 분리 판단 / Trigger / content / linked 체인 / 재귀 품질 검토 | Manual과 별개인 tool CRUD (→ vox-tools) |
| agent.data schema | tool management (→ vox-tools) |
| voice AI playbook rules (공통) | pricing / billing |
| IVR/DTMF best practice (공통) | phone number management |
| agent type 판단 + flow handoff | web app UI guide (→ vox-web-app) |

## Related Resources

### MCP Tools (vox)
- `create_agent` — 에이전트 생성 (prompt + agent.data)
- `update_agent` — 에이전트 수정 (prompt/llm/stt/voice/postCall/tools 등 개별 필드)
- `get_agent` — 에이전트 상세 조회 (현재 prompt, 설정 확인)
- `list_agents` — 에이전트 목록
- `get_call` — 통화 로그 조회 (진단 시 transcript 확인)
- `list_llm_models` — `llm.model` 허용 값 조회 (override 시)
- `list_voice_models` — `voice.id` / `voice.provider` / `voice.model` 허용 값 조회 (override 시)
- `get_schema(namespace='agent-schema', schema_type='agent-data-create')` — `create_agent.data` shape 확인
- `get_schema(namespace='agent-schema', schema_type='agent-data-update')` — `update_agent.data` shape 확인
- `get_schema(namespace='flow-schema', schema_type='flow-data')` — flow agent graph shape 확인 (필요 시 `vox-flow`로 handoff)

공개 vox MCP surface에는 Manual 단건 CRUD Tool이 없다. Manual은 `agent.data.manuals` 맵(키=Manual UUID)으로 Agent에 속하므로 `get_agent`로 읽을 수 있고, 쓰기는 맵 전체 교체다(`agent-data-reference.md`). Manual 원격 작업은 Vox CLI가 설치된 환경에서 아래 명령을 사용하고, CLI가 없으면 Manual 초안·검토 결과를 산출하되 원격 적용이 미검증임을 명시한다.

### Vox CLI (Manual, when available)

설치 여부는 먼저 `command -v vox`(또는 `vox --version`)로 확인한다. 없으면 아래 명령을 시도하지 말고 초안·검토 결과만 낸다. `vox manual list --help`에 `--agent`가 없으면 폐기된 조직 단위 Manual을 쓰는 구버전 CLI이므로 업데이트한 뒤 사용한다.

- `vox manual list --agent <agent> --json` / `vox manual pull --agent <agent> --json`
- `vox manual init <agent> <local-name> --name "<이름>" --trigger "<trigger>" --tool-call-sound typing --json`
- `vox manual validate <agent> <local-name> --json`
- `vox manual push --agent <agent> --dry-run --json` → 승인된 적용 작업에서만 실제 push. push는 그 Agent의 Manual 맵 전체를 한 번에 교체한다.
- `vox agent version save --agent <agent> --json` → `vox agent promote --agent <agent> <version> --yes --json` — Manual은 Agent 버전에 동결되므로 push만으로는 프로덕션 통화가 바뀌지 않는다. 통화에 반영해야 하면 이 두 단계까지 안내한다.
- `node <이 스킬 디렉터리>/scripts/review-manual-tree.mjs --workspace <path> --agent <local-name> --json [--strict]` — 이 SKILL.md와 같은 디렉터리의 `scripts/`에 있다(플러그인 설치본에서는 `${CLAUDE_PLUGIN_ROOT}/skills/vox-agents/scripts/...`). exit 0 통과, 1 Critical, `--strict`에서 Warning이면 2.

### Docs (vox-docs search)
- `https://docs.tryvox.co/docs/build/overview` — 에이전트 빌드 개요
- `https://docs.tryvox.co/docs/build/single-prompt/prompt-writing` — 프롬프트 작성 가이드
- `https://docs.tryvox.co/docs/build/voice/voice-select` — 음성/LLM 선택
- `https://docs.tryvox.co/docs/build/knowledge/overview` — 지식 베이스
- `https://docs.tryvox.co/docs/build/variables/system-variables` — 시스템 변수
- `https://docs.tryvox.co/docs/build/variables/dynamic-variables` — 동적 변수

### App URLs
- `https://www.tryvox.co/dashboard/{organizationId}/agents` — 에이전트 목록
- `https://www.tryvox.co/agent/{agentId}` — 에이전트 상세/프롬프트 편집
