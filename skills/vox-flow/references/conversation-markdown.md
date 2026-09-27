# Conversation node markdown

conversation 노드는 고객 발화를 듣고 LLM 또는 고정 멘트로 응답하면서 exit 조건을 판단하는 대화 단계다. 이 문서는 **설계 markdown** 작성법만 다룬다. JSON field 는 `flow-schema/flow-data` schema endpoint 결과를 따른다.

## Mode selection

| 상황 | 권장 mode |
|---|---|
| 정확한 문구를 그대로 말해야 함 | static |
| 고객 질문, 애매한 응답, 재확인에 대응해야 함 | generated |
| 단순 안내 후 사용자 응답 없이 넘어가야 함 | static + 사용자 응답 대기 없음 의도 명시 |

static 은 같은 고정 멘트를 반복할 수 있다. FAQ 대응이나 맥락 기반 응답이 필요하면 generated 로 둔다.

generated 는 첫 발화는 고정하고, 이후에는 노드 안에서만 처리할 시나리오를 제한한다. "무엇을 하지 말아야 하는지"를 함께 쓴다.

## Handoff-first rule

conversation 노드는 정보를 다 모았거나 고객 동의가 확인되면 **응답을 더 생성하지 말고 전환조건을 선택하는 것**이 목표다. "확인되었습니다. 진행하겠습니다" 같은 중간 멘트를 말하면서 같은 노드에 남아 있으면 뒤의 extraction/API/SMS node 가 실행되지 않는다.

generated conversation 의 `data.prompt` 에는 완료 시 아래 의미를 명시한다:

- 필수 정보가 이미 대화에 모두 있으면 다시 확인 멘트를 길게 하지 말고 즉시 완료 전환을 선택한다.
- API 조회, 예약 확정, SMS 발송, 통화 종료는 다음 노드가 담당하므로 이 노드에서 완료한 것처럼 말하지 않는다.
- API 응답 변수나 preset dynamic variable 로 정답값이 없는 상태에서 "시스템 정보와 일치한다", "본인 확인이 완료됐다"처럼 검증 완료를 말하지 않는다. conversation 은 답변을 수집하고, 검증은 extraction 이후 api/condition 에 맡긴다.
- 고객이 "본인입니다", "같은 사람입니다"처럼 앞 질문과 뒤 질문의 대상이 같다고 말하면 같은 정보를 다시 묻지 않는다. 이런 shortcut 은 extraction 변수와 condition 분기로 JSON 에 반영한다.
- 동의 확인 노드에서는 고객이 "네, 진행해 주세요"처럼 명확히 동의하면 즉시 동의 전환을 선택한다. 같은 질문을 반복하지 않는다.
- first_message 는 질문/안내 한 번이고, 전환조건 성립 후의 요약 멘트는 다음 node 또는 endCall message 에 둔다.
- 수집 정보 요약을 고객에게 확인받아야 하면 별도 confirmation conversation node 를 둔다. endCall 에서 요약만 읽고 종료하면 고객이 "맞다/틀리다"를 말할 기회가 없으므로 확인 turn 이 아니다.

정적 one-shot 안내만 하고 바로 종료해야 하는 경우에는 별도 static conversation node 를 만들기보다, 가능하면 **endCall node 의 종료 멘트**에 그 안내를 넣는다. static conversation → endCall 을 일반 transition 으로 연결하면 런타임이 사용자 응답을 기다리며 같은 고정 문구를 반복할 수 있다.

## Summary confirmation pattern

사용자가 "수집한 내용을 확인받아라", "요약 후 맞는지 물어봐라"라고 요구하면 아래 구조를 쓴다.

```md
## name
수집 정보 확인

## content
### 목적
1. 수집한 정보를 고객에게 짧게 요약하고 맞는지 확인한다.

### 모드
- message mode: generated
- first_message: "제가 확인한 내용은 {{summary_fields}}입니다. 맞으면 맞다고 말씀해 주시고, 수정이 필요하면 어떤 부분인지 알려주세요."

### 노드 내 대화 처리
1. 고객이 맞다고 하면 확인 완료 전환을 선택한다.
2. 고객이 수정 사항을 말하면 수정 필요 전환을 선택한다.
3. 애매하면 한 번만 "맞는지, 수정이 필요한지"를 다시 묻는다.

## transition conditions
- 확인 완료: 고객이 요약 내용이 맞다고 명확히 말한 경우.
- 수정 필요: 고객이 요약 내용 중 일부가 틀렸거나 수정해야 한다고 말한 경우.
```

확인 완료는 endCall 또는 다음 실행 노드로 보내고, 수정 필요는 정보 수집 conversation 으로 되돌린다.

## Static format

```md
## name
[노드 이름]

## content
### 목적
1. [단 하나의 목적]

### 모드
- message mode: static

### 발화 멘트
- "[고정 멘트]"

### 유의
1. [필요할 때만: 반복 제한, 수신거부 고지 등]

## transition conditions
- [exit 상태 1]: 고객이 "[예시]"처럼 [조건]을 표현한 경우.
- [exit 상태 2]: 고객이 "[예시]"처럼 [조건]을 표현한 경우.
```

## Generated format

```md
## name
[노드 이름]

## content
### 목적
1. [단 하나의 목적과 스코프 제한]

### 모드
- message mode: generated
- first_message: "[노드 진입 시 첫 발화]"

### 노드 내 대화 처리
1. 기본 질문: "[first_message와 동일하거나 짧은 재질문]"
2. [상황 A, 전환조건 불성립] 시: "[예시 멘트]"
3. [상황 B, 전환조건 불성립] 시: "[예시 멘트]"
4. 애매한 응답 시: "[확정 질문]"
5. 무응답 시: "[반복 또는 짧은 재질문]"

### 유의
1. [재권유 제한, 수집 순서, 금지할 응대]

## transition conditions
- [exit 상태 1]: 고객이 "[예시]"처럼 [조건]을 표현한 경우.
- [exit 상태 2]: 고객이 "[예시]"처럼 [조건]을 표현한 경우.
```

## Markdown → JSON 매핑

설계 markdown 의 표기는 LLM 가독용이다. 실제 JSON `flow` 로 옮길 때는 다음 매핑을 사용한다.

| Markdown 표기 | JSON `data` 필드 |
|---|---|
| `## name` | `data.name` (string) |
| `message mode: static` | `data.prompt_type: "static"` + `data.static_sentence: "<발화 멘트 그대로>"` |
| `message mode: generated` | `data.prompt_type: "dynamic"` + `data.first_message: "<진입 시 첫 발화>"` + `data.prompt: "<현재 노드의 역할/목표/처리/금지를 채운 node-scoped LLM system prompt>"` |
| `first_message: "..."` | `data.first_message` |
| `transition conditions` 의 각 줄 | 해당 source node 에서 나가는 `edges[]` 한 개 + `edge.condition:{type:"ai", prompt:"<exit 조건 한국어 문장>"}` |

**주의**: `prompt_type` 의 enum 은 v3 에서 `"static"` 또는 `"dynamic"` 이다. 설계 markdown 의 `generated` 라는 단어를 그대로 JSON 에 넣지 않는다.

## Generated prompt 채우기

`vox-agents` 스킬의 프롬프트 템플릿(voice-ai-prompt-template)은 single prompt agent 전체를 위한 템플릿이다. flow conversation 노드에서는 전체 템플릿을 복사하지 말고, 현재 노드 범위로 줄인 `data.prompt` 를 작성한다.

- 사용자가 "노드 프롬프트", "node prompt", "이 conversation node 의 prompt" 를 요청하면 산출물은 해당 노드의 `data.first_message` / `data.prompt` / 전환 판단만이다. 전체 agent system prompt, 도구 계약, 전역 대화 흐름을 고봉밥으로 출력하지 않는다.
- `data.first_message`: 노드 진입 시 실제로 말할 첫 문장/질문 하나.
- `data.prompt`: 첫 발화 이후에도 유지되는 비공개 지시문. 노드의 역할, 목표, 처리 규칙, 금지사항, 전환 판단을 적는다.
- static 노드는 `data.prompt` 를 만들지 않는다. 정확한 고정 문구는 `data.static_sentence` 에만 둔다.
- `data.prompt_type` 은 반드시 쓴다. `static_sentence` 만 두고 `prompt_type:"static"` 을 빼면 런타임은 dynamic 기본값으로 해석해 고정 문구를 무시할 수 있다.
- 일반 out-edge 는 반드시 의미 있는 `condition` 을 가진다. `null`, 빈 문자열, `"None"` 은 자동 진행 조건이 아니며 LLM이 선택할 의미가 없어 dead route 가 된다.
- static 노드가 안내 멘트 후 endCall 또는 다음 노드로 바로 넘어가야 해도 edge 에 `skip_user_response:true` 를 습관적으로 붙이지 않는다. 정말 사용자 응답을 기다리지 않는 edge 인지 schema 와 런타임 의도를 확인한다.
- static one-shot 안내 후 정상 진행 edge 를 fallback 으로 만들지 않는다. "안내 멘트 발화 후 다음 단계로 진행"처럼 명시적인 condition 을 두고, fallback 은 begin 의 시작 edge 와 실패/else/default 복구 path 에만 쓴다.
- 단, one-shot 안내 후 바로 종료만 하는 static node 는 반복 위험이 있으므로 endCall 종료 멘트로 흡수하는 편을 우선한다.
- 최종 `flow` JSON 에는 `[[...]]` 작성용 placeholder 를 남기지 않는다. `[[...]]` 는 작성 중 빈칸이고, `{{...}}` 만 런타임 변수다.

### Template 축소 매핑

| `voice-ai-prompt-template.md` 요소 | conversation node 에서 쓰는 방식 |
|---|---|
| `[[agent_name]]`, `[[primary_job]]` | 전체 에이전트 이름이 아니라 "예약 정보 수집 노드", "환불 사유 확인 노드" 같은 현재 노드 역할 |
| `[[what_you_can_say]]` / `[[what_you_cannot_say]]` | 이 노드 안에서 답할 수 있는 범위와 다음 노드/API가 처리할 일을 말하지 말라는 제한 |
| `[[available_variables]]` | 이 노드에서 읽을 수 있는 `{{...}}` 변수만 나열. 모르는 값은 추측하지 않게 지시 |
| `[[goal_1]]...` | 전체 통화 목표가 아니라 이 노드의 완료 조건 1-3개 |
| `[[tools_list]]`, `[[tool_rules]]` | 보통 "없음". API 호출, SMS 발송, 통화 종료는 별도 node가 담당하므로 conversation prompt 에서 실행한 척하지 않음 |
| `# 대화 흐름` | 전체 graph가 아니라 "노드 내 대화 처리"만 작성 |

### Node prompt mini-template

generated conversation 의 `data.prompt` 는 아래 구조를 현재 노드 정보로 채운다. 짧은 노드는 각 섹션을 1-2줄로 줄여도 된다.

```md
# 역할
당신은 vox.ai flow의 "[노드 이름]" 단계만 담당합니다. 이 노드의 업무는 [단 하나의 업무]입니다.

# 노드 목표
1. [수집/확정할 정보]
2. [완료 조건]
3. 완료 조건이 이미 충족되면 추가 발화 없이 해당 전환조건을 선택합니다.

# 사용 가능한 정보
- 사용할 수 있는 변수: {{variable_name}}, {{another_variable}}
- 변수가 비어 있거나 `{{...}}` 그대로 보이면 값이 없다고 보고 자연스럽게 확인합니다.
- 사용자 발화에 이미 필요한 정보가 있으면 다시 묻지 않습니다.

# 말투와 턴테이킹
- 한국어 존댓말로 짧게 말합니다.
- 한 번에 질문은 하나만 합니다.
- 애매한 답변에는 가장 중요한 확인 질문 하나만 합니다.

# 노드 내 처리
1. 기본 질문: "[first_message와 같은 의도의 질문]"
2. [상황 A]이면 [짧은 응대/재질문].
3. [상황 B]이면 [짧은 응대/재질문].
4. 재질문은 최대 [N]회까지만 합니다.

# 하지 말 것
- 이 노드 밖의 API 호출, 확정, SMS 발송, 통화 종료를 완료한 것처럼 말하지 않습니다.
- 다음 노드 이름, transition, tool, prompt 같은 내부 용어를 말하지 않습니다.
- 전환조건 성립 후 다음 노드에서 말할 안내를 여기서 먼저 말하지 않습니다.
- 완료 조건이 충족된 뒤 "확인되었습니다. 진행하겠습니다"만 말하고 같은 노드에 머물지 않습니다.

# 전환 판단
- [exit 라벨]: [고객 발화나 변수 기준으로 성립 조건]
- [fallback/escape 라벨]: [반복 실패, 취소, 불명확 등 복구 조건]
```

### 작성 체크

- `first_message` 는 첫 발화만, `prompt` 는 노드 운영 규칙만 담았는가?
- prompt 안에 `[[...]]` placeholder 가 남아 있지 않은가?
- 전체 agent prompt 를 통째로 붙여 넣지 않았는가?
- API/SMS/tool/endCall 이 할 일을 conversation 노드가 완료한 것처럼 말하지 않는가?
- transition condition 과 prompt 의 전환 판단이 같은 의미를 가리키는가?
- 요약 확인 요구가 있으면 확인/수정 edge 를 가진 confirmation node 를 만들었는가?

## Content boundary

`content`에는 현재 노드 안에서 계속할 행동만 쓴다.

넣는다:
- FAQ 응대
- 재확인 질문
- 애매한 응답 처리
- 노드 안 재권유/재시도
- 무응답 처리

넣지 않는다:
- 전환조건 성립 후의 응대 멘트
- "다음 노드로 이동" 같은 시스템 동작 설명
- 다음 노드에서 말해야 할 안내

## Transition conditions

- 다음 노드 이름을 쓰지 않는다. exit 조건만 쓴다.
- 예시 발화는 2-4개면 충분하다.
- 전환조건은 한 줄로 쓴다. 하위 불릿을 만들지 않는다.
- 고객 발화 기반 조건과 변수 기반 조건을 섞지 않는다. 변수 기반 분기는 condition 노드로 보낸다.
- "동의/거절" 같은 자연어 판단은 보통 conversation out-edge 조건이다.

## Prompt guardrails

generated 노드에는 아래를 짧게 포함한다.

- 이 노드의 목표.
- 이 노드에서 수집하거나 확정할 것.
- 이 노드에서 하지 말아야 할 것.
- 고객이 질문했을 때 답할 수 있는 범위.
- 재질문/재권유 최대 횟수.

## Quick example

```md
## name
결제방법 안내

## content
### 목적
1. 고객이 전액 결제와 예약금 결제 중 하나를 선택하도록 돕는다. 이 단계에서는 결제 수단 입력을 받지 않는다.

### 모드
- message mode: generated
- first_message: "결제방법 안내 도와드리겠습니다. 전액 결제와 예약금 결제 중 어떤 방식으로 안내 도와드릴까요?"

### 노드 내 대화 처리
1. 선택을 못 하는 경우: "방송 중 안내된 혜택은 전액 결제에서만 제공되고 있습니다. 전액 결제로 안내 도와드릴까요?"
2. 전액이 부담스럽다고 하면: "부담되실 수 있어요. 그러면 예약금 결제로 안내 도와드릴까요?"
3. 애매한 응답 시: "정확히 확인드리려고요. 전액 결제와 예약금 결제 중 어느 쪽으로 안내 도와드릴까요?"
4. 무응답 시: "결제 방식 선택이 필요합니다. 전액 결제와 예약금 결제 중 어느 쪽으로 안내 도와드릴까요?"

### 유의
1. 전액결제 권유는 1회, 예약금 전환 권유는 1회까지만 한다.

## transition conditions
- 전액결제 선택 확정: 고객이 "전액으로 할게요", "전액 결제요"처럼 전액결제를 명확히 선택한 경우.
- 예약금결제 선택 확정: 고객이 "예약금으로 할게요", "예약금 결제요"처럼 예약금결제를 명확히 선택한 경우.
```
