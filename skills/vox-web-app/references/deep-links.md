# 딥링크 치트시트

vox.ai 웹 앱의 쿼리 파라미터 기반 딥링크 전체 목록. LLM 에이전트가 사용자에게 "이 URL로 들어가면 다이얼로그가 바로 열려요"라고 안내할 때 쓴다.

기본 형식: `https://www.tryvox.co/dashboard/{organizationId}/{path}?{query}`

---

## 1. 자동 다이얼로그 오픈 (주요 사용)

| 목적 | Path | 쿼리 | 설명 |
|------|------|------|------|
| 번호 구매 | `/numbers` | `?new=1` | 번호 구매 다이얼로그 자동 오픈. 구매 게이트(verification/billing/limit) 미충족 시 해당 다이얼로그로 우회 |
| 보이스 클론 | `/voice` | `?clone=true` | 보이스 클론 대화 자동 오픈 |
| API 도구 생성 | `/tools` | `?create=api` | API 도구 생성 폼 자동 오픈 |
| MCP 도구 생성 | `/tools` | `?create=mcp` | MCP 도구 생성 폼 자동 오픈 |
| 알림 규칙 생성 | `/alerts` | `?create` | 알림 규칙 생성 폼 자동 오픈 |
| 단위 테스트 생성 | `/evals` | `?create=unit` | 단위 테스트 생성 페이지로 이동 |
| 시나리오 테스트 생성 | `/evals` | `?create=scenario` | 시나리오 테스트 생성 페이지로 이동 |

### 사용 예시

**"번호가 없어서 발신이 안 되는 사용자"에게:**
```
발신 번호가 아직 없네요. 아래 링크로 들어가시면 번호 구매 다이얼로그가 바로 열립니다:
https://www.tryvox.co/dashboard/{orgId}/numbers?new=1
```

**"도구를 추가하고 싶은 사용자"에게:**
```
API 도구는 여기서 만들 수 있어요:
https://www.tryvox.co/dashboard/{orgId}/tools?create=api
```

---

## 2. 사전 선택 / 필터 딥링크

| 파라미터 | 사용 페이지 | 형식 | 용도 |
|---------|------------|------|------|
| `callId` | `/history` | `?callId={uuid}` | 특정 통화의 상세 시트를 바로 오픈 |
| `numberId` | `/outbound/call/single` | `?numberId={id}` | 발신 번호를 사전 선택한 상태로 단건 발신 폼 열기 |
| `batchCampaignIds` | `/outbound/campaigns` | `?tab=history&batchCampaignIds={id1},{id2}` | 특정 캠페인들만 필터된 상태로 기록 페이지 열기 |
| `folderId` + `type` | `/agents/new` | `?folderId={id}&type=single_prompt` | 특정 폴더 내 특정 타입으로 에이전트 생성 |

### 사용 예시

**"통화 하나 결과를 보여주고 싶을 때":**
```
이 통화의 상세 내용(녹취, 전사 포함)은 여기서 볼 수 있어요:
https://www.tryvox.co/dashboard/{orgId}/history?callId={call_uuid}
```

**"단건 발신 테스트를 안내할 때":**
```
테스트 발신은 이 페이지에서 하세요. 발신 번호는 이미 선택되어 있습니다:
https://www.tryvox.co/dashboard/{orgId}/outbound/call/single?numberId={num_id}
```

---

## 3. 페이지 직접 이동 (쿼리 없음)

딥링크 쿼리가 없는 경우에도 특정 페이지로 바로 보낼 수 있다.

| 목적 | URL |
|------|-----|
| 대시보드 홈 | `/dashboard/{orgId}` |
| 에이전트 목록 | `/dashboard/{orgId}/agents` |
| 에이전트 상세 | `https://www.tryvox.co/agent/{agentUid}` (특정 버전은 `?version=N`) |
| 플로우 에디터 | `https://www.tryvox.co/flow/{agentUid}` — agent id를 그대로 쓴다, 별도 flow id 없음 |
| 보이스 라이브러리 | `/dashboard/{orgId}/voice` |
| 도구 목록 | `/dashboard/{orgId}/tools` |
| 지식 베이스 목록 | `/dashboard/{orgId}/knowledge` |
| 번호 관리 | `/dashboard/{orgId}/numbers` |
| 발신 첫 화면 | `/dashboard/{orgId}/outbound` — 전화 단건 발신으로 넘어간다 |
| 전화 단건 발신 | `/dashboard/{orgId}/outbound/call/single` |
| 문자 단건 발신 | `/dashboard/{orgId}/outbound/sms/single` |
| 대량 발신 | `/dashboard/{orgId}/outbound/campaigns` |
| 발신 기록 | `/dashboard/{orgId}/outbound/campaigns?tab=history` |
| 통화 기록 | `/dashboard/{orgId}/history` |
| 알림 | `/dashboard/{orgId}/alerts` |
| 테스트 | `/dashboard/{orgId}/evals` |
| 설정 허브 | `/dashboard/{orgId}/settings` |
| 워크스페이스 | `/dashboard/{orgId}/settings/workspace` |
| 결제 | `/dashboard/{orgId}/settings/billing` |
| 멤버 | `/dashboard/{orgId}/settings/member` |
| API 키 | `/dashboard/{orgId}/settings/api-key` |
| 웹훅 | `/dashboard/{orgId}/settings/webhook` |
| SMS | `/dashboard/{orgId}/settings/sms` |
| 프로필 | `/dashboard/{orgId}/settings/profile` |

---

## 4. 공유 링크 (비로그인 접근)

| 목적 | URL |
|------|-----|
| 통화 공유 | `/share/{callId}/call` (외부 공유, 인증 불필요) |

---

## 5. 조직 ID는 어떻게 알아내나

LLM 에이전트가 사용자의 `{orgId}`를 모르는 경우:

1. **`list_organizations` MCP 도구 호출** → 현재 사용자가 속한 조직 목록과 UUID 반환
2. 사용자가 특정 조직을 선택하면 해당 UUID를 `{orgId}`에 대입

예:
```
list_organizations 호출 → [{id: "00000000-0000-0000-0000-000000000000", name: "My Org"}]
딥링크: https://www.tryvox.co/dashboard/00000000-0000-0000-0000-000000000000/numbers?new=1
```

---

## 6. 게이트 조건 참고

일부 기능은 구매 게이트/인증 게이트가 있다:

| 기능 | 게이트 |
|------|--------|
| 번호 구매 | identity + organization 인증 + 결제 수단 + 한도 미달 |
| 발신 실행 | 등록된 보유 번호 필요 |
| 에이전트 배포 | 무제한 (draft는 언제나 사용 가능) |
| MCP/API 도구 생성 | 역할 제한 없음 (멤버 포함) |
| API 키 발급 | 오너·관리자 |
| 멤버 초대/결제 변경 | 오너·관리자 |

게이트에 걸리면 UI가 자동으로 해당 인증/결제 다이얼로그를 대신 연다. 사용자가 "왜 구매가 안 돼요?"라고 물으면 위 표의 게이트 조건을 먼저 짚어 보고, 원인은 UI가 표시하는 문구로 전달한다 — 내부 코드명(`blockedReason` 값)을 그대로 말하지 않는다.
