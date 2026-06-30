import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationPrompt,
  getModelCapabilities,
  normalizeGenerationSettings,
  resolveShotModel
} from "../lib/video-models.mjs";

test("Hailuo 2.3 exposes only supported durations and reference modes", () => {
  const capabilities = getModelCapabilities("minimax", "MiniMax-Hailuo-2.3");
  assert.deepEqual(capabilities.durations, [6, 10]);
  assert.deepEqual(capabilities.modes, ["text", "first-frame"]);
});

test("project settings normalize an invalid Hailuo duration to six seconds", () => {
  const settings = normalizeGenerationSettings({
    provider: "minimax",
    model: "MiniMax-Hailuo-2.3",
    duration: 7
  });
  assert.equal(settings.duration, 6);
});

test("a shot inherits the project provider and model unless it overrides them", () => {
  const project = { generation: { provider: "minimax", model: "MiniMax-Hailuo-2.3" } };
  assert.deepEqual(resolveShotModel(project, {}), {
    provider: "minimax",
    model: "MiniMax-Hailuo-2.3"
  });
  assert.deepEqual(resolveShotModel(project, { provider: "future", model: "future-video" }), {
    provider: "future",
    model: "future-video"
  });
});

test("prompt composition preserves project style and character identity", () => {
  const prompt = buildGenerationPrompt({
    stylePrompt: "暖色电影质感",
    characterPrompt: "主角阿木，黑色短发，蓝色夹克",
    shotPrompt: "阿木穿过雨夜街道 [跟随]"
  });
  assert.match(prompt, /暖色电影质感/);
  assert.match(prompt, /黑色短发，蓝色夹克/);
  assert.match(prompt, /阿木穿过雨夜街道 \[跟随\]/);
});
