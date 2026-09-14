import { test } from "node:test";
import assert from "node:assert/strict";
import { expireTasks, GENERATION_TIMEOUT_MS } from "../task-state.mjs";
test("expired tasks recover; fresh heartbeats and pending tasks survive", () => {
  const now = Date.now();
  const old = new Date(now - GENERATION_TIMEOUT_MS - 1).toISOString();
  const project = { shots: [
    { generationStatus: "processing", generationStartedAt: old },
    { generationStatus: "processing", generationStartedAt: old, generationHeartbeatAt: new Date(now).toISOString() },
    { generationStatus: "pending", generationRequestedAt: old }
  ] };
  assert.equal(expireTasks(project, now), true);
  assert.deepEqual(project.shots.map(s => s.generationStatus), ["failed", "processing", "pending"]);
});
