# Node markdown examples

긴 예시가 필요할 때만 읽는다. 기본 작성법은 [node-creation.md](node-creation.md), conversation 상세는 [conversation-markdown.md](conversation-markdown.md), 실행 노드 상세는 [execution-node-markdown.md](execution-node-markdown.md)를 따른다.

## Static conversation

```md
## name
수신거부 안내

## content
### 목적
1. 수신거부 방법을 안내하고 통화 계속 여부를 확인한다.

### 모드
- message mode: static

### 발화 멘트
- "본 전화는 무료 수신 거부 안내를 포함하고 있습니다. 수신을 원치 않으시면 아니오라고 말씀해주세요. 안내를 계속 들으시겠습니까?"

## transition conditions
- 계속 수신 확정: 고객이 "네", "들을게요"처럼 안내 계속을 수락한 경우.
- 수신거부 확정: 고객이 "아니오", "안 들을래요", "거부할게요"처럼 수신거부 의사를 표현한 경우.
```

## Extraction

```md
## name
전화번호 추출

## content
### 목적
1. 고객이 DTMF로 입력한 전화번호를 추출한다.

### 추출 변수
- input_number (string): 고객이 DTMF로 입력한 전화번호. 010으로 시작하는 총 11자리 숫자.
  ex) 01012341234

## transition conditions
(조건 없이 다음 노드로 진행. JSON 변환 시 현재 schema 의 skip/edge field 를 확인하고 edge 를 명시.)
```

## Condition

```md
## name
회원등급확인

## content
### 목적
1. 회원 등급에 따라 안내 분기를 결정한다.

### 분기 조건
- {{member_grade}} == "premium" → 프리미엄혜택안내
- {{member_grade}} == "basic" → 일반혜택안내
- default → 비회원안내

## transition conditions
(변수 기반 분기. JSON 변환 시 edge condition union 과 operator enum 을 schema endpoint 로 확인한다.)
```

## API

```md
## name
주문조회API

## content
### 목적
1. 주문번호로 외부 시스템에서 주문 상태를 조회한다.

### 호출 전 발화
- 발화 모드: static
- 대기 멘트: "잠시만 기다려주세요."

### API 설정
- method: schema endpoint enum 확인
- url: https://api.example.com/orders/{{order_number}}
- auth: Bearer token 사용

### 응답 변수
- order_status: $.data.status — 주문 상태
- delivery_date: $.data.delivery_date — 배송 예정일

## transition conditions
- 성공: API 응답 정상 수신 시 결과 안내 노드로 진행. ai-edge 또는 logic-edge — 응답 변수 (`{{order_status}}`) 채워짐 기준 판단.
- 실패: API 호출 실패 시 [API조회실패안내] conversation 노드로 진행. fallback edge 명시. **endCall 직행 금지** — 실패 시 사용자에게 양해 멘트 한 마디라도 전달.
```

### 짝꿍 노드: API 실패 안내 conversation

위 api 노드의 실패 분기를 받는 경량 conversation 노드 예시. 안내 1회 후 마무리로 자연스럽게 흘려보낸다.

```md
## name
API조회실패안내

## content
### 목적
1. 주문 조회 실패 사실을 짧게 안내하고 마무리 흐름으로 넘어간다.

### 모드
- message mode: static
- is_skip_user_response: true

### 발화 멘트
- "조회가 잠시 어렵네요. 확인 후 다시 안내드릴게요."

### 유의
1. 사과는 한 번만. 재시도 권유 금지.

## transition conditions
- 안내 후 자동 마무리: 발화 직후 다음 노드(endCall)로. (JSON 변환 시 현재 schema 의 skip/edge field 를 확인하고 edge 를 명시.)
```

## Transfer call

```md
## name
상담원연결

## content
### 목적
1. 고객 요청에 따라 담당 상담원에게 통화를 전환한다.

### 전환 전 발화
- 발화 모드: static
- 멘트: "담당 상담원에게 연결해 드리겠습니다. 잠시만 기다려주세요."

### 전환 설정
- transfer type: warm
- transfer target: 02-1234-5678
- displayed caller id: user

### warm transfer 설정
- transfer message mode: generated
- 멘트/프롬프트: "지금까지의 대화 내용을 요약하여 상담원에게 전달하세요."

## transition conditions
- 성공: 전환 성공 시 에이전트 퇴장.
- 실패: 전환 실패 시 fallback edge로 진행. (JSON 변환 시 edge 명시)
```

## Send SMS

```md
## name
예약확인SMS

## content
### 목적
1. 예약 확정 후 고객에게 확인 SMS를 발송한다.

### SMS 내용
- SMS mode: static
- 멘트: "예약이 확정되었습니다. 일시: {{appointment_date}}, 장소: {{location}}"

## transition conditions
- 성공: SMS 발송 성공 시 다음 노드로 진행.
- 실패: SMS 발송 실패 시 fallback edge로 진행. (JSON 변환 시 edge 명시)
```
