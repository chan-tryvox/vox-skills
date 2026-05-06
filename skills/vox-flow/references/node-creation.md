# Node Creation: script to flow-node markdown

콜센터/OB/CS 스크립트나 확정된 flowchart 를 `## name / ## content / ## transition conditions` 형식의 flow-node markdown 으로 변환한다.

이 문서의 출력은 **대시보드 입력/리뷰용 설계 markdown** 이다. MCP/API `flow_data` JSON 이 아니다. markdown 을 JSON 으로 변환할 때는 반드시 `get_schema(namespace="flow-schema", schema_type="flow-data")` 를 호출하고, schema endpoint 결과의 field/enum/required 여부를 따른다.

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
- 응답 처리 항목이 7개 이상이면 노드가 너무 크므로 분리 검토한다.
- 원본 스크립트에 없는 분기를 임의 추가하지 않는다. 필요한 예외만 명확히 표시한다.

## Universal writing rules

- `content`에는 전환조건이 성립하지 않았을 때 노드 안에서 계속할 행동만 쓴다.
- 전환조건과 1:1 대응하는 응대 멘트는 `content`에 넣지 않는다. 전환 후 발화는 다음 노드에서 처리한다.
- 전환조건은 `라벨: 조건` 형식으로 쓴다.
- 전환조건은 고객 발화나 이미 추출된 변수 기준으로 쓴다. "안내 완료", "처리 완료" 같은 에이전트 행동만으로 exit 를 만들지 않는다.
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
- extraction 노드는 추출 소스, 변수명, 타입, 기대 출력 예시가 있는가?
- condition 노드는 앞선 extraction/api 에서 만든 변수를 소비하는가?
- api 노드는 호출 목적, 대기 멘트 여부, 응답 변수 의도가 있는가?
- transfer/sendSms/tool 실패 path 가 필요한 경우 fallback edge 로 보낼 의도가 명시되어 있는가?
- JSON 으로 변환하려는 경우 schema endpoint 호출 + dry-run 단계가 표시되어 있는가? (식별자 필수 / dry-run / warnings 전달 등 세부 체크는 [flow-review.md](flow-review.md) 의 D · E · F 섹션 참조)

## JSON conversion gate

이 markdown 을 MCP/API `flow_data` 로 변환하기 전에는 아래 순서를 따른다.

1. `get_schema(namespace="flow-schema", schema_type="flow-data")` 호출.
2. agent `data` 도 보낼 경우 `get_schema(namespace="agent-schema", schema_type="agent-data-create")` 또는 `agent-data-update` 호출.
3. `node-creation.md`의 markdown 용어를 JSON field 로 직접 복사하지 않는다.
4. fallback/실패/else path 는 자동 생성된다고 가정하지 말고 `edges` 로 명시한다.
5. `validate_flow_data(flow_data=...)` 로 dry-run. `errors === []` 일 때만 다음 단계로 간다. `warnings` 는 사용자에게 한 줄로 전달한다.
6. `create_agent` / `update_agent` 후 `get_agent` 로 round-trip 확인한다. MCP 응답에 자동 보정 안내가 있으면 함께 전달한다.
