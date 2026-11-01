import process from "node:process";
import { commonRules, mathRules, resolveRules } from "../src/core.js";

let fail = 0;
const check = (ok, message) => {
  if (ok) return;
  fail++;
  console.log(`x ${message}`);
};
const mathOnly = ["placeEmdash", "placeNumericRange", "placeHyphen", "placeNbsp"];

check(resolveRules(commonRules, {}) === commonRules, "no data returns the inherited rules");
check(resolveRules(commonRules, { foo: "true", math: "yes", "": "true" }) === commonRules, "non-rule keys and an invalid math value return the inherited rules");
check(resolveRules(commonRules, { constructor: "x", toString: "x", valueOf: "x" }) === commonRules, "prototype property names are not rules");
check(resolveRules(commonRules, Object.fromEntries([["__proto__", "x"]])) === commonRules, "an own __proto__ key is not a rule");
check(resolveRules(commonRules, Object.create(null)) === commonRules, "a null-prototype empty object returns the inherited rules");

const zone = resolveRules(commonRules, { math: "true" });
check(zone.placeArithmeticalSymbols === true && mathOnly.every((k) => zone[k] === false), "math true applies the overlay");
const back = resolveRules(zone, { math: "false" });
check(Object.keys(commonRules).every((k) => back[k] === commonRules[k]), "math false restores the common values");
check(Object.keys(mathRules).every((k) => back[k] === commonRules[k]), "math false covers every mathRules key");

check(resolveRules(commonRules, { math: "true", placeEmdash: "true" }).placeEmdash === true, "an explicit rule wins over the overlay");
check(resolveRules(commonRules, { math: "true", placeArithmeticalSymbols: "false" }).placeArithmeticalSymbols === false, "an explicit false wins over the overlay");

const values = resolveRules(commonRules, { placeEmdash: "false", placeNbsp: "true", placeHyphen: "0", placeArrows: "" });
check(values.placeEmdash === false && values.placeNbsp === true, "true and false are booleans");
check(values.placeHyphen === "0" && values.placeArrows === "", "other values pass through as written");
check(values.placeShapes === commonRules.placeShapes, "unlisted rules keep the inherited value");

const inherited = { ...commonRules, placeNbsp: false };
const snapshot = JSON.stringify(inherited);
const next = resolveRules(inherited, { placeNbsp: "true", math: "true" });
check(JSON.stringify(inherited) === snapshot && next !== inherited && next.placeNbsp === true && next.placeEmdash === false, "the inherited object is not mutated and the overlay replaces an inherited value");

if (fail > 0) process.exitCode = 1;
