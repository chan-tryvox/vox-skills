# Manual 재귀 품질 검토

Manual이 있는 Agent는 본문 prompt와 진입 Manual만 따로 검토하지 않는다. Agent 본문이 진입을 결정하고, Manual content가 linked Manual과 Manual 소유 Tool을 해금하므로 도달 가능한 전체 트리를 하나의 Agent 계약으로 검토한다.

## 검토 범위

1. Agent의 `data.manuals` 맵(로컬 CLI 프로젝트는 `agents/<agent>/manuals/`)에서 `trigger`가 채워진 진입 Manual을 수집한다.
2. 각 Manual content의 `@manual:` 참조를 따라 같은 Agent 맵 안의 linked Manual을 수집한다.
3. linked Manual의 content도 같은 방식으로 재귀 탐색한다.
4. 같은 Manual은 한 번만 검토한다.
5. 탐색 중인 경로에서 이미 방문 중인 Manual을 다시 만나면 순환 참조로 판정한다.
6. 각 Manual의 `@tool:` 참조와 실제 소유 built-in Tool·참조한 custom Tool을 함께 검토한다.
7. `trigger`가 비어 있고 어떤 Manual에서도 참조되지 않는 Manual은 도달할 수 없으므로 따로 표시한다.

원격 Manual을 다룰 때 Vox CLI를 사용할 수 있으면 `vox agent pull`과 `vox manual pull --agent <agent>`로 로컬 Agent-as-Code 프로젝트에 가져온 뒤 검토한다. CLI가 없으면 MCP `get_agent` 결과의 `data.manuals` 맵이나 사용자가 제공한 Agent JSON 범위 안에서 검토한다. 공개 vox MCP surface에는 Manual 단건 CRUD Tool이 없으므로 존재하지 않는 MCP Tool을 가정하지 않고, 확인하지 못한 대상은 미검증으로 명시한다.

## 탐색 결과

검토 결과에는 다음 요약을 포함한다.

- 진입 Manual 수
- linked Manual 수
- 전체 고유 Manual 수
- 최대 linked 깊이
- 순환 참조 여부
- 풀리지 않은 `@manual:` 참조
- Manual별 소유 Tool과 `@tool:` 참조
- Critical / Warning / Info 개수

## Critical

- `@manual:` 대상이 같은 Agent 맵에 없거나 로컬에서 풀리지 않아 linked 절차를 검증할 수 없음
- Agent data에 폐기된 `manualIds`·`manualRefs`가 남아 있음
- 순환 참조가 존재함
- content가 `@tool:`을 참조하지만 해당 Manual이 그 Tool을 소유하지 않음
- 외부 상태 변경을 완료했다고 말하지만 해당 Side-effect를 수행한 쓰기 Tool 성공 근거가 없음
- `### 완료`가 없어 Manual 종료·복귀 지점이 불명확함

## Warning

- `config.tool_call_sound`가 `typing`이 아니고 별도 무음 요구도 없음
- `## 규칙`, `## 진행 절차`, `### 시작` 중 하나가 없음
- `### 완료`에 원래 요청 복귀 또는 Agent 마무리 계약이 없음
- `key=value` 형태의 코드형 상태 할당을 사용함
- raw Tool enum이나 결과 필드명을 상태 이름·고객 발화에 노출함
- Trigger가 업무 도달 / 고객 선발화 / 기존 값 확인·정정 진입점을 충분히 커버하지 않음
- Trigger 시작 발화 예시를 전체 Trigger에 교차 대입한 근거가 없음
- 수집 불가·거절·정정 경로가 없음
- linked 깊이가 2단을 초과해 Flow 검토가 필요함
- `trigger`가 비어 있는데 어떤 Manual에서도 참조되지 않아 도달할 수 없음
- PostCall만 있는데 처리 완료를 암시하거나 담당자 연락을 보장함

## Info

- Manual 이름, Trigger, content 길이
- Manual 소유 Tool 목록
- linked 대상 목록
- `typing` 설정 여부
- Side-effect 표현과 근거 후보

## 검토 순서

1. Agent prompt에서 첫 발화와 Manual 라우팅 경계를 확인한다.
2. 진입 Manual Trigger를 서로 비교하고 시작 발화 예시를 교차 대입한다.
3. linked Manual 트리를 재귀 탐색한다.
4. 각 content 구조와 완료 복귀 계약을 확인한다.
5. `@tool:`과 Manual 소유 Tool을 대조한다.
6. Side-effect 완료 표현을 쓰기 Tool / 요청 기록 / 내용 확인으로 분류한다.
7. 로컬 검증 후 remote read-back과 실제 transcript로 `StartManual → Manual Tool → 발화` 순서를 확인한다.

## 로컬 검사기

Agent-as-Code 프로젝트에서는 다음 helper를 사용한다.

```bash
# 스크립트는 이 스킬 디렉터리의 scripts/ 에 있다 (플러그인 설치본: ${CLAUDE_PLUGIN_ROOT}/skills/vox-agents/scripts/)
node <vox-agents 스킬 디렉터리>/scripts/review-manual-tree.mjs \
  --workspace /path/to/vox-project \
  --agent agent-local-name \
  --json
```

스크립트는 `agents/<agent>/manuals/*/manual.json`, `.vox/project.json`의 `bindings[<agent>].manuals`와 `tool_bindings`, content의 `@manual:`·`@tool:` 참조를 읽는다. `--agent-file`에 `data.manuals` 맵이 든 Agent JSON(예: `get_agent` 결과)을 주면 그 맵을 검토한다. Critical이 있으면 1, `--strict`에서 Warning이 있으면 2로 종료한다. 스크립트 통과는 정적 품질 검사이며 실제 런타임 발화·TTS·대기음 재생을 증명하지 않는다.

## 완료 기준

- Critical 0
- Warning은 의도적 예외만 남고 이유가 기록됨
- 진입·linked Manual 및 Tool 전체가 remote read-back과 일치함
- 대표 Trigger별 transcript에서 Manual 진입 전 선응답이 없음
- 쓰기 Tool이 없는 업무가 완료·변경·취소·발송을 약속하지 않음
