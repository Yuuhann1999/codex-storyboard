import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectPacing } from "../public/pacing.js";
test("pacing handles empty projects and warns only on long runs", () => {
  assert.deepEqual(inspectPacing([]), []);
  const shot = { rollType: "B-ROLL", duration: 5, dialogue: "" };
  assert.equal(inspectPacing([shot, shot]).length, 0);
  assert.equal(inspectPacing([shot, shot, shot]).length, 1);
  assert.equal(inspectPacing([{ ...shot, duration: 0 }]).length, 1);
});
