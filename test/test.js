import process from "node:process";
import { checkGroups, checkTable, format, loadFixtures, validate } from "./harness.js";

const fixtures = loadFixtures();
const problems = [...fixtures.problems, ...validate(fixtures)];
for (const p of problems) console.log(`x ${p}`);
if (problems.length) {
  process.exitCode = 1;
} else {
  const failures = [...checkGroups(fixtures.groups), ...checkTable(fixtures.table)];
  for (const f of failures) console.log(format(f));
  if (failures.length) process.exitCode = 1;
}
