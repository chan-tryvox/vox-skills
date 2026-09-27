# vox.ai Skills

vox.ai 개발자를 위한 Codex/Claude plugin + Agent Skills 레포입니다.

## 설치

### OpenAI Codex Plugin (권장)

터미널에서 한 줄로 vox.ai 마켓플레이스를 등록합니다 (2026-04+ Codex).

```bash
codex plugin marketplace add vox-public/vox-skills
```

그 뒤 plugin 목록에서 `vox-ai`를 설치합니다.

- **Codex App**: **Plugins** 화면에서 `vox-ai` → **Add to Codex**
- **Codex CLI**: `codex` 실행 후 `/plugins` → `vox-ai` → **Install plugin**

설치 중 브라우저에서 vox.ai OAuth 로그인 창이 열립니다. 설치 후에는 Codex를 재시작해야 skill과 MCP 서버가 현재 세션에 로드됩니다.

### Claude Code Plugin

Claude Code 세션 안에서 slash command로 진행합니다.

```
# 1. marketplace 등록
/plugin marketplace add vox-public/vox-skills

# 2. plugin 설치
/plugin install vox-ai@vox-ai

# 3. 현재 세션에 로드
/reload-plugins
```

한 번의 설치로 MCP 서버 + Skills가 모두 제공됩니다. 처음 vox MCP 도구를 호출할 때 브라우저에서 vox.ai OAuth 로그인 창이 열립니다.

### MCP 직접 등록 (대안)

```bash
# Codex MCP
codex mcp add vox --url https://mcp.tryvox.co/mcp
codex mcp login vox

# Claude Code MCP
claude mcp add --transport http vox https://mcp.tryvox.co/mcp

# Skills
npx skills add https://github.com/vox-public/vox-skills --skill using-vox-skills
```

레포에서 에이전트를 코드처럼 관리하는 코딩 에이전트 작업은 [vox CLI](https://docs.tryvox.co/docs/ai/cli)가 담당합니다. CLI에는 이 레포의 스킬이 offline pack으로 함께 들어 있어 `vox skills show <skill> --brief --json`으로 같은 내용을 조회할 수 있습니다.

설치 전에 레포에 포함된 스킬 목록을 확인하려면:

```bash
npx skills add https://github.com/vox-public/vox-skills --list
```

## Available Skills

### using-vox-skills (router)

vox.ai 관련 요청의 routing entrypoint. 요청 내용에 따라 아래 domain skill을 자동 선택합니다.

- `skills/using-vox-skills/SKILL.md`

### vox-onboarding

첫 사용자 온보딩. 에이전트 생성 → 아웃바운드 테스트 → 인바운드 설정까지 안내합니다.

- MCP 서버 연결 설정 (Claude/Cursor/ChatGPT/VS Code/Codex/OpenCode)
- `skills/vox-onboarding/SKILL.md`

### vox-agents

프롬프트 에이전트(single prompt) 설계와 Agent의 선택적 기능인 Manual, 공통 음성 UX 규칙을 담당합니다.

- 신규 프롬프트 작성 워크플로우 + 한국어 템플릿
- Manual 분리 판단, Trigger/content/linked 체인, Manual 소유 Tool 설계
- 직접·linked Manual 재귀 품질 검사
- 쓰기 Tool·PostCall·내용 확인을 구분하는 Side-effect 완료 근거 계약
- 인바운드·아웃바운드 정상 종료 확인 질문과 `end_call.speakDuringExecution` 종료 멘트 계약
- 실패 사례 원인 진단 → 리팩터링
- agent.data 스키마 (MCP create_agent/update_agent)
- Agent Type 판단 (prompt-based vs flow) + single_prompt 내부 Manual 사용 판단 + flow handoff
- `skills/vox-agents/SKILL.md`

### vox-flow

플로우 에이전트 설계를 담당합니다. vox-agents의 확장 스킬입니다.

- 11종 node type 설계/설정
- 스크립트 → Mermaid flowchart → flow node 변환
- 변수 시스템 (extraction → condition 체인)
- 설계물 체크리스트 기반 리뷰
- `skills/vox-flow/SKILL.md`

### vox-tools

vox.ai 에이전트의 빌트인/커스텀 도구 관리를 담당합니다.

- 빌트인 도구: end_call, transfer_call, transfer_agent, send_sms, send_dtmf, search_address
- 커스텀 도구 (API/MCP type) 생성/연결/해제
- `skills/vox-tools/SKILL.md`

### vox-web-app

vox.ai 웹 앱(`tryvox.co/dashboard`) 사용 가이드. 다른 스킬에서 UI 안내가 필요할 때도 참조됩니다.

- 구축(build): agents, voice, tools, knowledge
- 배포(deploy): numbers, single/batch outbound
- 모니터링(monitor): history, alerts (통화 차트는 대시보드 홈)
- 설정(settings): workspace, billing, member, api-key, webhook, sms, profile
- 딥링크 치트시트 (`?new=1`, `?clone=true`, `?create=api` 등)
- `skills/vox-web-app/SKILL.md`

## 검사

```bash
bash scripts/check-bundle-sync.sh            # Codex 번들·매니페스트 버전 동기화
bash scripts/check-skill-mcp-conformance.sh  # MCP 도구명·인자 형태 회귀
node --test 'tests/**/*.test.mjs'            # 스킬 계약 테스트
```

trigger eval 세트는 `evals/<skill>/trigger_eval.json`에 있고, 실행 방법은 `evals/README.md`를 참고합니다. 라이선스는 [MIT](LICENSE)입니다.

## MCP Servers

이 플러그인은 두 개의 MCP 서버를 연결합니다:

| Name | URL | 역할 |
|------|-----|------|
| `vox` | `https://mcp.tryvox.co/mcp` | 플랫폼 도구 (에이전트, 통화, 조직 등) |
| `vox-docs` | `https://fleek.mintlify.app/mcp` | 공식 문서 검색 (search_vox_ai_docs + query_docs_filesystem) |
