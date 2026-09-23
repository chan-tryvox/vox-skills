#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MANUAL_REF_RE = /@manual:([A-Za-z0-9._-]+)/g;
const TOOL_REF_RE = /@tool:([A-Za-z0-9._-]+)/g;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RETIRED_AGENT_KEYS = ["manualIds", "manual_ids", "manualRefs"];
const SIDE_EFFECT_RE = /(완료됐습니다|완료되었습니다|처리가 완료|변경됐습니다|변경되었습니다|취소됐습니다|취소되었습니다|발송됐습니다|발송되었습니다|보내드리겠습니다|예약이 확정|접수해 드리겠습니다|접수하겠습니다|연락드리겠습니다|기사가 연락드립니다|방문합니다)/;
const NEGATION_RE = /(말하지|보장하지|확정하지|완료로.*않|금지|경우에만|성공.*경우|근거가.*있을 때|아직.*않|아닙니다|없습니다)/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extractRefs(content, regex) {
  return [...String(content ?? "").matchAll(regex)].map((match) => match[1]);
}

function parseArgs(argv) {
  const args = { workspace: process.cwd(), json: false, strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i];
    else if (arg === "--agent") args.agent = argv[++i];
    else if (arg === "--agent-file") args.agentFile = argv[++i];
    else if (arg === "--json") args.json = true;
    else if (arg === "--strict") args.strict = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  review-manual-tree.mjs --workspace <vox-project> --agent <local-name> [--json] [--strict]",
    "  review-manual-tree.mjs --agent-file <agent.json with data.manuals> [--json] [--strict]",
  ].join("\n");
}

// Manuals belong to one agent. A remote agent JSON (for example a get_agent
// result) carries them inline as `data.manuals` keyed by manual UUID; a local
// Vox CLI project keeps one file per manual under agents/<agent>/manuals/ and
// the UUIDs in .vox/project.json bindings[<agent>].manuals.
function buildIndex({ workspace, agentName, agentFile, agentData, inline }) {
  const statePath = path.join(workspace, ".vox", "project.json");
  const state = fs.existsSync(statePath) ? readJson(statePath) : {};
  const toolBindings = state.tool_bindings ?? {};
  const toolIds = new Set(Object.values(toolBindings).map((binding) => binding?.tool_id?.toLowerCase()).filter(Boolean));
  const manuals = new Map();
  const idToLocal = new Map();

  if (inline) {
    for (const [manualId, value] of Object.entries(agentData.manuals)) {
      const key = manualId.toLowerCase();
      manuals.set(key, { localName: key, filePath: `${agentFile}#/data/manuals/${manualId}`, manual: value ?? {} });
      idToLocal.set(key, key);
    }
  } else {
    const bindings = state.bindings?.[agentName]?.manuals ?? {};
    for (const [localName, binding] of Object.entries(bindings)) {
      if (binding?.manual_id) idToLocal.set(binding.manual_id.toLowerCase(), localName);
    }
    const manualsDir = path.join(workspace, "agents", agentName, "manuals");
    if (fs.existsSync(manualsDir)) {
      for (const entry of fs.readdirSync(manualsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const filePath = path.join(manualsDir, entry.name, "manual.json");
        if (!fs.existsSync(filePath)) continue;
        const source = readJson(filePath);
        manuals.set(entry.name, { localName: entry.name, filePath, manual: source.manual ?? source });
      }
    }
  }

  return { manuals, idToLocal, toolBindings, toolIds };
}

function resolveManualRef(ref, index) {
  if (index.manuals.has(ref)) return ref;
  const byId = index.idToLocal.get(ref.toLowerCase());
  if (byId && index.manuals.has(byId)) return byId;
  return undefined;
}

// "ok" when the reference resolves locally, "unverified" for a custom tool UUID
// that only the API can check, "unresolved" when it cannot be valid.
function resolveToolRef(ref, manual, index) {
  const builtIns = new Set((manual.built_in_tools ?? manual.builtInTools ?? []).map((tool) => tool?.name).filter(Boolean));
  if (builtIns.has(ref)) return "ok";
  if (index.toolBindings[ref]) return "ok";
  if (UUID_RE.test(ref)) return index.toolIds.has(ref.toLowerCase()) ? "ok" : "unverified";
  return "unresolved";
}

function addFinding(findings, severity, code, manual, filePath, message, evidence) {
  findings.push({ severity, code, manual, path: filePath, message, ...(evidence ? { evidence } : {}) });
}

function isEntry(manual) {
  return String(manual.trigger ?? "").trim().length > 0;
}

function reviewOneManual(node, index, findings) {
  const { localName, filePath, manual } = node;
  const content = String(manual.content ?? "");
  const trigger = String(manual.trigger ?? "");
  const sound = manual.config?.tool_call_sound ?? manual.config?.toolCallSound ?? null;

  if (!String(manual.name ?? "").trim()) {
    addFinding(findings, "critical", "MANUAL_NAME_REQUIRED", localName, filePath, "A reachable Manual needs a name.");
  }
  if (!/^## 규칙\s*$/m.test(content)) {
    addFinding(findings, "warning", "MANUAL_RULES_SECTION_MISSING", localName, filePath, "`## 규칙` section is missing.");
  }
  if (!/^## 진행 절차\s*$/m.test(content)) {
    addFinding(findings, "warning", "MANUAL_PROCEDURE_SECTION_MISSING", localName, filePath, "`## 진행 절차` section is missing.");
  }
  if (!/^### 시작\s*$/m.test(content)) {
    addFinding(findings, "warning", "MANUAL_START_SECTION_MISSING", localName, filePath, "`### 시작` section is missing.");
  }
  if (!/^### 완료\s*$/m.test(content)) {
    addFinding(findings, "critical", "MANUAL_COMPLETE_SECTION_MISSING", localName, filePath, "`### 완료` section is missing.");
  }
  if (!/(원래 요청|진행하던[^\n]*요청|기본 대화로 돌아|Agent의 마무리|에이전트의 마무리|마무리 규칙)/i.test(content)) {
    addFinding(findings, "warning", "MANUAL_RETURN_CONTRACT_MISSING", localName, filePath, "Manual completion does not clearly return to the original request or Agent closing flow.");
  }
  if (sound !== "typing") {
    addFinding(findings, "warning", "MANUAL_TYPING_SOUND_MISSING", localName, filePath, "Manual tool_call_sound is not `typing`.", String(sound));
  }
  if (/\b[a-z][a-z0-9_]*\s*=\s*[a-z0-9_]+\b/i.test(content)) {
    addFinding(findings, "warning", "CODE_STATE_ASSIGNMENT", localName, filePath, "Manual uses a key=value-style internal state assignment.");
  }
  if (/\b(recommended_action|single_confirm_top_candidate|ask_for_core_address|ask_disambiguation|no_hit_retry)\b/.test(content)) {
    addFinding(findings, "warning", "RAW_TOOL_STATE_TOKEN", localName, filePath, "Manual repeats raw Tool result fields or enum tokens; prefer natural-language branching.");
  }

  // A blank trigger makes a follow-up Manual that only a parent's @manual: link
  // can start, so the entry-point checks apply to entry Manuals only.
  if (isEntry(manual)) {
    const triggerChecks = [
      [/(물어봐야|확인해야|안내해야|판정해야|처리하기 전에|해야 할 때)/, "TRIGGER_AGENT_ENTRY_MISSING", "Trigger may be missing the Agent-needs-to-act entry."],
      [/고객이[^.\n]*(말|불러|요청|물|원|시작)/, "TRIGGER_CUSTOMER_ENTRY_MISSING", "Trigger may be missing the customer-speaks-first entry."],
      [/(확인|정정|수정|바꾸|재확인)/, "TRIGGER_CORRECTION_ENTRY_MISSING", "Trigger may be missing the confirm/correct entry."],
    ];
    for (const [regex, code, message] of triggerChecks) {
      if (!regex.test(trigger)) addFinding(findings, "warning", code, localName, filePath, message, trigger);
    }
  }

  const toolRefs = extractRefs(content, TOOL_REF_RE);
  for (const toolRef of new Set(toolRefs)) {
    const status = resolveToolRef(toolRef, manual, index);
    if (status === "unresolved") {
      addFinding(findings, "critical", "MANUAL_TOOL_UNRESOLVED", localName, filePath, `@tool:${toolRef} is neither a built-in Tool in this Manual's built_in_tools nor a bound custom Tool.`);
    } else if (status === "unverified") {
      addFinding(findings, "warning", "MANUAL_CUSTOM_TOOL_UNVERIFIED", localName, filePath, `@tool:${toolRef} is a custom Tool UUID that is not bound locally; the API checks it at publish.`);
    }
  }

  for (const line of content.split("\n")) {
    if (!SIDE_EFFECT_RE.test(line) || NEGATION_RE.test(line)) continue;
    if (toolRefs.length === 0) {
      addFinding(findings, "critical", "SIDE_EFFECT_WITHOUT_TOOL", localName, filePath, "Manual contains a completion or future-action claim without a referenced Tool.", line.trim());
    } else {
      addFinding(findings, "warning", "SIDE_EFFECT_TOOL_RESULT_REVIEW", localName, filePath, "Verify that the referenced Tool performs this Side-effect and that the claim is conditional on its success result.", line.trim());
    }
  }

  return {
    name: manual.name ?? localName,
    local_name: localName,
    entry: isEntry(manual),
    trigger,
    sound,
    content_length: content.length,
    manual_refs: [...new Set(extractRefs(content, MANUAL_REF_RE))],
    tool_refs: [...new Set(toolRefs)],
  };
}

export function reviewManualTree({ workspace, agent, agentFile }) {
  const resolvedWorkspace = path.resolve(workspace ?? process.cwd());
  const resolvedAgentFile = path.resolve(
    resolvedWorkspace,
    agentFile ?? path.join("agents", agent, "agent.json"),
  );
  if (!fs.existsSync(resolvedAgentFile)) throw new Error(`Agent file not found: ${resolvedAgentFile}`);

  const agentSource = readJson(resolvedAgentFile);
  const agentData = (agentSource.agent ?? agentSource).data ?? {};
  const agentName = agent ?? path.basename(path.dirname(resolvedAgentFile));
  const inline = Boolean(agentFile) && isPlainObject(agentData.manuals);
  const index = buildIndex({ workspace: resolvedWorkspace, agentName, agentFile: resolvedAgentFile, agentData, inline });
  const findings = [];

  const retiredKeys = RETIRED_AGENT_KEYS.filter((key) => key in agentData);
  if (!inline && "manuals" in agentData) retiredKeys.push("manuals");
  if (retiredKeys.length > 0) {
    addFinding(findings, "critical", "MANUAL_IDS_RETIRED", "agent", resolvedAgentFile, `Agent data still carries retired manual keys: ${retiredKeys.join(", ")}. Manuals live in the agent's own manual map.`);
  }

  const nodes = [];
  const visited = new Set();
  const active = new Set();
  let maxDepth = 0;

  function visit(localName, depth, from) {
    maxDepth = Math.max(maxDepth, depth);
    if (active.has(localName)) {
      addFinding(findings, "critical", "MANUAL_CYCLE", localName, index.manuals.get(localName)?.filePath, `Manual cycle detected at '${localName}'.`);
      return;
    }
    if (visited.has(localName)) return;

    const node = index.manuals.get(localName);
    active.add(localName);
    const reviewed = reviewOneManual(node, index, findings);
    nodes.push({ ...reviewed, depth, from });
    if (depth > 2) {
      addFinding(findings, "warning", "MANUAL_LINK_DEPTH", localName, node.filePath, `Linked Manual depth is ${depth}; consider Flow when the chain exceeds two levels.`);
    }
    for (const childRef of reviewed.manual_refs) {
      const child = resolveManualRef(childRef, index);
      if (!child) {
        addFinding(findings, "critical", "MANUAL_NOT_FOUND", localName, node.filePath, `@manual:${childRef} is not in this agent's manual map.`);
        continue;
      }
      visit(child, depth + 1, localName);
    }
    active.delete(localName);
    visited.add(localName);
  }

  const entryNames = [...index.manuals.keys()].filter((name) => isEntry(index.manuals.get(name).manual)).sort();
  for (const name of entryNames) visit(name, 0, "agent");

  const unreachable = [...index.manuals.keys()].filter((name) => !visited.has(name)).sort();
  for (const name of unreachable) {
    addFinding(findings, "warning", "MANUAL_UNREACHABLE", name, index.manuals.get(name).filePath, "Manual has no trigger and no Manual links to it, so it can never start.");
  }

  const counts = { critical: 0, warning: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;

  return {
    schema: "vox.ai.manual-tree-review.v2",
    valid: counts.critical === 0,
    workspace: resolvedWorkspace,
    agent_file: resolvedAgentFile,
    source: inline ? "agent_data_manuals" : "local_project",
    summary: {
      entry_manual_count: entryNames.length,
      linked_manual_count: Math.max(0, visited.size - entryNames.length),
      total_manual_count: index.manuals.size,
      unreachable_manual_count: unreachable.length,
      max_depth: maxDepth,
      ...counts,
    },
    manuals: nodes,
    findings,
  };
}

function renderHuman(result) {
  const { summary } = result;
  const lines = [
    `Manual tree: ${result.valid ? "PASS" : "FAIL"}`,
    `entry=${summary.entry_manual_count} linked=${summary.linked_manual_count} total=${summary.total_manual_count} unreachable=${summary.unreachable_manual_count} max_depth=${summary.max_depth}`,
    `critical=${summary.critical} warning=${summary.warning} info=${summary.info}`,
  ];
  for (const finding of result.findings) {
    lines.push(`[${finding.severity.toUpperCase()}] ${finding.code} ${finding.manual}: ${finding.message}${finding.evidence ? ` (${finding.evidence})` : ""}`);
  }
  return lines.join("\n");
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 64;
    return;
  }
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.agent && !args.agentFile) {
    console.error("Either --agent or --agent-file is required.");
    console.error(usage());
    process.exitCode = 64;
    return;
  }

  try {
    const result = reviewManualTree(args);
    console.log(args.json ? JSON.stringify(result, null, 2) : renderHuman(result));
    if (result.summary.critical > 0) process.exitCode = 1;
    else if (args.strict && result.summary.warning > 0) process.exitCode = 2;
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
