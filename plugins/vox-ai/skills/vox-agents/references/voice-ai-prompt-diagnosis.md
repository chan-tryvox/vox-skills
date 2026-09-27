# Voice AI system prompt 실패 진단 가이드

이 문서는 **이미 운영/테스트 중인 음성 에이전트가 실패했을 때**, system prompt의 문제를 빠르게 분류하고 “어떤 규칙/문구가 실패를 유발했는지”를 찾아내기 위한 가이드입니다.

목표:
- 실패를 **재현 가능한 실패 모드(failure mode)**로 묶는다.
- 각 실패 모드를 **프롬프트 드라이버(prompt driver)**(특정 섹션/문장/규칙)와 연결한다.
- “어떻게 고칠지”는 다음 문서에서 다룬다: `voice-ai-prompt-revision.md` (같은 references 폴더)

## 입력(필수)

1) **현재 system prompt** (Markdown 전체)

2) **실패 사례 3–10개** (가능하면 5개 이상)
- 한 사례는 “유저 발화 → 에이전트 응답(및 도구 호출/결과) → 기대 동작 → 실제 실패”가 포함되어야 합니다.
- 전체 통화 로그가 길면, 실패 지점 전후 3–6턴만 발췌해도 됩니다.

### (권장) MCP 연동: call_id로 로그/프롬프트 자동 수집

MCP가 연결되어 있고 `call_id`를 알고 있다면, 아래 순서로 **진단 입력을 자동으로 확보**할 수 있습니다.

1) 콜 로그/컨텍스트 가져오기

```text
get_call(call_id)
```

- `call.transcript`: 유저/에이전트 발화 + tool invocation/result가 포함된 transcript
- `call.dynamic_variables`: 런타임 변수(미주입/빈 값) 관련 이슈 확인에 유용
- `call.agent.agent_id`: 이 콜이 사용한 agent UUID (`call.agent`는 `{agent_id, agent_version}` 매핑. 있으면 다음 단계로)

2) 콜에 연결된 agent의 현재 프롬프트 가져오기

```text
get_agent(agent_id = call.agent.agent_id)
```

- vox 플랫폼이 실제로 읽는 system prompt는 보통 `agent.data.prompt.prompt`에 있다.
- 이후 리팩터링(update)에서 `firstLine`/`firstLineType` 같은 필드를 보존해야 하므로, 가능하면 `agent.data.prompt` 객체 전체를 같이 확보해 둔다.

3) 위 데이터로 failure mode를 더 “근본적으로” 분해한다

- 프롬프트에 적힌 “의도”가 아니라, transcript에서 **실제로 어떤 규칙이 깨졌는지**(턴테이킹/verbosity/tool grounding/에스컬레이션)를 근거로 진단한다.
- tool invocation/result가 있으면 “도구 실패를 어떻게 처리했는지”를 정확히 확인한다(추측/환각 vs 실패 인정/재시도/대안).
- `dynamic_variables`가 있으면 `{{...}}` 미주입/빈 값 노출 같은 문제를 transcript 근거로 확인한다.

예외/주의:
- `call.transcript`가 `null`이면(민감정보 저장 opt-out 등), 유저에게 실패 구간 전후 로그(3–6턴)만 붙여달라고 요청한다.
- `call.agent.agent_id`를 얻지 못하면(레거시/데이터 누락), 유저에게 `agent_id` 또는 system prompt를 요청한다.
  - 권한/접근 문제가 있으면, system prompt를 유저가 직접 붙여넣게 한다.

### 실패 사례 포맷(권장)

아래 형식 중 하나로 주면 됩니다(둘 다 OK).

**A) YAML**
```yaml
- trace_id: T1
  scenario: 예약 변경 문의
  user_utterance: "예약 날짜를 바꾸고 싶어요."
  agent_response: "네, 예약번호랑 성함 알려주세요. 그리고 언제로 바꾸실까요?"
  tools_called:
    - name: fetchReservation
      input: { ... }
      result: { ... }
  expected_behavior: "질문은 한 번에 하나만. 먼저 예약번호(또는 식별자)만 요청."
  observed_failure: "한 번에 2개 이상 질문해서 턴이 꼬임"
  severity: medium
```

**B) 텍스트(자유 형식)**
```
trace_id: T1
상황: 예약 변경
유저: ...
에이전트: ...
기대: ...
실패: ...
```

## 진단 워크플로우

1) **프롬프트 스캔**
- 섹션 구조(역할/목표/가드레일/도구/흐름/에러처리)가 있는지 확인
- 서로 충돌하는 지시(예: “짧게” vs “상세히”, “도구를 항상” vs “도구 최소화”)가 있는지 확인

2) **실패를 failure mode로 클러스터링**
- 표면 증상(긴 답변, 질문 여러 개, 도구 결과 추측 등)을 기준으로 묶는다.
- 같은 failure mode는 여러 trace_id를 묶어서 다룬다.

3) **prompt driver 매핑**
- 각 failure mode마다 “프롬프트의 어느 문구/규칙이 실패를 만들었는지”를 찾아 연결한다.
- 가능하면 **정확한 문장/섹션 제목을 인용**한다(줄번호는 불필요).

4) **원인 종류를 분리**
- `prompt_bug`: 규칙 누락/모호/충돌/우선순위 불명확
- `tool_contract_gap`: 도구 입력/출력 형식, 실패 케이스가 프롬프트에 정의되지 않음
- `data_gap`: 프롬프트에 필요한 도메인 정보(정책/가격/업무 범위)가 빠짐
- `product_gap`: 제품 레벨 설정/흐름 설계 문제(프롬프트만으로 해결 불가)

5) **진단 결과를 구조화 출력**
- 아래 “출력 포맷”을 사용한다.
- 부족한 정보가 있으면 **최대 3개**만 추가로 요청한다(예: 도구 계약, 금지사항, 성공 정의).

## 자주 나오는 failure mode 목록(음성 특화)

아래는 “음성”에서 빈번한 유형입니다. 진단 시 이 분류를 우선적으로 사용하세요.

### 1) Turn-taking 붕괴
- 증상: 질문을 여러 개 던짐, 사용자가 말할 틈이 없음, 무한 확인 루프
- 점검 포인트: voice-ai-playbook.md의 `필수 규칙`과 `턴테이킹` 섹션 기준으로 일치 여부 확인

### 2) 장문/과설명(Voice verbosity)
- 증상: 한 응답이 너무 길어 TTS/청취 부담, 핵심 질문이 뒤로 밀림
- 점검 포인트: “기본 1–2문장”, “길면 끊기”, “요약 1문장 + 다음 질문 1개”

### 3) 메타 발화
- 증상: “프롬프트/정책/도구/함수/시스템” 등 내부 용어를 유저에게 설명
- 점검 포인트: 메타 금지 규칙이 **가드레일/스타일/도구 섹션**에 반복/강조되어 있는지

### 4) 도구 실패 시 환각/추측
- 증상: 도구 결과를 확인하지 않고 말함, 실패를 인정하지 않음, 임의 값 생성
- 점검 포인트: “도구 실패 인정 → 1회 재시도 → 대안/에스컬레이션”, “추측 금지”가 명시되어 있는지

### 5) Side-effect 완료 과장
- 증상: 쓰기 Tool 없이 예약·변경·취소·결제·발송이 완료됐다고 말함, 조회 성공이나 PostCall 기록을 외부 처리 성공으로 오해함, 비최종·조건부·불명확한 결과를 완료로 바꿈
- 점검 포인트: transcript의 실제 Tool invocation/result와 Agent의 완료 발화를 대조한다. 쓰기 Tool 성공이 없으면 “요청으로 남김” 또는 “내용 확인”으로 제한됐는지 확인한다.

### 6) 정규화 실패(Spoken/Written)
- 증상: 이메일/번호/코드를 그대로 읽어서 오해, 확인 절차 부재, 도구 입력 포맷 불명확
- 점검 포인트: Spoken/Written 분리, 예시, “애매하면 확인 질문 1개”

### 7) 런타임 변수 주입 실패 노출
- 증상: `{{고객명}}`을 그대로 읽음(미주입으로 리터럴이 LLM 프롬프트에 전달됨), 또는 빈 문자열로 주입되어 어색한 문장 생성
- 점검 포인트: “값이 없으면 생략/대체”, “`{{...}}`가 그대로 보이면 미주입으로 간주” 규칙

### 8) 범위 이탈/스코프 드리프트
- 증상: 에이전트가 본 업무를 벗어나 설명/상담을 장황하게 함
- 점검 포인트: 목표/범위/금지사항이 구체적인지, 이탈 시 복귀 규칙(1문장 제한 + 원래 질문 1개)이 있는지

### 9) 에스컬레이션/전환 실패
- 증상: 사람 연결이 늦거나 너무 빠름, 전환 시 불필요한 발화로 레이스 발생
- 점검 포인트: 에스컬레이션 기준, “무음 액션”, 실패 시 대안 제시

## 출력 포맷(권장)

아래 YAML을 그대로 따라 작성합니다.

```yaml
diagnosis:
  context:
    call_id: "optional-call-id-if-used"
    agent_id: "optional-agent-id-if-used"
  prompt_summary: "프롬프트의 목적/흐름을 1–2문장으로 요약"
  failure_modes:
    - name: "turn_taking_multiple_questions"
      symptoms:
        - "한 턴에 질문 2개 이상"
      evidence_traces: ["T1", "T4"]
      prompt_drivers:
        - section: "# 턴테이킹"
          line_or_rule: "질문은 한 번에 하나만"
          why_it_matters: "이 규칙이 약하거나 예외가 많으면 턴이 꼬임"
      likely_root_causes:
        - "규칙 우선순위 불명확"
        - "선택지 규칙 누락"
      change_requests:
        - "질문 1개 원칙을 'must'로 승격"
        - "긴 요청은 1문장 요약 후 '무엇부터' 질문 1개로 고정"
  missing_info:
    - "도구 fetchReservation의 실패 케이스(예: not_found, timeout)와 권장 사용자 안내 문구"
```

주의:
- 진단 단계에서는 **개선된 system prompt 전체를 다시 쓰지 않습니다.**
- “무엇을 바꿔야 하는지(change_requests)”까지만 제시합니다.

핸드오프 팁(권장):
- 리팩터링 단계(`voice-ai-prompt-revision.md`)로 바로 넘길 생각이면, 각 `failure_modes[].change_requests`를 **누락하지 말고**, 필요하면 중복 제거해서 `diagnosis.change_requests`(flattened)로 한 번 더 모아주면 적용이 더 안정적입니다.
