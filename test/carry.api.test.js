import process from "node:process";
import { commonRules, formatString, resetCarry } from "../src/core.js";

let fail = 0;
const check = (ok, message) => {
  if (ok) return;
  fail++;
  console.log(`x ${message}`);
};

const oversize = { stack: [{ depth: 0, char: '"', lang: "en" }], prev: { type: "word", value: "x" } };
formatString("a".repeat(2_000_001), commonRules, "en", oversize);
check(oversize.stack === undefined && oversize.prev === undefined, "oversize input must reset the carry");

const blank = { stack: [], prev: { type: "word", value: "x" } };
formatString("", commonRules, "en", blank);
check(blank.prev?.value === "x", "empty text must leave the carry untouched");

resetCarry(blank);
check(blank.stack === undefined && blank.prev === undefined, "resetCarry must clear the carry");

if (fail > 0) process.exitCode = 1;
