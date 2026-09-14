import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRecognition } from "../recognition.mjs";
test("recognition alignment follows spoken timing, not character proportions", () => {
  const shots = [{ id: "a", dialogue: "你好，世界。" }, { id: "b", dialogue: "再见。" }];
  const result = matchRecognition(shots, [{ text: "你好世界", start: 500, end: 1800 }, { text: "再见", start: 4000, end: 5000 }], 5500);
  assert.equal(result[0].end, 4000); assert.equal(result[1].start, 4000);
  assert.equal(result[1].end, 5500); assert.equal(result[0].confidence, 1);
});
test("mismatching recognition is rejected instead of guessed", () => {
  assert.throws(() => matchRecognition([{ id: "a", dialogue: "你好世界" }], [{ text: "天气不错", start: 0, end: 1000 }], 1000));
});
