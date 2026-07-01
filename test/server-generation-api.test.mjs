import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("test server did not start");
}

test("queues an inheriting MiniMax task with effective project context", async (context) => {
  const dataDir = await mkdtemp(join(tmpdir(), "codex-storyboard-test-"));
  const port = 44000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.mjs", "--port", String(port), "--data-dir", dataDir], {
    cwd: new URL("..", import.meta.url),
    stdio: "ignore"
  });
  context.after(async () => {
    child.kill();
    await rm(dataDir, { recursive: true, force: true });
  });
  await waitForHealth(baseUrl);

  const createdResponse = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "MiniMax test",
      aspectRatio: "16:9",
      generation: {
        provider: "minimax",
        model: "MiniMax-Hailuo-2.3",
        resolution: "768P",
        duration: 6
      },
      stylePrompt: "暖色电影质感",
      characterPrompt: "阿木，黑色短发，蓝色夹克"
    })
  });
  const created = await createdResponse.json();

  const updatedResponse = await fetch(`${baseUrl}/api/projects/${created.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...created,
      shots: [{
        mediaType: "video",
        generator: "api-video",
        duration: 7,
        visualPrompt: "阿木走过雨夜街道"
      }]
    })
  });
  const updated = await updatedResponse.json();
  assert.equal(updated.shots[0].duration, 6);

  const queuedResponse = await fetch(`${baseUrl}/api/generation/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: created.id, shotIds: [updated.shots[0].id] })
  });
  const queued = await queuedResponse.json();
  assert.equal(queued.queued[0].provider, "minimax");
  assert.equal(queued.queued[0].model, "MiniMax-Hailuo-2.3");
  assert.match(queued.queued[0].effectivePrompt, /暖色电影质感/);
  assert.match(queued.queued[0].effectivePrompt, /黑色短发/);
  assert.match(queued.queued[0].effectivePrompt, /雨夜街道/);
});
