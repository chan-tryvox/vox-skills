# 매뉴얼 데이터 레퍼런스 (manual-data-reference)

매뉴얼 값의 필드와 연결·참조 규칙을 정리한다. 작성 doctrine은 `manual-authoring.md` 참조.

표기 규칙: agent.data(MCP `create_agent`/`update_agent`)는 camelCase(`builtInTools`, `toolIds`, `manuals`)이고, Manual 값(`agent.data.manuals`의 각 값과 CLI `manual.json`)은 snake_case(`built_in_tools`, `tool_call_sound`)다. 표면이 다르기 때문이며, 한쪽 표기를 다른 쪽에 섞어 쓰지 않는다.

## 1. 엔티티 필드

Manual은 Agent가 소유한다. `agent.data.manuals`는 Manual UUID를 키로 하는 맵이고, 값에는 id 필드가 없다. 다른 Agent와 Manual을 공유하지 않으며, 같은 절차가 두 Agent에 필요하면 각 Agent에 따로 둔다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string (최대 128자) | 매뉴얼 이름. Agent 본문의 라우팅 지시가 이 이름으로 지칭한다. 공백만 있는 이름은 저장할 수 없다. |
| `trigger` | string | 이 Manual을 시작해야 하는 조건을 설명하는 한 문장. 비워 두면 다른 Manual의 `@manual:` 참조로만 시작되는 후속 Manual이 된다. |
| `content` | string (markdown, 8096자·64KiB 이하) | Manual이 시작된 뒤 따를 규칙과 진행 절차. 도구와 후속 Manual은 여기서 `@tool:`·`@manual:`로 참조한다. |
| `built_in_tools` | object[] | 이 매뉴얼이 소유하는 빌트인 도구 설정(에이전트 builtInTools와 같은 shape: toolType/name/description/responseMode/speakDuringExecution 등). `name`은 함수 식별자 형식이고 Manual 안에서 중복될 수 없다. |
| `config.tool_call_sound` | string | Manual 시작 시 재생되는 대기음 프리셋. 별도 요구가 없으면 `typing`을 사용하고, 무음이 명시적으로 필요한 경우에만 `none`을 사용한다. |

커스텀 도구 목록 필드와 후속 Manual 목록 필드는 없다. 둘 다 content의 참조로 결정된다.

로컬 Agent-as-Code(Vox CLI)에서는 Manual 하나가 `agents/<agent>/manuals/<local-name>/manual.json` 파일 하나이고, UUID는 `.vox/project.json`의 `bindings[<agent>].manuals[<local-name>].manual_id`에만 있다. `agent.json`에는 `manuals`·`manualIds`·`manualRefs`를 넣지 않는다.

**템플릿 매뉴얼**: 플랫폼이 검증된 템플릿(이메일 수집·주소 검증·영업시간 확인)을 제공한다. 같은 업무는 템플릿에서 복사해 시작한다.

**호출음 기본값**: Manual 시작 지연 동안 통화가 멈춘 것처럼 느껴지지 않도록 새 Manual은 기본적으로 `typing`을 사용한다.

## 2. 연결 및 참조 규칙

- Agent가 직접 시작할 수 있는 Manual은 `trigger`를 채운 진입 Manual로 둔다.
- 특정 Manual 이후에만 사용하는 후속 Manual은 `trigger`를 비우고 부모 content에서 `@manual:<UUID>`로 참조한다. 대상은 같은 Agent의 `manuals` 맵에 있어야 하며, 없으면 `MANUAL_NOT_FOUND`로 배포가 막힌다.
- Manual 전용 빌트인 도구는 해당 Manual의 `built_in_tools`에 두고 content에서 `@tool:<빌트인 name>`으로 참조한다. `built_in_tools`에 없는 이름을 참조하면 `BUILT_IN_TOOL_NOT_DEFINED`다.
- 조직 커스텀 도구는 content에서 `@tool:<커스텀 도구 UUID>`로 참조한다. 배포 시 같은 조직에 그 도구가 없으면 `MANUAL_TOOL_UNAVAILABLE`이다.
- CLI 로컬 파일에서는 `@manual:<local-name>`·`@tool:<local-tool-name>`으로 쓰고, `vox manual push`가 UUID로 바꿔 보낸다.
- `M1`, `M2` 같은 임시 식별자는 직접 작성하지 않는다. Agent 본문에서는 Manual 이름을 사용하고, Manual 간 연결에는 UUID를 사용한다.

## 3. 예시 구조 (annotated skeleton)

새 매뉴얼은 이 스켈레톤에서 시작한다. 주석(→)은 작성 시 삭제.

```yaml
name: 반송 우편 재발송            # → 본문 라우팅이 이 이름으로 지칭
trigger: >
  고객이 우편물이 반송되었다고 말할 때, 재발송을 요청할 때,
  또는 등록된 배송 주소를 확인하거나 바꾸고 싶다고 할 때
  # → 진입점 3종: 업무 도달 / 고객 선발화 / 기존 값 확인·정정
built_in_tools: []               # → 절차 전용 도구는 여기 귀속 + content에서 @tool: 참조
config:
  tool_call_sound: typing
# → content의 @manual:<주소 검증 매뉴얼 UUID> 대상은 같은 Agent 맵에 두고 trigger를 비운다
```

```markdown
## 규칙

### 원칙
- 항상 적용되는 불변 규칙만 여기에. 발화 형식, 판별 기준, 금지 사항.
- 내부 용어(매뉴얼, 복창 등)를 고객 발화에 쓰지 않는다.

### 발화 규칙
- 발화용(한국어 숫자, 끊어읽기)과 기록용(아라비아 숫자) 표기를 구분하고 예시를 각각 1개 이상 준다.

## 진행 절차

### 시작
1. 고객이 반송 사실만 말했으면 '반송 확인'으로 이동한다.
2. 재발송 주소를 이미 불러주는 중이면 끝까지 들은 뒤 '주소 재확인'으로 이동한다.
   → trigger의 진입점마다 들어갈 상태를 매핑
3. 등록된 주소 확인만 원하면 '주소 재확인'으로 이동한다.

### 반송 확인
1. ...상태별 절차. 예시 발화는 따옴표로 완성문 제공: "등록된 주소로 다시 보내드릴까요?"
2. 고객이 동의하면 '완료'로, 주소 변경을 원하면 '주소 재확인'으로 이동한다.
   → 가능한 모든 반응에 전이 명시. 갈 곳 없는 반응을 남기지 않는다

### 주소 재확인
1. 새 주소가 필요하면 @manual:<주소 검증 매뉴얼 UUID> 절차로 주소를 확정한다.
   → linked 체인 진입. 부모 content의 이 지시가 곧 진입 조건이다(후속 Manual의 trigger는 비움)
2. 주소가 확정되면 '완료'로 이동한다.

### 수집할 수 없는 경우
1. 고객이 주소 확인을 원하지 않으면 강요하지 않고 가능한 대안을 안내한 뒤 '완료'로 이동한다.
   → 폴백 상태. 강요 금지 + 값 없이 복귀

### 완료
1. 고객이 최종 동의한 주소를 기록하고 재발송 접수를 안내한다.
2. 매뉴얼 시작 전에 진행하던 고객의 원래 요청을 이어서 처리한다.
   → 복귀 계약. 이 줄이 없으면 dead-end
```

진행 절차는 `address_status=confirmed` 같은 내부 코드 할당 대신 위 예시처럼 `고객이 동의하면`, `주소 변경을 원하면` 등의 상황형 조건으로 작성한다. postCall 필드명과 enum은 postCall 정의에 두고, 매뉴얼에는 대화에서 확인할 조건과 다음 행동만 적는다. 도구가 정확한 입력 키를 요구하는 경우에만 도구 호출 단계에서 해당 키를 사용한다.

본문 프롬프트 쪽 배선 (에이전트 프롬프트의 해당 업무 분기에):

```markdown
고객이 우편물 반송이나 재발송을 언급하면 고객에게 응답하거나 주소를 묻기 전에
'반송 우편 재발송' 매뉴얼을 먼저 시작합니다. 매뉴얼을 시작하기 전에는
주소를 직접 묻지 않습니다.
```
