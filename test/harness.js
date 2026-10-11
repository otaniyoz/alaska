import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { commonRules, formatString, mathRules } from "../src/core.js";

const root = new URL("./", import.meta.url);
const ruleNames = new Set(Object.keys(commonRules));
const bases = new Set(["all", "none", "math"]);
const caseKeys = new Set(["desc", "input", "segments", "expected", "lang", "langs", "rules"]);
const rowKeys = new Set(["rule", "input", "expected", "off", "negationBase", "langDependent"]);
const matrixLangs = ["en", "ru", "ja", "ko", undefined];

const show = (v) => JSON.stringify(v);
const showAscii = (v) => show(v).replace(/[^\x20-\x7E]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));
const isStr = (v) => typeof v === "string";

export function buildRules({ base = "all", ...overrides } = {}) {
  const baseRules = base === "none" ? Object.fromEntries(Object.keys(commonRules).map((k) => [k, false])) : base === "math" ? { ...commonRules, ...mathRules } : { ...commonRules };
  return { ...baseRules, ...overrides };
}

export function runCase({ input, segments, lang, langs, rules }) {
  const caseRules = buildRules(rules);
  if (!segments) return formatString(input, caseRules, lang);
  const carry = {};
  return segments.map((s, i) => formatString(s, caseRules, langs?.[i] ?? lang, carry));
}

const asPass = (c, output) => segments(c) ? { ...c, segments: output } : { ...c, input: output };
const segments = (c) => c.segments !== undefined;

export function loadFixtures() {
  const problems = [];
  const read = (url, label) => {
    const text = readFileSync(url, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, n) => {
      for (const ch of line) {
        if (/[^\p{ASCII}\p{L}\p{M}]/u.test(ch)) problems.push(`${label}:${n + 1}: raw U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} (write it as \\uXXXX)`);
      }
    });
    try {
      return JSON.parse(text);
    } catch (e) {
      problems.push(`${label}: ${e.message}`);
      return null;
    }
  };
  const groups = [];
  const dir = fileURLToPath(new URL("cases/", root));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const data = read(new URL(`cases/${file}`, root), `cases/${file}`);
    for (const g of data?.groups ?? []) groups.push({ ...g, file: `cases/${file}` });
  }
  const table = read(new URL("rule-table.json", root), "rule-table.json");
  return { groups, table, problems };
}

export function validate({ groups, table }) {
  const problems = [];
  const names = new Set();
  const seen = new Map();
  for (const g of groups) {
    const at = `[${g.file}] ${g.name}`;
    if (!isStr(g.name) || !g.name) problems.push(`${g.file}: group without a name`);
    if (names.has(g.name)) problems.push(`${at}: duplicate group name`);
    names.add(g.name);
    if (!isStr(g.description) || !g.description) problems.push(`${at}: missing description`);
    if (!Array.isArray(g.cases) || !g.cases.length) problems.push(`${at}: no cases`);
    const descs = new Set();
    for (const c of g.cases ?? []) {
      const where = `${at} / ${c.desc}`;
      for (const k of Object.keys(c)) if (!caseKeys.has(k)) problems.push(`${where}: unknown key ${k}`);
      if (!isStr(c.desc) || !c.desc) problems.push(`${at}: case without desc`);
      if (descs.has(c.desc)) problems.push(`${where}: duplicate desc in group`);
      descs.add(c.desc);
      if ((c.input === undefined) === (c.segments === undefined)) problems.push(`${where}: needs exactly one of input and segments`);
      if (c.expected === undefined) problems.push(`${where}: missing expected`);
      else if (segments(c) ? !Array.isArray(c.expected) || c.expected.length !== c.segments?.length : !isStr(c.expected)) problems.push(`${where}: expected has the wrong shape`);
      if (c.langs !== undefined && !segments(c)) problems.push(`${where}: langs without segments`);
      if (c.lang !== undefined && !isStr(c.lang)) problems.push(`${where}: lang must be a string`);
      const { base, ...overrides } = c.rules ?? {};
      if (base !== undefined && !bases.has(base)) problems.push(`${where}: unknown base ${show(base)}`);
      for (const [k, v] of Object.entries(overrides)) {
        if (!ruleNames.has(k)) problems.push(`${where}: unknown rule ${k}`);
        else if (typeof v !== "boolean") problems.push(`${where}: rule ${k} must be a boolean`);
      }
      const key = show([c.input, c.segments, c.lang, c.langs, base ?? "all", Object.keys(overrides).sort().map((k) => [k, overrides[k]])]);
      if (seen.has(key)) problems.push(`${where}: duplicates ${seen.get(key)}`);
      else seen.set(key, where);
    }
  }
  const rows = table?.rows ?? [];
  const covered = new Set();
  for (const r of rows) {
    const where = `[rule-table] ${r.rule} ${show(r.input)}`;
    for (const k of Object.keys(r)) if (!rowKeys.has(k)) problems.push(`${where}: unknown key ${k}`);
    if (!ruleNames.has(r.rule)) problems.push(`${where}: unknown rule`);
    if (!isStr(r.input) || !isStr(r.expected)) problems.push(`${where}: input and expected must be strings`);
    if (r.negationBase !== undefined && !bases.has(r.negationBase)) problems.push(`${where}: unknown negationBase`);
    covered.add(r.rule);
  }
  for (const k of ruleNames) if (!covered.has(k)) problems.push(`[rule-table] no row for ${k}`);
  return problems;
}

export function checkGroups(groups) {
  const failures = [];
  for (const g of groups) {
    for (const c of g.cases) {
      const output = runCase(c);
      const again = runCase(asPass(c, output));
      const same = show(output) === show(c.expected);
      if (same && show(again) === show(output)) continue;
      failures.push({ title: `[${g.name}] ${c.desc}${same ? " (not idempotent)" : ""}`, input: c.segments ?? c.input, expected: c.expected, actual: same ? again : output });
    }
  }
  return failures;
}

export function checkTable(table) {
  const failures = [];
  const expect = (title, input, expected, actual) => {
    if (show(actual) !== show(expected)) failures.push({ title, input, expected, actual });
  };
  for (const r of table.rows) {
    const only = { base: "none", [r.rule]: true };
    const without = { base: r.negationBase ?? "all", [r.rule]: false };
    const t = `[rule-table] ${r.rule}`;
    const on = runCase({ input: r.input, lang: "en", rules: only });
    expect(`${t} isolation: ${r.input}`, r.input, r.expected, on);
    expect(`${t} isolation (not idempotent): ${r.input}`, on, on, runCase({ input: on, lang: "en", rules: only }));
    const off = r.off ?? r.input;
    if (off === r.expected) failures.push({ title: `${t} negation: off equals expected, the row proves nothing`, input: r.input, expected: "off differing from expected", actual: off });
    expect(`${t} negation: ${r.input}`, r.input, off, runCase({ input: r.input, lang: "en", rules: without }));
    if (r.langDependent) continue;
    for (const lang of matrixLangs) expect(`${t} matrix lang=${show(lang)}: ${r.input}`, r.input, r.expected, runCase({ input: r.input, lang, rules: only }));
  }
  return failures;
}

export function format(failure) {
  return `x ${failure.title}\n  input    ${showAscii(failure.input)}\n  expected ${showAscii(failure.expected)}\n  actual   ${showAscii(failure.actual)}`;
}
