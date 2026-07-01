import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationPrompt,
  getAllowedDurations,
  getModelCapabilities,
  listVideoModels,
  normalizeGenerationSettings,
  resolveShotModel
} from "../lib/video-models.mjs";

test("Hailuo 2.3 exposes only supported durations and reference modes", () => {
  const capabilities = getModelCapabilities("minimax", "MiniMax-Hailuo-2.3");
  assert.deepEqual(capabilities.durations, [6, 10]);
  assert.deepEqual(capabilities.modes, ["text", "first-frame"]);
});

test("model catalog is discoverable and unknown models have no capabilities", () => {
  assert.equal(listVideoModels()[0].model, "MiniMax-Hailuo-2.3");
  assert.equal(getModelCapabilities("unknown", "unknown"), null);
  assert.deepEqual(getAllowedDurations("unknown", "unknown", "768P"), []);
});

test("unknown project models safely fall back to the registered default", () => {
  const settings = normalizeGenerationSettings({ provider: "unknown", model: "future" });
  assert.equal(settings.provider, "minimax");
  assert.equal(settings.model, "MiniMax-Hailuo-2.3");
});

test("project settings normalize an invalid Hailuo duration to six seconds", () => {
  const settings = normalizeGenerationSettings({
    provider: "minimax",
    model: "MiniMax-Hailuo-2.3",
    duration: 7
  });
  assert.equal(settings.duration, 6);
});

test("Hailuo 2.3 rejects ten seconds at 1080P", () => {
  const settings = normalizeGenerationSettings({
    provider: "minimax",
    model: "MiniMax-Hailuo-2.3",
    duration: 10,
    resolution: "1080P"
  });
  assert.equal(settings.duration, 6);
  assert.equal(settings.resolution, "1080P");
});

test("a shot inherits the project model and rejects unregistered overrides", () => {
  const project = { generation: { provider: "minimax", model: "MiniMax-Hailuo-2.3" } };
  assert.deepEqual(resolveShotModel(project, {}), {
    provider: "minimax",
    model: "MiniMax-Hailuo-2.3"
  });
  assert.deepEqual(resolveShotModel(project, { provider: "future", model: "future-video" }), {
    provider: "minimax",
    model: "MiniMax-Hailuo-2.3"
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
