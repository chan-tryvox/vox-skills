---
name: vox-web-app
description: "Guide for using the vox.ai web app (tryvox.co/dashboard) — navigation, deep links, and UI-only flows such as voice clone, CSV upload, call playback, and billing. Also serves as the UI reference other vox skills consult when they need to explain how to do something in the web app. Trigger on '웹 앱에서 어떻게', '대시보드 사용법 알려줘', '번호 구매 페이지', '통화 기록 보기', '녹취 들어보기', '대량 발신 설정', '에이전트 설정 어떻게 해', '화면 보여줘', 'UI에서 어떻게 해', or any question about navigating or operating the vox.ai web app. If the ask can be done with a vox MCP tool (prompt edit, tool attach, flow change), use the owning domain skill instead."
license: MIT
compatibility: "Navigation guidance works without MCP. Data lookups (list_agents, list_calls) need the vox MCP server (https://mcp.tryvox.co/mcp, OAuth login on first tool call)."
---

# vox.ai 웹 앱 가이드

vox.ai 웹 앱(`https://www.tryvox.co/dashboard/{organizationId}/...`)에서 사용자가 수행하는 모든 UI 조작 — 에이전트 구축, 번호 관리, 발신 실행, 통화 데이터 분석, 조직 설정 — 을 안내하는 스킬. 다른 vox 스킬(vox-agents, vox-flow, vox-tools, vox-onboarding)이 UI 경로를 설명해야 할 때 이 스킬을 호출해 참조한다.

## 언제 이 스킬을 사용하나

- "대시보드에서 X를 어떻게 해요?" 같은 UI 조작 질문
- 다른 스킬이 MCP 도구 대신 "UI에서 해야 하는 작업"을 안내해야 할 때 (예: 녹취 재생, CSV 업로드, 보이스 클론, 결제, 멤버 초대)
- 특정 페이지/다이얼로그로 바로 이동시키는 **딥링크**가 필요할 때

## 레퍼런스 역할 분담

영역별로 references에 분할되어 있다. 질문이 어느 영역인지 정해지면 그 파일 **하나만** 읽는다 — 딥링크만 필요하면 `deep-links.md` 하나로 끝난다. 다섯 파일을 모두 읽을 이유는 거의 없다.

| 파일 | 주제 | 언제 읽나 |
|------|------|-----------|
| `references/build.md` | 구축: agents, voice, tools, knowledge | 에이전트/보이스/도구/지식베이스 UI 조작 안내 시 |
| `references/deploy.md` | 배포: numbers, single/batch outbound | 번호 구매, 단건/대량 발신, SIP 연동 안내 시 |
| `references/monitor.md` | 모니터링: analytics, history, alerts, evals | 통화 이력 조회, 녹취 재생, 차트/필터, 알림 규칙, 테스트(evals) 안내 시 |
| `references/settings.md` | 설정: workspace, billing, member, api-key, webhook, sms, profile | 조직/결제/멤버/API 키/웹훅 등 운영 안내 시 |
| `references/deep-links.md` | 딥링크 치트시트 | 쿼리 파라미터로 다이얼로그/폼을 바로 열어야 할 때 |

## 사이드바 네비게이션 (한국어 라벨)

| 그룹 | 메뉴 | URL |
|------|------|-----|
| 구축 | 에이전트 | `/dashboard/{orgId}/agents` |
| 구축 | 보이스 | `/dashboard/{orgId}/voice` |
| 구축 | 도구 | `/dashboard/{orgId}/tools` |
| 구축 | 지식 베이스 | `/dashboard/{orgId}/knowledge` |
| 배포 | 전화번호 | `/dashboard/{orgId}/numbers` |
| 배포 | 위젯 | `/dashboard/{orgId}/widget` |
| 배포 | 연동 | `/dashboard/{orgId}/integrations` |
| 발신 | 전화 | `/dashboard/{orgId}/outbound/call/single` |
| 발신 | 문자 | `/dashboard/{orgId}/outbound/sms/single` |
| 발신 | 대량 발신 | `/dashboard/{orgId}/outbound/campaigns` |
| 모니터링 | 기록 (통화·채팅·문자 탭) | `/dashboard/{orgId}/history` |
| 모니터링 | 고객 | `/dashboard/{orgId}/customers` |
| 모니터링 | 알림 | `/dashboard/{orgId}/alerts` |
| 설정 | 워크스페이스 | `/dashboard/{orgId}/settings/workspace` |
| 설정 | 결제 | `/dashboard/{orgId}/settings/billing` |
| 설정 | 멤버 | `/dashboard/{orgId}/settings/member` |
| 설정 | API 키 | `/dashboard/{orgId}/settings/api-key` |
| 설정 | 웹훅 | `/dashboard/{orgId}/settings/webhook` |
| 설정 | SMS | `/dashboard/{orgId}/settings/sms` |
| 설정 | 프로필 | `/dashboard/{orgId}/settings/profile` |

상세 사용법은 영역별 references 파일을 참고한다.

## 워크플로우

1. 질문이 어느 영역인지 정하고 그 reference 하나를 읽는다
2. 화면 경로를 순서대로 설명하고, 필요하면 `deep-links.md`의 URL을 공유해 사용자가 바로 해당 화면으로 이동하게 한다
3. UI에서만 되는 작업인지, MCP 도구로 대신할 수 있는 작업인지를 함께 말한다 — MCP로 되는 작업은 해당 domain skill로 넘긴다
4. 사용자가 대시보드 URL이나 스크린샷을 공유하면 그 화면을 기준으로 설명한다. 사용자의 브라우저를 대신 조작하지 않는다

## 딥링크 활용

쿼리 파라미터로 특정 다이얼로그/폼을 바로 열 수 있다. 자주 쓰는 것:

| 목적 | URL |
|------|-----|
| 번호 구매 다이얼로그 자동 오픈 | `/dashboard/{orgId}/numbers?new=1` |
| 보이스 클론 대화 자동 오픈 | `/dashboard/{orgId}/voice?clone=true` |
| API 도구 생성 폼 | `/dashboard/{orgId}/tools?create=api` |
| MCP 도구 생성 폼 | `/dashboard/{orgId}/tools?create=mcp` |
| 알림 규칙 생성 폼 | `/dashboard/{orgId}/alerts?create` |
| 단위 테스트 생성 | `/dashboard/{orgId}/evals?create=unit` |
| 시나리오 테스트 생성 | `/dashboard/{orgId}/evals?create=scenario` |
| 특정 통화 상세 시트 오픈 | `/dashboard/{orgId}/history?callId={callId}` |

전체 목록과 게이트 조건(verification/billing)은 `references/deep-links.md` 참조.

## Ownership Boundary

| Owns (이 스킬이 담당) | Does Not Own (다른 스킬로 위임) |
|---|---|
| 웹 앱 UI 조작 방법 안내 | 프롬프트 작성/진단 로직 (→ vox-agents) |
| 딥링크 및 쿼리 파라미터 치트시트 | 플로우 노드 설계 (→ vox-flow) |
| UI 전용 작업과 MCP 대체 가능 작업의 구분 | 도구 생성/관리 로직 (→ vox-tools) |
| 다른 vox 스킬의 UI 보충 참조 | 온보딩 전체 플로우 (→ vox-onboarding) |
| UI에서만 가능한 기능(보이스 클론, CSV 업로드, 녹취 재생, 결제, 멤버 초대) 안내 | 가격/플랜 상세 (→ vox-docs MCP) |

## 이 스킬이 하지 않는 것

- **프롬프트 작성의 세부 규칙** → `vox-agents`
- **플로우 노드 설계** → `vox-flow`
- **빌트인/커스텀 도구 관리** → `vox-tools`
- **온보딩 플로우 전체** → `vox-onboarding`
- **가격 정책 상세** → `vox-docs` MCP에서 pricing 검색

## Related Resources

### MCP Tools (vox)
- `list_agents`, `get_agent` — 에이전트 목록/상세 조회 (UI 안내 시 실제 데이터 확인용)
- `list_telephone_numbers` — 보유 번호 확인 (번호 구매 안내 전)
- `list_calls`, `get_call` — 통화 기록/상세 조회

### Docs (vox-docs)
- `https://docs.tryvox.co/docs/start/quickstart` — 빠른 시작 가이드
- `https://docs.tryvox.co/docs/operate/outbound/campaigns` — 대량발신 가이드
- `https://docs.tryvox.co/docs/operate/monitor/history` — 통화 기록 가이드

### App URLs
- `https://www.tryvox.co` — 대시보드 홈
- `https://www.tryvox.co/dashboard/{organizationId}` — 조직 대시보드 루트
