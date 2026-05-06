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

설계 markdown 의 표기는 LLM 가독용이다. 실제 JSON `flow_data` 로 옮길 때는 다음 매핑을 사용한다.

| Markdown 표기 | JSON `data` 필드 |
|---|---|
| `## name` | `data.name` (string) |
| `message mode: static` | `data.promptType: "static"` + `data.staticSentence: "<발화 멘트 그대로>"` |
| `message mode: generated` | `data.promptType: "dynamic"` + `data.firstMessage: "<진입 시 첫 발화>"` + `data.prompt: "<목적/노드 내 대화 처리/유의를 합쳐 작성한 LLM system prompt>"` |
| `first_message: "..."` | `data.firstMessage` |
| `transition conditions` 의 각 줄 | `data.transitions[].id` (자유 식별자) + `data.transitions[].condition: "<exit 조건 한국어 문장>"` |

**주의**: `promptType` 의 enum 은 v3 에서 `"static"` 또는 `"dynamic"` 이다. 설계 markdown 의 `generated` 라는 단어를 그대로 JSON 에 넣지 않는다.

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

## 사용자가 이미 답한 정보를 다시 묻지 않기 (rubric 5번 - 무한 반복 회피)

사용자가 문의 첫 발화에서 "예약 변경하려고요. 김하늘이고 990315입니다" 처럼 **여러 단계 정보를 proactive 하게 한 번에 제공**하는 경우가 잦다. flow 가 본인확인 → 의도 분기 → 새 일정 받기 같은 단계로 짜여 있더라도, **이미 받은 정보를 다음 단계에서 재질문하면 rubric 평가에서 불합격**한다.

대응 패턴:

- **conversation 노드의 prompt 에 명시**: "사용자 발화에 이미 [수집 대상] 이 포함되어 있으면 재질문하지 말고 바로 transition 으로 진행할 것" 같이 적는다.
- **transition condition 을 넓게**: "이름과 생년월일이 이미 발화에 있는 경우" 같이 proactive 입력도 잡도록 적는다.
- **API 결과 안내 노드와 다음 단계 입력 노드를 분리**: "주문을 확인했습니다 → (다음) 어떤 항목 변경하실까요" 를 한 노드에서 둘 다 하지 말고, API 안내는 api 의 staticSentence 에 합치고 다음 노드는 단일 목적 (변경 내용 받기) 으로 두기. 한 노드에서 안내 + 재질문 을 동시에 하면 사용자가 직전 turn 에서 이미 다음 정보를 줘도 LLM 이 "안내 단계" 로 인식해 재질문 루프에 빠짐.

## 입력 형식 검증의 max-retry escape (rubric 6번 - 무한 반복 회피)

extraction / 본인확인용 conversation 노드에서 형식 (예: 8자리 숫자, 영문/숫자 조합) 을 엄격히 검증하다 보면 사용자가 같은 입력을 N 번 반복해도 transition 이 안 빠지는 무한 루프가 자주 발생한다. 모든 형식 검증 노드는 **재질문 최대 횟수 + escape transition** 을 두라.

- prompt 안에 "재질문은 2회까지만. 3회째에는 'tr_format_invalid' 로 진행" 같이 명시한다.
- transition conditions 에 `format_invalid_max_retry` 분기를 두고 transferCall 또는 endCall (안내 멘트 포함) 로 보낸다.
- 형식 검증을 너무 strict 하게 두지 말 것 — 시나리오가 "8자리 증권번호" 라고 해도 사용자는 "PA12345678" 같이 prefix 를 붙여 말할 수 있다. extraction 노드가 prefix 를 허용하도록 prompt 에 적거나 conversation transition 을 넓게 두기.

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
