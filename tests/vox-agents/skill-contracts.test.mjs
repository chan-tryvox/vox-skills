import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("vox-agents owns Manual authoring and recursive review", () => {
  const skill = read("skills/vox-agents/SKILL.md");
  assert.match(skill, /Manual 분리 판단/);
  assert.match(skill, /manual-authoring\.md/);
  assert.match(skill, /manual-data-reference\.md/);
  assert.match(skill, /manual-review\.md/);
  assert.match(skill, /직접·linked Manual과 Tool을 재귀 검토/);
  assert.match(skill, /Manual 사용 판단 \(`single_prompt` 내부\)/);
  assert.doesNotMatch(skill, /Manual은 Agent 계약의 일부다/);
  assert.doesNotMatch(skill, /Single Prompt \+ Manuals/);
  assert.doesNotMatch(skill, /'매뉴얼로 빼자'/);
  assert.doesNotMatch(skill, /'StartManual'/);
});

test("router sends Manual work to vox-agents", () => {
  const router = read("skills/using-vox-skills/SKILL.md");
  assert.match(router, /Manual 설계·Trigger·라우팅·linked 체인 진단/);
  assert.match(router, /매뉴얼 만들어줘/);
  assert.doesNotMatch(router, /매뉴얼로 빼자/);
});

test("Side-effect evidence contract lives in the detailed references", () => {
  const skill = read("skills/vox-agents/SKILL.md");
  const playbook = read("skills/vox-agents/references/voice-ai-playbook.md");
  const template = read("skills/vox-agents/references/voice-ai-prompt-template.md");
  const dataReference = read("skills/vox-agents/references/agent-data-reference.md");

  for (const content of [playbook, template]) {
    assert.match(content, /PostCall/);
    assert.match(content, /요청으로 남기/);
  }
  assert.match(dataReference, /PostCall은 통화 내용을 구조화해 저장하는 기능/);
  assert.match(dataReference, /외부 Side-effect를 실행하거나 성공시키지 않는다/);
  assert.doesNotMatch(dataReference, /고객에게 “요청으로 남기겠습니다”/);
  assert.doesNotMatch(skill, /Side-effect 근거 계약/);
  assert.match(playbook, /최종 성공을 명시하지 않으면/);
  assert.match(template, /비최종·조건부·불명확한 결과/);
});

test("Manual data reference stays authoring-facing", () => {
  const source = read("skills/vox-agents/references/manual-data-reference.md");
  const bundled = read("plugins/vox-ai/skills/vox-agents/references/manual-data-reference.md");

  assert.equal(bundled, source, "manual-data-reference.md must match the plugin bundle");
  assert.match(source, /@tool:<빌트인 name>/);
  assert.match(source, /@tool:<커스텀 도구 UUID>/);
  assert.match(source, /@manual:<UUID>/);
  assert.match(source, /특정 Manual 이후에만 사용하는 후속 Manual은 `trigger`를 비우고 부모 content에서 `@manual:<UUID>`로 참조/);
  assert.doesNotMatch(source, /linked_manual_ids/);
  assert.match(source, /M1.*M2.*임시 식별자는 직접 작성하지 않는다/);
  assert.deepEqual(
    [...source.matchAll(/^## (\d+\..+)$/gm)].map((match) => match[1]),
    ["1. 엔티티 필드", "2. 연결 및 참조 규칙", "3. 예시 구조 (annotated skeleton)"],
  );
});

test("Manual authoring guide avoids internal and unrelated implementation details", () => {
  const source = read("skills/vox-agents/references/manual-authoring.md");
  const bundled = read("plugins/vox-ai/skills/vox-agents/references/manual-authoring.md");

  assert.equal(bundled, source, "manual-authoring.md must match the plugin bundle");
  assert.match(source, /trigger는 Manual을 언제 시작할지 판단하는 기준 문장/);
  assert.match(source, /절차 전용 도구.*해당 매뉴얼에 연결/);
  assert.match(source, /후속 Manual을 같은 Agent의 `manuals` 맵에 두고 `trigger`를 비운 뒤/);
  assert.doesNotMatch(source, /linked_manual_ids/);
  assert.match(source, /Manual은 필요한 업무 상황에서만 시작하는 독립 절차/);
  assert.match(source, /M1 같은 임시 식별자는 본문·content에 하드코딩하지 않는다/);
});

test("normal end-call confirmation contract lives in the playbook and prompt template", () => {
  const relativePaths = [
    "references/voice-ai-playbook.md",
    "references/voice-ai-prompt-template.md",
  ];

  for (const relativePath of relativePaths) {
    const source = read(`skills/vox-agents/${relativePath}`);
    const bundled = read(`plugins/vox-ai/skills/vox-agents/${relativePath}`);

    assert.equal(bundled, source, `${relativePath} must match the plugin bundle`);
    assert.match(source, /혹시 더 도와드릴 내용 있으실까요\?/);
    assert.match(source, /더 남기실 말씀 있으신가요\?/);
    assert.match(source, /speakDuringExecution/);
  }

  const playbook = read("skills/vox-agents/references/voice-ai-playbook.md");
  assert.match(playbook, /수신 제외/);
  assert.match(playbook, /잘못 연결/);
  assert.match(playbook, /현재 통화 불가/);

  for (const relativePath of ["SKILL.md", "references/agent-data-reference.md"]) {
    const source = read(`skills/vox-agents/${relativePath}`);
    assert.doesNotMatch(source, /혹시 더 도와드릴 내용 있으실까요\?/);
    assert.doesNotMatch(source, /더 남기실 말씀 있으신가요\?/);
  }
});

test("Manual review documents the recursive tree gate", () => {
  const review = read("skills/vox-agents/references/manual-review.md");
  assert.match(review, /재귀/);
  assert.match(review, /순환 참조/);
  assert.match(review, /@manual:/);
  assert.match(review, /@tool:/);
  assert.match(review, /SIDE-effect|Side-effect/i);
});

test("agent data teaches the agent-owned manuals map, not retired manualIds", () => {
  const dataReference = read("skills/vox-agents/references/agent-data-reference.md");
  const defaults = JSON.parse(read("skills/vox-agents/references/default-agent-data.json"));

  assert.ok(!("manualIds" in defaults), "default-agent-data.json must not carry retired manualIds");
  assert.deepEqual(defaults.manuals, {});
  assert.match(dataReference, /^### manuals$/m);
  assert.match(dataReference, /manualIds is retired/);
  assert.match(dataReference, /맵 전체가 교체된다/);
  assert.doesNotMatch(read("skills/vox-agents/SKILL.md"), /vox agent attach manual/);
});
