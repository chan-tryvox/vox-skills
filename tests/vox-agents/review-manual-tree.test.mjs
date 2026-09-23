import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { reviewManualTree } from "../../skills/vox-agents/scripts/review-manual-tree.mjs";

const ENTRY_TRIGGER = "에이전트가 정보를 물어봐야 할 때, 고객이 정보를 먼저 말하기 시작했을 때, 또는 기존 값을 확인·정정할 때";

function makeWorkspace({ toolBindings = {} } = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "vox-manual-review-"));
  fs.mkdirSync(path.join(workspace, "agents", "demo"), { recursive: true });
  fs.mkdirSync(path.join(workspace, ".vox"), { recursive: true });
  fs.writeFileSync(
    path.join(workspace, "agents", "demo", "agent.json"),
    JSON.stringify({ agent: { name: "demo", type: "single_prompt", data: {} } }),
  );
  writeState(workspace, { bindings: { demo: { agent_id: "00000000-0000-4000-8000-000000000001", manuals: {} } }, tool_bindings: toolBindings });
  return workspace;
}

function writeState(workspace, state) {
  fs.writeFileSync(path.join(workspace, ".vox", "project.json"), JSON.stringify(state));
}

function bindManual(workspace, localName, manualId) {
  const statePath = path.join(workspace, ".vox", "project.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  state.bindings.demo.manuals[localName] = { manual_id: manualId };
  writeState(workspace, state);
}

function writeManual(workspace, localName, { content, trigger = ENTRY_TRIGGER, sound = "typing", builtInTools = [] }) {
  const dir = path.join(workspace, "agents", "demo", "manuals", localName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "manual.json"),
    JSON.stringify({
      schema: "vox.ai.manual-file.v1",
      version: 1,
      manual: {
        name: localName,
        trigger,
        content,
        built_in_tools: builtInTools,
        config: { tool_call_sound: sound },
      },
    }),
  );
}

const validContent = `## 규칙

- 확인된 사실만 사용한다.

## 진행 절차

### 시작

1. 고객이 정보를 말했으면 '확인'으로 이동한다.

### 확인

1. 고객이 동의하면 '완료'로 이동한다.

### 완료

1. 말씀하신 내용을 확인했다고 안내한다.
2. Manual 시작 전에 진행하던 원래 요청을 이어서 처리한다.
`;

test("reviews entry and linked Manuals recursively from the agent's own manuals", () => {
  const workspace = makeWorkspace();
  writeManual(workspace, "root", {
    content: validContent.replace("### 완료", "### linked\n\n1. @manual:child 절차로 이동한다.\n\n### 완료"),
  });
  writeManual(workspace, "child", { content: validContent, trigger: "" });

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.equal(result.source, "local_project");
  assert.equal(result.summary.entry_manual_count, 1);
  assert.equal(result.summary.linked_manual_count, 1);
  assert.equal(result.summary.total_manual_count, 2);
  assert.equal(result.summary.unreachable_manual_count, 0);
  assert.equal(result.summary.critical, 0);
});

test("resolves a linked Manual by its bound UUID", () => {
  const workspace = makeWorkspace();
  const childId = "11111111-2222-4333-8444-555555555555";
  bindManual(workspace, "child", childId);
  writeManual(workspace, "root", { content: `${validContent}\n@manual:${childId}` });
  writeManual(workspace, "child", { content: validContent, trigger: "" });

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.equal(result.summary.linked_manual_count, 1);
  assert.ok(!result.findings.some((finding) => finding.code === "MANUAL_NOT_FOUND"));
});

test("reports a linked Manual outside the agent's manual map", () => {
  const workspace = makeWorkspace();
  writeManual(workspace, "root", { content: `${validContent}\n@manual:missing` });

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) => finding.code === "MANUAL_NOT_FOUND"));
});

test("detects a linked Manual cycle", () => {
  const workspace = makeWorkspace();
  writeManual(workspace, "a", { content: `${validContent}\n@manual:b` });
  writeManual(workspace, "b", { content: `${validContent}\n@manual:a`, trigger: "" });

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) => finding.code === "MANUAL_CYCLE"));
});

test("warns about a Manual that no trigger or link can start", () => {
  const workspace = makeWorkspace();
  writeManual(workspace, "root", { content: validContent });
  writeManual(workspace, "orphan", { content: validContent, trigger: "" });

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.equal(result.summary.unreachable_manual_count, 1);
  assert.ok(result.findings.some((finding) => finding.code === "MANUAL_UNREACHABLE" && finding.manual === "orphan"));
});

test("reports structure, sound, raw state, and unsupported Side-effect claims", () => {
  const workspace = makeWorkspace();
  writeManual(workspace, "bad", {
    sound: "none",
    content: `## 규칙

- result=accepted로 기록한다.
- recommended_action이 single_confirm_top_candidate이면 이동한다.

## 진행 절차

### 시작

1. 예약을 접수하겠습니다.
`,
  });

  const result = reviewManualTree({ workspace, agent: "demo" });
  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.ok(codes.has("MANUAL_COMPLETE_SECTION_MISSING"));
  assert.ok(codes.has("MANUAL_TYPING_SOUND_MISSING"));
  assert.ok(codes.has("CODE_STATE_ASSIGNMENT"));
  assert.ok(codes.has("RAW_TOOL_STATE_TOKEN"));
  assert.ok(codes.has("SIDE_EFFECT_WITHOUT_TOOL"));
});

test("accepts a Manual-owned built-in Tool and a bound custom Tool", () => {
  const workspace = makeWorkspace({ toolBindings: { crm_lookup: { tool_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" } } });
  writeManual(workspace, "address", {
    content: `${validContent}\n@tool:search_address\n@tool:crm_lookup`,
    builtInTools: [{ toolType: "search_address", name: "search_address" }],
  });

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.ok(!result.findings.some((finding) => finding.code === "MANUAL_TOOL_UNRESOLVED"));
});

test("flags a built-in Tool reference the Manual does not own", () => {
  const workspace = makeWorkspace();
  writeManual(workspace, "address", { content: `${validContent}\n@tool:search_address` });

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.ok(result.findings.some((finding) => finding.code === "MANUAL_TOOL_UNRESOLVED"));
});

test("flags retired manual keys left in agent.json", () => {
  const workspace = makeWorkspace();
  fs.writeFileSync(
    path.join(workspace, "agents", "demo", "agent.json"),
    JSON.stringify({ agent: { name: "demo", type: "single_prompt", data: { manualIds: [] } } }),
  );

  const result = reviewManualTree({ workspace, agent: "demo" });
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) => finding.code === "MANUAL_IDS_RETIRED"));
});

test("reviews the inline data.manuals map of a remote agent JSON", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "vox-manual-review-inline-"));
  const rootId = "22222222-3333-4444-8555-666666666666";
  const childId = "33333333-4444-4555-8666-777777777777";
  const customToolId = "44444444-5555-4666-8777-888888888888";
  const agentFile = path.join(workspace, "agent.json");
  fs.writeFileSync(agentFile, JSON.stringify({
    agent_id: "00000000-0000-4000-8000-000000000002",
    type: "single_prompt",
    data: {
      manuals: {
        [rootId]: {
          name: "root",
          trigger: ENTRY_TRIGGER,
          content: `${validContent}\n@manual:${childId}\n@tool:${customToolId}`,
          built_in_tools: [],
          config: { tool_call_sound: "typing" },
        },
        [childId]: {
          name: "child",
          trigger: "",
          content: validContent,
          built_in_tools: [],
          config: { tool_call_sound: "typing" },
        },
      },
    },
  }));

  const result = reviewManualTree({ workspace, agentFile });
  assert.equal(result.source, "agent_data_manuals");
  assert.equal(result.summary.entry_manual_count, 1);
  assert.equal(result.summary.linked_manual_count, 1);
  assert.equal(result.summary.critical, 0);
  assert.ok(result.findings.some((finding) => finding.code === "MANUAL_CUSTOM_TOOL_UNVERIFIED"));
});
