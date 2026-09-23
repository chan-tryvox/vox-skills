# Node Creation: script to flow-node markdown

콜센터/OB/CS 스크립트나 확정된 flowchart 를 `## name / ## content / ## transition conditions` 형식의 flow-node markdown 으로 변환한다.

> 규칙의 정본은 `vox-flow/SKILL.md`의 Core Operating Rules다. 이 문서의 서술이 그 규칙과 다르면 SKILL.md가 우선하고, 이 문서를 고친다.

이 문서의 출력은 **대시보드 입력/리뷰용 설계 markdown** 이다. MCP/API `flow` JSON 이 아니다. markdown 을 JSON 으로 변환할 때는 반드시 `get_schema(namespace="flow-schema", schema_type="flow-data", detail="minimal")` 를 호출하고, schema endpoint 결과의 field/enum/required 여부를 따른다.

## Read only what you need

- 기본 workflow 와 출력 형식: 이 파일만 읽는다.
- conversation 노드 문구/프롬프트 작성: [conversation-markdown.md](conversation-markdown.md)를 읽는다.
- extraction, condition, api, transfer, sendSms, tool, endCall 작성: [execution-node-markdown.md](execution-node-markdown.md)를 읽는다.
- 긴 예시가 필요하거나 출력 톤을 맞춰야 할 때만: [node-examples.md](node-examples.md)를 읽는다.
- JSON field, enum, required 여부가 필요할 때: [node-types.md](node-types.md)를 읽고 MCP schema endpoint 를 호출한다.

## Inputs

사용자가 다음 중 하나 이상을 제공한다.

- 원본 스크립트: 통화/OB/CS 스크립트의 일부 또는 전체.
- flowchart: `flow-sketch.md` 산출물.
- 필수 수집 항목: 이름, 전화번호, 주소, 의사 여부 등.
- 운영 제약: 재권유 횟수, 재확인 제한, 한 턴 한 질문 등.
- 런타임 변수: `{{customer_name}}` 같은 변수.

스크립트만 있으면 추론 가능한 것은 추론한다. 추론 불가능한 핵심 사항만 최대 2개까지 질문한다.

## Output

마크다운 코드 스니펫으로 직접 출력한다. 파일은 만들지 않는다.

```md
## name
[노드 이름]

## content
### 목적
1. [이 노드의 단일 목적]

[노드 타입별 세부 섹션]

## transition conditions
- [exit 상태]: 고객이 "[예시]"처럼 [조건]을 표현한 경우.
```

고정 섹션은 `name`, `content`, `transition conditions` 세 개뿐이다. 다른 최상위 섹션을 추가하지 않는다.

## Workflow

1. 스크립트나 flowchart 를 읽고 전체 목적, 분기점, 런타임 변수, 예외 상황을 파악한다.
2. 노드를 "전환조건 구조가 같은 최소 단위"로 쪼갠다.
3. 각 노드의 타입을 정한다. 타입 선택은 [node-types.md](node-types.md)의 selection guide 를 따른다.
4. conversation 노드는 [conversation-markdown.md](conversation-markdown.md)의 format 을 따른다.
5. 실행/전환/외부 시스템 노드는 [execution-node-markdown.md](execution-node-markdown.md)의 format 을 따른다.
6. 전환조건에는 다음 노드 이름이 아니라 exit 조건만 쓴다.
7. 출력 후 self-check 를 수행한다.

## Splitting rules

- 한 노드 = 한 목적 + 같은 전환조건 구조.
- 후속 질문의 거절이 exit 가 아니라 노드 내 재질문이면 같은 conversation 노드에 둔다.
- 후속 질문의 결과가 모두 exit 라면 분리할 수 있다.
- 사용자 답변을 정답값과 비교해야 하는 단계는 conversation 하나에 넣지 않는다. `conversation(수집) → extraction(사용자 답 추출) → api/condition(검증) → conversation/endCall(결과 안내)` 로 나눈다.
- 스크립트에 "본인", "동일", "같음" 같은 shortcut 이 있으면 별도 변수와 분기를 만든다. 예: 학습자 관계가 본인이면 계약자 생년월일을 학습자 생년월일로 재사용하고 다시 묻지 않는다.
- 응답 처리 항목이 7개 이상이면 노드가 너무 크므로 분리 검토한다.
- 원본 스크립트에 없는 분기를 임의 추가하지 않는다. 필요한 예외만 명확히 표시한다.

## Universal writing rules

- `content`에는 전환조건이 성립하지 않았을 때 노드 안에서 계속할 행동만 쓴다.
- 전환조건과 1:1 대응하는 응대 멘트는 `content`에 넣지 않는다. 전환 후 발화는 다음 노드에서 처리한다.
- 전환조건은 `라벨: 조건` 형식으로 쓴다.
- 전환조건은 고객 발화나 이미 추출된 변수 기준으로 쓴다. "안내 완료", "처리 완료" 같은 에이전트 행동만으로 exit 를 만들지 않는다.
- 정보 수집/동의 conversation 은 완료 조건이 충족되면 즉시 다음 실행 노드로 handoff 하도록 쓴다. 완료 후 "확인했습니다. 진행하겠습니다" 같은 filler 만 말하고 같은 노드에 남는 설계는 피한다.
- conversation 노드가 "일치합니다", "조회되었습니다", "검증되었습니다" 라고 확정하려면 그 전에 API 응답 변수 또는 preset dynamic variable 로 정답값이 실제 존재해야 한다. 정답값 출처가 없으면 정보 수집/확인 요청만 하고, 검증 표현은 쓰지 않는다.
- 사용자가 수집 정보 요약 확인을 요구하면, endCall 종료 멘트에 요약만 넣지 않는다. 요약을 들려주고 "맞으면 진행, 틀리면 수정"을 받는 confirmation conversation node 와 수정 path 를 설계한다.
- 최종 one-shot 복구 안내는 가능하면 endCall 종료 멘트에 넣는다. static conversation → endCall 은 반복 위험이 있어, 사용자의 추가 응답을 받아야 하는 단계가 아니라면 만들지 않는다.
- 업무 API 성공 후 SMS 실패 path 는 업무 결과를 보존하는 별도 종료 멘트로 설계한다. SMS 실패를 전체 예약/등록/접수 실패로 뒤집지 않는다.
- 예시 멘트는 큰따옴표로 감싼다.
- TTS가 읽을 수 없는 특수 장식 문자를 멘트 안에 넣지 않는다.
- `{{...}}` 런타임 변수는 원본 의미를 유지한다.
- 한 턴 발화는 3문장 이하를 기본으로 한다.
- nested list 는 한 단계까지만 쓴다.

## Self-check

- `## name / ## content / ## transition conditions` 3섹션만 있는가?
- 각 노드의 목적이 하나인가?
- conversation 노드에 static/generated 의도가 명시되어 있는가?
- generated conversation 에 첫 발화와 노드 안 재질문 방식이 명시되어 있는가?
- JSON/MCP 생성 직전 generated conversation 의 `data.prompt` 에 역할, 목표, 범위, 변수, 금지사항, 전환 판단이 채워져 있고 `[[...]]` 작성용 placeholder 가 남지 않았는가?
- 검증/비교 노드가 참조하는 정답값이 API `response_variables` 또는 preset dynamic variables 로 실제 생성되는가?
- 동일 인물/동일 대상 답변을 받았을 때 뒤 질문을 생략하거나 값을 재사용하는 분기가 있는가?
- extraction 노드는 추출 소스, 변수명, 타입, 기대 출력 예시가 있는가?
- condition 노드는 앞선 extraction/api 에서 만든 변수를 소비하는가?
- api 노드는 호출 목적, 대기 멘트 여부, 응답 변수 의도가 있는가?
- transfer/sendSms/tool 실패 path 가 필요한 경우 fallback edge 로 보낼 의도가 명시되어 있는가?
- 수집 정보 확인을 요구받은 flow 라면 확인/수정 conversation turn 이 실제로 있는가?
- JSON 으로 변환하려는 경우 schema endpoint 호출 + dry-run 단계가 표시되어 있는가? (식별자 필수 / dry-run / warnings 전달 등 세부 체크는 [flow-review.md](flow-review.md) 의 D · E · F 섹션 참조)

## JSON conversion gate

이 markdown 을 MCP/API `flow` 로 변환하기 전에는 아래 순서를 따른다.
핵심 루프는 **schema 조회 → fill → validate → save** 다.

1. `get_schema(namespace="flow-schema", schema_type="flow-data", detail="minimal")` 호출 — 한 응답에 envelope + 모든 node `data` shape ($defs) 가 함께 들어온다. per-node `get_schema(node-{type})` 는 일반 케이스에선 필요 없다 (narrow case 는 SKILL.md 의 [Schema Fetching](../SKILL.md#schema-fetching) 참조).
2. agent `data` 도 보낼 경우 `get_schema(namespace="agent-schema", schema_type="agent-data-create", detail="minimal")` 또는 `agent-data-update` 호출.
3. `node-creation.md`의 markdown 용어를 JSON field 로 직접 복사하지 않는다.
4. fallback/실패/else path 는 자동 생성된다고 가정하지 말고 `edges` 로 명시한다.
5. public `flow` 의 node `data` 에 legacy routing key 를 넣지 않는다: `transitions`, `logicalTransitions`, `globalNodeSettings`. edge 에도 `sourceHandle`, `targetHandle`, `type:"custom"` 을 넣지 않는다.
6. 기존 flow 수정이면 `function` / legacy `knowledge` node 를 그대로 public `flow` write 에 포함하지 않는다. 지원되는 node type 으로 마이그레이션하거나 legacy `flow_data` 경로를 쓴다.
7. `skip_user_response:true` 는 사용자 발화를 기다리지 않는 것이 명확한 edge 에만 쓴다. `begin` outgoing edge, static conversation → endCall/next edge, fallback edge 에는 습관적으로 붙이지 않는다.
8. extraction 완료나 static one-shot 안내 후 정상 진행 edge 를 fallback 으로 만들지 않는다. fallback 은 실패/else/default 복구 path 로 남기고, 정상 진행은 schema 가 허용하는 명시 condition 으로 표현한다.
9. 업무 성공 뒤 SMS 실패 fallback 이 있으면, fallback target 이 generic failure 가 아니라 "업무는 완료, 문자만 실패" 종료 멘트인지 확인한다.
10. flow graph 만 생성/검증하면 agent 최상위 `data` 는 생략한다. agent-level 설정을 실제로 바꿀 때만 schema 를 확인하고 필요한 subtree 만 보낸다.
11. `validate_flow(flow=..., level="all")` 로 dry-run. `errors === []` 일 때만 다음 단계로 간다. `advisories` 는 사용자에게 한 줄로 전달한다.
12. `create_agent(flow=...)` / `update_agent(flow=...)` 후 `get_agent` 로 round-trip 확인한다. 기존 flow 의 노드/엣지 몇 개만 바꿔도 public `flow` 는 전체 graph replacement 이므로, 변경하지 않는 nodes/edges 를 그대로 보존해서 다시 보낸다. `update_agent`에는 읽은 `head_revision`을 `expected_head_revision`으로 전달하고 Flow 전체 교체에는 `flow_revision`도 `expected_flow_revision`으로 전달한다. `REVISION_CONFLICT`는 자동 재시도하지 않는다.
