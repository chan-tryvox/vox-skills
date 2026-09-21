# Voice Emotive Speech (Cartesia Sonic-3)

에이전트가 **감정·속도·웃음 같은 표현력**을 발화에 실을 수 있게 하는 prompting 가이드. SSML 태그와 nonverbalism을 system prompt 또는 런타임 발화에 삽입해, Cartesia Sonic-3 TTS가 단조로운 낭독에서 벗어나 "말하는 사람"처럼 들리게 만든다.

## 프롬프트 템플릿에서의 역할 (opt-in 모듈)

이 레퍼런스는 `voice-ai-prompt-template.md`의 **opt-in 모듈**이다.

- **주입 위치** — 템플릿의 `# 표현력 (opt-in)` 주석 블록 안 `[[expressivity_rules]]` placeholder
- **포함 조건** — 유저가 "자연스럽게", "감정 발화", "웃게", "톤", "속도 조절", "감정 enabled" 등을 요청할 때
- **전제 조건** — 에이전트 voice가 **Cartesia** 제공자여야 함 (아니면 제안부터)
- **요약 규칙** — 이 문서 전체를 복사하지 않는다. 아래 "프롬프트에 적용하는 방법"을 바탕으로 **해당 유즈케이스에 맞는 규칙 3~5개**만 요약해 `[[expressivity_rules]]`에 채운다.
- **미요청 시** — 템플릿의 `# 표현력` 주석 블록을 그대로 삭제한다 (placeholder를 빈 값으로 두지 말 것).

## 섹션 역할 경계 (중복 주입 금지)

표현력 관련 규칙(SSML `<speed>`, `<emotion>`, `[laughter]`)은 **`# 표현력` 섹션에만** 둡니다. 다른 섹션에 같은 규칙을 복제하지 않습니다.

| 섹션 | 담당 | 하지 말 것 |
|------|------|-----------|
| `# 표현력` | SSML 태그 **사용 규칙** (언제 `<speed 0.9>`를 쓰는지 등) | — |
| `# 문자 정규화` | 발화 형식 ↔ 도구 입력 형식의 **변환** (전화번호 공일공/01012345678 등) | 속도·감정 지시 넣지 않기 |
| `# 자연스러움 (필러)` | 필러 사용 조건 (허용·금지 상황) | `<speed>`/`<emotion>` 태그 규칙 넣지 않기 (숫자 구간 필러 금지는 필러 고유 규칙이므로 유지) |
| `# 대화 흐름` | 각 단계 발화 **예시**에 태그가 들어간 문장 자체는 OK | 태그 사용 *규칙*을 다시 정의하지 않기 |

Playbook의 revision Pattern A("강하게 1회, 다른 곳은 참조만")를 표현력 모듈에 일반화한 적용. 중복이 생기면 추론 시 충돌·갱신 누락·장문화 위험이 커집니다.

## 언제 이 레퍼런스를 읽는가

유저가 다음 중 하나를 요청할 때:

- "더 자연스럽게 말하게 해줘", "톤을 살려줘"
- "AI가 웃게 해줘", "유쾌하게"
- "속도를 조절하게", "천천히 읽게", "빠르게 말하게"
- "흥분한 톤", "차분하게", "미안한 톤으로" 등 **감정 표현**

일반적인 voice UX 규칙(짧게 말하기, 질문 1개)은 `voice-ai-playbook.md` 담당. 이 레퍼런스는 **표현력(expressivity)** 에만 집중한다.

## 전제 조건

- 에이전트의 voice가 **Cartesia** 제공자여야 한다. 다른 제공자(ElevenLabs/OpenAI 등)에서는 아래 태그가 그대로 읽히거나 무시될 수 있다.
- 현재 pipeline provider 확인 방법: `get_agent()` 응답의 `data.voice.provider`를 본다. `voice`가 비어 있으면 서버 기본 음성이 적용된 상태이므로 `list_voice_models`로 기본 provider를 확인한다. 규칙 8(기본값은 서버가 채운다) 때문에 생성 시 `voice`를 생략했다면 이 확인 없이는 provider를 알 수 없다. GPT-Live에서는 이 레퍼런스를 pipeline 음성 설정에만 적용하고, 런타임 음성은 `data.runtime.voice`에서 확인한다. GPT-Live에 pipeline TTS 설정이나 이 문서의 SSML 예시를 추측으로 복사하지 않는다.
- voice 변경은 대시보드 UI 작업이므로 `vox-web-app` 스킬을 호출해 안내한다(에이전트 상세 › 목소리(TTS)/속도).
- 감정 표현은 Cartesia voice 중에서도 emotive-tagged voice에서 더 안정적으로 나온다(선택사항).

## 지원하는 컨트롤

### 1. 속도 — `<speed ratio="X"/>`

- 범위: **0.6 ~ 1.5** (기본 1.0)
- 가이드(strict 아님)로 해석됨

```xml
<speed ratio="0.9"/> 예약은 다음 주 월요일 오후 3시에 잡혀 있습니다.
<speed ratio="1.2"/> 자, 이제 빠르게 안내드릴게요.
```

### 2. 감정 — `<emotion value="X"/>`

- **Primary(권장, 가장 안정적)**: `neutral`, `angry`, `excited`, `content`, `sad`, `scared`
- Full list: `happy`, `enthusiastic`, `elated`, `euphoric`, `triumphant`, `amazed`, `surprised`, `flirtatious`, `joking/comedic`, `curious`, `peaceful`, `serene`, `calm`, `grateful`, `affectionate`, `trust`, `sympathetic`, `anticipation`, `mysterious`, `mad`, `outraged`, `frustrated`, `agitated`, `threatened`, `disgusted`, `contempt`, `envious`, `sarcastic`, `ironic`, `dejected`, `melancholic`, `disappointed`, `hurt`, `guilty`, `bored`, `tired`, `rejected`, `nostalgic`, `wistful`, `apologetic`, `hesitant`, `insecure`, `confused`, `resigned`, `anxious`, `panicked`, `alarmed`, `proud`, `confident`, `distant`, `skeptical`, `contemplative`, `determined`

```xml
<emotion value="excited"/> 축하드려요! 예약이 확정됐습니다.
<emotion value="apologetic"/> 정말 죄송합니다. 배송이 하루 지연되고 있어요.
```

### 3. 웃음 — `[laughter]`

- 발화 안에 그대로 삽입
- 현재 Cartesia에서 지원하는 유일한 nonverbalism (향후 한숨/기침 등 확장 예정)

```xml
아, 그건 저도 모르겠네요 [laughter]. 한번 알아봐드릴게요.
```

## 프롬프트에 적용하는 방법

시스템 프롬프트의 말투 섹션에 "사용 규칙"을 박아, LLM이 스스로 상황에 맞게 태그를 출력하도록 한다.

```md
# 말투/발화 스타일
- 고객이 유쾌한 반응을 보이거나 농담을 하면, 발화에 `[laughter]`를 자연스럽게 섞어도 됩니다.
- 좋은 소식(예약 확정, 승인 완료)을 전할 때는 앞에 `<emotion value="excited"/>`를 붙입니다.
- 실망스러운 안내(지연, 취소)는 `<emotion value="apologetic"/>`로 시작합니다.
- 꼭 정확히 들려야 하는 **최종 확정** 안내(예: 예약 날짜·시간 한 번)에만 `<speed ratio="0.9"/>`를 붙입니다. 모든 숫자/날짜에 붙이지 않습니다.
```

## 핵심 원칙

1. **Guidance이지 strict control이 아니다** — Sonic-3가 태그를 "해석"해 표현에 반영할 뿐, 수학적으로 정확한 변화는 아니다. 반드시 **실제 통화로 테스트**해 결과를 확인.
2. **감정 ↔ 텍스트 일관성** — `<emotion value="sad"/> 너무 신나요!` 같은 불일치는 무시된다. 감정 태그는 내용과 같은 방향일 때만 작동.
3. **적절한 곳에만 선별적으로** — voice 자체가 이미 자연스럽다. 모든 문장에 태그를 달면 과장되어 어색해진다. 태그 없이 기본(neutral, 1.0x)으로 말하는 게 디폴트이고, 감정·속도가 의미 있게 바뀌는 **핵심 순간에만** 붙인다. 통화 한 번에 태그가 몇 개 붙는지가 "많다" 싶으면 과한 것.
4. **XML 이스케이프 금지** — 태그는 **평문 XML**로 쓴다. system prompt가 JSON으로 저장된다고 해서 역슬래시로 이스케이프하지 않는다. 잘못: `<emotion value=\"excited\"/>`. 맞음: `<emotion value="excited"/>`. 편집 UI, API, MCP 어디서 저장하든 평문 따옴표를 유지한다.
5. **한국어 검증은 별도 필요** — Cartesia 공식 예시는 영어 기반이다. 한국어 발화에서 각 emotion/speed 값이 어떻게 들리는지 **첫 배포 전 반드시 테스트 콜**로 확인.
6. **voice UX 기본 규칙이 우선** — 표현력을 추가해도 "질문 1개, 짧게 말하기" 같은 `voice-ai-playbook.md` 규칙은 그대로 유지된다.

## Primary emotion 빠른 선택 가이드

| value | 쓰는 상황 | 주의 |
|-------|-----------|------|
| `neutral` | 기본 안내/정보 전달 | 태그 생략해도 동일 |
| `content` | 따뜻한 인사, 만족 응답, 마무리 | 상담 톤 기본 후보 |
| `excited` | 축하/확정/좋은 소식 | 과하면 부담스러울 수 있음 |
| `sad` / `apologetic` | 지연·취소·실패 안내 | 사과 발화와 결합 |
| `angry` | 거의 사용하지 않음 | 상담 에이전트에선 부적절 |
| `scared` | 거의 사용하지 않음 | 경고/보안 시나리오에서만 제한적 |

## 참고

- Cartesia 공식 문서: Volume, Speed, and Emotion
- Cartesia SSML 태그 전체 목록: `build-with-cartesia/sonic-3/ssml-tags`
- vox 플랫폼에서 voice 변경 UI 안내: `vox-web-app` 스킬 호출 (에이전트 상세 › 목소리(TTS)/속도)
