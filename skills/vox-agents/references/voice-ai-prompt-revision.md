# Voice AI system prompt 리팩터링 가이드

이 문서는 `voice-ai-prompt-diagnosis.md`(같은 references 폴더)의 **진단 결과**(failure modes + change_requests)를 바탕으로, **개선된 한국어 음성 system prompt**를 “수술적으로” 만들어내는 가이드입니다.

목표:
- 프롬프트를 처음부터 다시 설계하지 않는다.
- 실패를 만든 원인을 제거하는 **최소 변경**으로 신뢰도를 올린다.
- 결과물은 바로 붙여넣어 사용할 수 있는 **완성형 system prompt 전체**를 출력한다.

## 입력(필수)

1) **현재 system prompt** (Markdown 전체)
2) 아래 중 하나:
   - (권장) `diagnosis.failure_modes[].change_requests`(또는 `diagnosis.change_requests`)가 포함된 진단 결과, 또는
   - 유저가 요약한 “실패 이유/고치고 싶은 점” 목록

### (권장) MCP 연동: call_id → get_call/get_agent → update_agent

MCP가 연결되어 있고 `call_id`를 알고 있다면, 아래 순서로 “리팩터링 → 실제 반영”까지 일관되게 처리할 수 있습니다.

1) 콜 로그/컨텍스트 가져오기

```text
get_call(call_id)
```

2) 콜에 연결된 agent 프롬프트 가져오기

```text
get_agent(agent_id = call.agent_id)
```

- vox 플랫폼이 실제로 읽는 system prompt는 보통 `agent.data.prompt.prompt`에 있다.
- `firstLine`/`firstLineType` 등 `agent.data.prompt`의 다른 필드는 업데이트 시 소실되기 쉬우니, **prompt 객체 전체를 보존**할 수 있게 먼저 읽어둔다.
- 필요하면 `get_call` transcript 근거로 `voice-ai-prompt-diagnosis.md` 방식으로 원인을 다시 정리하고(특히 tool 호출/실패 처리/turn-taking), 그 결과를 이번 리팩터링 입력으로 사용한다.

3) 개선된 system prompt 생성

- 이 문서의 리팩터링 원칙/패치 패턴을 적용해서 `patch_notes` + `revised_system_prompt`를 만든다.

4) 유저 확인 후 실제 반영(업데이트)

```text
current_prompt = agent.data.prompt
update_agent(
  agent_id = call.agent_id,
  expected_head_revision = agent.head_revision,
  data = {"prompt": {**current_prompt, "prompt": revised_system_prompt}}
)
```

Use the `head_revision` observed in the preceding `get_agent` response. If the write returns `REVISION_CONFLICT`, do not fetch and retry automatically; ask the user to review the newer state before composing another update.

권장:
- 업데이트는 **유저가 “적용해줘/업데이트해줘”라고 명시했을 때만** 실행한다.
- `update_agent`의 프롬프트 변경은 top-level `prompt` 인자가 아니라 `data.prompt` 객체로 보낸다. `data.prompt`는 sub-schema 전체 교체(replace)이므로 `firstLine`/`firstLineType` 등 필요한 필드를 포함한 최종 객체를 전달한다.
- LLM/STT/postCall 같은 설정 변경은 `agent-data-reference.md`를 따른다.
- 적용 후 `get_agent`로 다시 읽어서 프롬프트가 바뀌었는지 확인한다.

도구가 없으면, **개선된 system prompt 전체를 출력**하고 유저가 복사/적용하도록 합니다.

## 리팩터링 원칙(음성 특화)

- voice-ai-playbook.md의 `필수 규칙`과 관련 섹션(`도구 & 액션`, `확인 › 가드레일`, `문자 정규화`)을 기준으로 수정한다.
- 아래 워크플로우는 중복을 피하고, 리팩터링 절차/우선순위만 다룬다.

## 리팩터링 워크플로우

1) **제약조건을 먼저 재확인(짧게)**
- 어떤 업무 에이전트인지, 성공 정의/에스컬레이션 기준, 도구 목록, 금지사항
- 누락이 크면 `[[...]]` placeholder를 두고 진행(대신 “미확정”을 짧게 표기)

2) **진단 결과를 프롬프트 수정 계획으로 변환**
- change_requests를 다음 4축으로 정리합니다:
  - `verbosity` (짧게/끊기/요약)
  - `turn_taking` (질문 1개/선택지)
  - `tool_grounding` (도구 호출 조건/실패 처리/추측 금지)
  - `scope_and_guardrails` (범위/금지/에스컬레이션/무음 액션)

3) **구조는 유지, 중복은 제거**
- 섹션은 가능하면 유지합니다(역할/목표/가드레일/도구/흐름).
- 동일한 금지 규칙이 여러 번 반복되어 길어졌다면, “가드레일”로 모으고 다른 섹션에서는 짧게 참조합니다.

4) **충돌 해결(우선순위 명시)**
- 예: “친절하게 자세히” vs “짧게”가 충돌하면, 음성에서는 **짧게**가 우선.
- 예: “도구 최소화” vs “정확성”이 충돌하면, 외부 사실은 **도구 우선**이 우선.

5) **결과를 아래 출력 포맷으로 제공**

## 출력 포맷(필수)

아래 2가지를 반드시 제공합니다.

1) `patch_notes`: 무엇을 왜 바꿨는지(최대 8개 불릿)
2) `revised_system_prompt`: 개선된 system prompt 전체(Markdown)

```yaml
patch_notes:
  - "turn-taking: 질문 1개 원칙을 must로 승격하고 예외 문구 제거"
  - "verbosity: 기본 1–2문장 + 길면 끊기 규칙을 스타일 섹션에 고정"
  - "tools: 실패 시 재시도/대안/에스컬레이션 순서를 에러 처리에 명시"
revised_system_prompt: |
  # 역할
  ...
```

## 리팩터링 시 자주 쓰는 패치 패턴

### Pattern A) 턴테이킹 고정(음성 최우선)
- “질문은 하나”를 스타일/턴테이킹/흐름에 중복되게 두지 말고, **턴테이킹 섹션에 강하게 1회** 박아두고 다른 곳은 참조만 둡니다.

### Pattern B) 장문 방지(verbosity clamp)
- “기본 1–2문장” + “길면 끊기” + “요약 1문장 + 다음 질문 1개”를 한 덩어리로 고정합니다.

### Pattern C) 도구 기반 사실 고정(tool grounding)
- “도구 호출 전에 말하지 말 것”을 가드레일에 넣고,
- 도구 실패 시 문구를 1–2개 예시로 고정합니다(모호한 사과 대신 ‘대안’을 포함).

### Pattern D) Side-effect 완료 표현 축소
- transcript의 Tool invocation/result를 기준으로 완료 표현의 근거를 분류합니다.
- 해당 외부 상태를 실제로 바꾸는 쓰기 Tool 성공이 없으면 “완료/변경/취소/발송”을 제거합니다.
- PostCall만 있으면 “요청으로 남기겠습니다”, 후속 요청이 없으면 “말씀하신 내용을 확인했습니다”로 바꿉니다.
- 조회 Tool과 비최종·조건부·불명확한 결과를 완료로 확대하지 않습니다.

### Pattern E) 변수 주입 안전장치
- `{{...}}`는 프롬프트에 남겨도 되지만,
  - `{{...}}`가 그대로 보이거나(주입 실패) 빈 문자열이면 생략/대체
  - 과도한 개인화 금지(보통 1회)

## 완료 후 체크(권장)

- 6개 시나리오로 빠르게 점검:
  1) 정상 흐름(대표 흐름)
  2) 도구 실패(타임아웃/NotFound 가정)
  3) 불명확한 답변(확인 질문 1개로 수렴)
  4) 여러 요청 동시(1문장 요약 + “무엇부터”)
  5) 범위 이탈/부적절 요청(1문장 제한 + 복귀)
  6) 쓰기 Tool 없이 완료를 요구함(PostCall-only 포함)
